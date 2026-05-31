const supabase = require('../lib/supabase');
const logger = require('../lib/logger');

const GHS_10000 = 10000;
const GHS_50000 = 50000;
const GHS_100000 = 100000;
const LIQUIDITY_RATIO = 0.80;

class ComplianceService {
  static asMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  static parseAmount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  static isMissingRelationError(error) {
    return String(error?.code || '') === '42P01';
  }

  static async checkCTRThreshold(amount) {
    return this.parseAmount(amount) >= GHS_10000;
  }

  static async generateCTRReport(txRefs = []) {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          id, reference, amount, type, status, created_at,
          wallets (
            user_id,
            users ( full_name, phone_number, id_type, id_number, kyc_status )
          )
        `)
        .eq('status', 'SUCCESS')
        .gte('amount', GHS_10000)
        .order('created_at', { ascending: false });

      if (txRefs.length > 0) {
        query = query.in('reference', txRefs);
      }

      const { data, error } = await query;
      if (error) throw error;

      const report = {
        generated_at: new Date().toISOString(),
        report_type: 'CTR',
        threshold_ghs: GHS_10000,
        total_transactions: 0,
        total_amount_ghs: 0,
        transactions: []
      };

      if (Array.isArray(data)) {
        report.total_transactions = data.length;
        report.transactions = data.map((tx) => {
          const user = tx.wallets?.users;
          const userData = Array.isArray(user) ? user[0] : user;
          return {
            transaction_ref: tx.reference,
            amount: this.asMoney(tx.amount),
            type: tx.type,
            date: tx.created_at,
            customer: {
              name: userData?.full_name || 'Unknown',
              phone: userData?.phone_number || 'N/A',
              id_type: userData?.id_type || 'N/A',
              id_number: userData?.id_number || 'N/A'
            }
          };
        });
        report.total_amount_ghs = data.reduce((sum, tx) => sum + this.parseAmount(tx.amount), 0);
      }

      return report;
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return { generated_at: new Date().toISOString(), report_type: 'CTR', error: 'Table not found' };
      }
      throw error;
    }
  }

  static async checkTransactionCTR(txReference, amount) {
    const requiresCTR = await this.checkCTRThreshold(amount);
    if (!requiresCTR) return { requires_ctr: false };

    const { error } = await supabase
      .from('compliance_flags')
      .insert({
        flag_type: 'CTR_REPORT',
        severity: 'HIGH',
        reference: txReference,
        amount: this.parseAmount(amount),
        status: 'PENDING',
        description: `Cash Transaction Report required for transaction exceeding GHS ${GHS_10000.toLocaleString()}`
      });

    if (error && !this.isMissingRelationError(error)) {
      logger.error('Failed to create CTR flag:', error.message);
    }

    return { requires_ctr: true, flag_created: !error };
  }

  static async calculateLiquidityRatio() {
    try {
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('status', 'ACTIVE');

      if (walletsError) throw walletsError;

      const { data: payouts, error: payoutsError } = await supabase
        .from('susu_payouts')
        .select('amount, status')
        .eq('status', 'PENDING');

      if (payoutsError && !this.isMissingRelationError(payoutsError)) throw payoutsError;

      const totalClientBalance = (wallets || []).reduce((sum, w) => sum + this.parseAmount(w.balance), 0);
      const pendingPayouts = (payouts || []).reduce((sum, p) => sum + this.parseAmount(p.amount), 0);
      const availableCash = totalClientBalance - pendingPayouts;
      const liquidAssets = availableCash * LIQUIDITY_RATIO;
      const illiquidAssets = availableCash - liquidAssets;

      const ratio = totalClientBalance > 0 ? availableCash / totalClientBalance : 1;

      return {
        total_client_balance: this.asMoney(totalClientBalance),
        pending_payouts: this.asMoney(pendingPayouts),
        available_cash: this.asMoney(availableCash),
        liquid_assets: this.asMoney(liquidAssets),
        illiquid_assets: this.asMoney(illiquidAssets),
        liquidity_ratio: (ratio * 100).toFixed(2) + '%',
        meets_requirement: ratio >= LIQUIDITY_RATIO,
        required_ratio: (LIQUIDITY_RATIO * 100) + '%',
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        calculated_at: new Date().toISOString()
      };
    }
  }

  static async checkLiquidityCompliance() {
    const ratio = await this.calculateLiquidityRatio();
    if (ratio.error) return ratio;

    if (!ratio.meets_requirement) {
      await supabase
        .from('compliance_flags')
        .insert({
          flag_type: 'LIQUIDITY_ALERT',
          severity: 'HIGH',
          status: 'OPEN',
          description: `Liquidity ratio ${ratio.liquidity_ratio} below required ${ratio.required_ratio}. Liquid assets: GHS ${ratio.liquid_assets}`,
          metadata: {
            current_ratio: ratio.liquidity_ratio,
            required_ratio: ratio.required_ratio,
            shortfall: (LIQUIDITY_RATIO - (parseFloat(ratio.liquidity_ratio) / 100)).toFixed(4)
          }
        });
    }

    return ratio;
  }

  static async getComplianceAlerts(status = 'OPEN') {
    try {
      let query = supabase
        .from('compliance_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      if (this.isMissingRelationError(error)) return [];
      throw error;
    }
  }

  static async resolveAlert(alertId, resolution = 'RESOLVED') {
    try {
      const { error } = await supabase
        .from('compliance_flags')
        .update({
          status: resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSuspiciousTransactions(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, reference, amount, type, status, created_at, metadata,
          wallets (
            user_id,
            users ( full_name, phone_number, risk_rating, kyc_status )
          )
        `)
        .eq('status', 'SUCCESS')
        .order('amount', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const suspicious = (data || [])
        .filter((tx) => {
          const amount = this.parseAmount(tx.amount);
          if (amount >= GHS_50000) return true;
          const meta = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
          if (meta.suspicious || meta.flagged) return true;
          const user = tx.wallets?.users;
          const userData = Array.isArray(user) ? user[0] : user;
          if (userData?.risk_rating === 'HIGH') return true;
          return false;
        })
        .map((tx) => {
          const user = tx.wallets?.users;
          const userData = Array.isArray(user) ? user[0] : user;
          return {
            id: tx.id,
            reference: tx.reference,
            amount: this.asMoney(tx.amount),
            type: tx.type,
            date: tx.created_at,
            customer: userData?.full_name || 'Unknown',
            phone: userData?.phone_number || 'N/A',
            risk_rating: userData?.risk_rating || 'UNKNOWN',
            kyc_status: userData?.kyc_status || 'UNKNOWN'
          };
        });

      return suspicious;
    } catch (error) {
      return [];
    }
  }

  static async generateSuspiciousActivityReport() {
    const suspicious = await this.getSuspiciousTransactions(100);
    return {
      generated_at: new Date().toISOString(),
      report_type: 'SUSPICIOUS_ACTIVITY',
      total_suspicious_transactions: suspicious.length,
      total_amount: suspicious.reduce((sum, tx) => sum + this.parseAmount(tx.amount), 0),
      transactions: suspicious,
      risk_breakdown: {
        high_value: suspicious.filter((tx) => this.parseAmount(tx.amount) >= GHS_50000).length,
        high_risk_customer: suspicious.filter((tx) => tx.risk_rating === 'HIGH').length
      }
    };
  }
}

module.exports = ComplianceService;