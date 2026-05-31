const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const RevenueService = require("../services/revenue.service");

const investmentSchema = z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
    investmentType: z.enum(['FIXED_DEPOSIT', 'SUSU_CONTRIBUTION', 'MUTUAL_FUND']),
    expectedReturn: z.number().positive(),
    termMonths: z.number().positive()
});

const investmentMaturitySchema = z.object({
    investmentId: z.string().uuid(),
    payoutReference: z.string().min(8)
});

class InvestmentController {
    static async createInvestment(req, res) {
        try {
            const parsed = investmentSchema.parse(req.body);
            const { userId, amount, investmentType, expectedReturn, termMonths } = parsed;

            const investmentId = uuidv4();
            const reference = `INV-${investmentId.substring(0, 8)}-${Date.now()}`;

            // Get user wallet and debit investment amount
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id, balance')
                .eq('user_id', userId)
                .single();

            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }

            if (wallet.balance < amount) {
                return res.status(400).json({ success: false, message: "Insufficient balance" });
            }

            // Debit wallet for investment
            const { error: debitError } = await supabase.rpc('debit_wallet', {
                p_wallet_id: wallet.id,
                p_amount: amount,
                p_reference: reference
            });

            if (debitError) throw debitError;

            // Create investment record
            const { data: investment, error } = await supabase.from('investments').insert({
                id: investmentId,
                user_id: userId,
                amount,
                investment_type: investmentType,
                expected_return: expectedReturn,
                term_months: termMonths,
                status: 'ACTIVE',
                reference,
                created_at: new Date()
            }).select().single();

            if (error) throw error;

            res.status(201).json({ 
                success: true, 
                data: investment,
                message: "Investment created successfully"
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async processMaturity(req, res) {
        try {
            const parsed = investmentMaturitySchema.parse(req.body);
            const { investmentId, payoutReference } = parsed;

            // Get investment details
            const { data: investment, error: investmentError } = await supabase
                .from('investments')
                .select('*')
                .eq('id', investmentId)
                .single();

            if (investmentError || !investment) {
                return res.status(404).json({ success: false, message: "Investment not found" });
            }

            if (investment.status !== 'ACTIVE') {
                return res.status(400).json({ success: false, message: "Investment already processed" });
            }

            // Calculate returns
            const returnAmount = investment.expected_return - investment.amount;
            const totalPayout = investment.amount + returnAmount;

            // Get user wallet and credit payout
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', investment.user_id)
                .single();

            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }

            // Credit wallet with total payout
            await supabase.rpc('credit_wallet', {
                p_wallet_id: wallet.id,
                p_amount: totalPayout,
                p_reference: payoutReference
            });

            // Update investment status
            await supabase.from('investments')
                .update({ 
                    status: 'MATURED', 
                    matured_at: new Date(),
                    payout_reference: payoutReference
                })
                .eq('id', investmentId);

            // Post investment return revenue
            if (returnAmount > 0) {
                await RevenueService.postInvestmentReturnRevenue({
                    investmentId,
                    userId: investment.user_id,
                    amount: returnAmount,
                    reference: `INV-RET-${investmentId}-${payoutReference}`,
                    returnRate: ((returnAmount / investment.amount) * 100).toFixed(2),
                    investmentType: investment.investment_type
                });
            }

            res.status(200).json({ 
                success: true, 
                message: "Investment maturity processed successfully",
                principalAmount: investment.amount,
                returnAmount,
                totalPayout
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getInvestments(req, res) {
        try {
            const userId = req.query.userId;
            let query = supabase.from('investments').select('*');

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = InvestmentController;
