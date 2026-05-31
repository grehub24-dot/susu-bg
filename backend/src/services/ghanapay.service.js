const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const WigalService = require("./wigal.service");
const logger = require("../lib/logger");

class GhanaPayService {
  static async createVerificationRequest(data) {
    const { walletId, amount, reference, customerPhone, ghanaPayNumber } = data;
    const requestId = uuidv4();

    const { data: request, error } = await supabase
      .from('ghanapay_verifications')
      .insert({
        id: requestId,
        wallet_id: walletId,
        reference,
        amount,
        customer_phone: customerPhone,
        ghanapay_number: ghanaPayNumber,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;
    return request;
  }

  static async getPendingVerifications(tellerId) {
    const { data, error } = await supabase
      .from('ghanapay_verifications')
      .select('*, wallets(user_id, users(full_name, phone_number))')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  static async verifyTransaction(data) {
    const { requestId, tellerId, verified, notes } = data;

    const { data: request, error: fetchError } = await supabase
      .from('ghanapay_verifications')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Verification request not found');
    }

    const newStatus = verified ? 'VERIFIED' : 'REJECTED';
    const { error: updateError } = await supabase
      .from('ghanapay_verifications')
      .update({
        status: newStatus,
        verified_by: tellerId,
        verified_at: new Date().toISOString(),
        notes
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    if (verified) {
      await this.processSuccessfulDeposit(request);
    }

    return { success: true, status: newStatus };
  }

  static async processSuccessfulDeposit(request) {
    const { wallet_id: walletId, amount, reference, customer_phone: customerPhone } = request;

    const { error: txnError } = await supabase
      .from('transactions')
      .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
      .eq('reference', reference)
      .eq('status', 'PENDING');

    if (!txnError) {
      const { error: walletError } = await supabase.rpc('credit_wallet', {
        p_wallet_id: walletId,
        p_amount: amount
      });

      if (walletError) {
        logger.error('Wallet credit error:', walletError);
      }
    }

    if (customerPhone) {
      await WigalService.sendTransactionAlert(
        customerPhone,
        amount,
        'DEPOSIT',
        'GHANAPAY',
        reference
      );
    }

    return { success: true };
  }

  static async getVerificationHistory(tellerId, limit = 50) {
    const { data, error } = await supabase
      .from('ghanapay_verifications')
      .select('*')
      .eq('verified_by', tellerId)
      .order('verified_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

module.exports = GhanaPayService;