const supabase = require('../lib/supabase');
const PaymentService = require('./payment.service');

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'GHS';

class RevenueService {
    static isMissingRelationError(error) {
        return String(error?.code || '') === '42P01';
    }

    static async postRevenue({
        sourceType,
        category,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        note,
        metadata = {}
    }) {
        if (!sourceType || !category || !amount || amount <= 0) {
            throw new Error('Missing required revenue fields: sourceType, category, amount');
        }

        // Check for existing entry to avoid duplicates
        const { data: existing, error: existingError } = await supabase
            .from('revenue_ledger')
            .select('id')
            .eq('reference', reference)
            .eq('category', category)
            .eq('source_type', sourceType)
            .maybeSingle();

        if (existingError) {
            if (this.isMissingRelationError(existingError)) return;
            throw new Error(`Failed to query revenue ledger: ${existingError.message}`);
        }

        if (existing) return;

        const payload = {
            source_type: sourceType,
            category,
            amount: PaymentService.roundMoney(amount),
            currency,
            reference,
            description: note || `${category} revenue`,
            metadata
        };

        const { error: insertError } = await supabase
            .from('revenue_ledger')
            .insert(payload);

        if (insertError && !this.isMissingRelationError(insertError)) {
            throw new Error(`Failed to insert revenue ledger entry: ${insertError.message}`);
        }
    }

    static async postLoanInterestRevenue({
        loanId,
        userId,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        interestRate,
        loanTerm,
        metadata = {}
    }) {
        return this.postRevenue({
            sourceType: 'LOAN',
            category: 'LOAN_INTEREST',
            amount,
            currency,
            reference: reference || `LOAN-INT-${loanId}-${Date.now()}`,
            note: `Loan interest revenue at ${interestRate}% for ${loanTerm} term`,
            metadata: {
                loan_id: loanId,
                user_id: userId,
                interest_rate: interestRate,
                loan_term: loanTerm,
                ...metadata
            }
        });
    }

    static async postInvestmentReturnRevenue({
        investmentId,
        userId,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        returnRate,
        investmentType,
        metadata = {}
    }) {
        return this.postRevenue({
            sourceType: 'INVESTMENT',
            category: 'INVESTMENT_RETURN',
            amount,
            currency,
            reference: reference || `INV-RET-${investmentId}-${Date.now()}`,
            note: `Investment return revenue at ${returnRate}% for ${investmentType}`,
            metadata: {
                investment_id: investmentId,
                user_id: userId,
                return_rate: returnRate,
                investment_type: investmentType,
                ...metadata
            }
        });
    }

    static async postCommissionRevenue({
        commissionId,
        userId,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        commissionType,
        commissionSource,
        metadata = {}
    }) {
        return this.postRevenue({
            sourceType: 'COMMISSION',
            category: 'COMMISSION',
            amount,
            currency,
            reference: reference || `COMM-${commissionId}-${Date.now()}`,
            note: `${commissionType} commission revenue from ${commissionSource}`,
            metadata: {
                commission_id: commissionId,
                user_id: userId,
                commission_type: commissionType,
                commission_source: commissionSource,
                ...metadata
            }
        });
    }

    static async postPenaltyRevenue({
        penaltyId,
        userId,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        penaltyType,
        penaltyReason,
        metadata = {}
    }) {
        return this.postRevenue({
            sourceType: 'PENALTY',
            category: 'PENALTY',
            amount,
            currency,
            reference: reference || `PENALTY-${penaltyId}-${Date.now()}`,
            note: `${penaltyType} penalty: ${penaltyReason}`,
            metadata: {
                penalty_id: penaltyId,
                user_id: userId,
                penalty_type: penaltyType,
                penalty_reason: penaltyReason,
                ...metadata
            }
        });
    }

    static async postMaintenanceRevenue({
        maintenanceId,
        userId,
        amount,
        currency = DEFAULT_CURRENCY,
        reference,
        maintenanceType,
        billingPeriod,
        metadata = {}
    }) {
        return this.postRevenue({
            sourceType: 'MAINTENANCE',
            category: 'ACCOUNT_MAINTENANCE',
            amount,
            currency,
            reference: reference || `MAINT-${maintenanceId}-${Date.now()}`,
            note: `${maintenanceType} maintenance fee for ${billingPeriod}`,
            metadata: {
                maintenance_id: maintenanceId,
                user_id: userId,
                maintenance_type: maintenanceType,
                billing_period: billingPeriod,
                ...metadata
            }
        });
    }

    static async postTransactionFeeRevenue(reference, fallback = {}) {
        return PaymentService.postTransactionFeeRevenue(reference, fallback);
    }
}

module.exports = RevenueService;
