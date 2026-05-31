const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const RevenueService = require("../services/revenue.service");
const logger = require("../lib/logger");

const AUTO_APPROVAL_THRESHOLD = 5000;
const SUPERVISOR_APPROVAL_THRESHOLD = 20000;

const loanApplicationSchema = z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
    interestRate: z.number().positive(),
    termMonths: z.number().positive(),
    purpose: z.string().optional()
});

const loanRepaymentSchema = z.object({
    loanId: z.string().uuid(),
    amount: z.number().positive(),
    paymentReference: z.string().min(8)
});

const loanApprovalSchema = z.object({
    loanId: z.string().uuid(),
    action: z.enum(["APPROVE", "REJECT"]),
    notes: z.string().optional()
});

class LoanController {
    static async createLoan(req, res) {
        try {
            const parsed = loanApplicationSchema.parse(req.body);
            const { userId, amount, interestRate, termMonths, purpose } = parsed;

            const loanId = uuidv4();
            const reference = `LOAN-${loanId.substring(0, 8)}-${Date.now()}`;

            // Multi-level approval workflow
            let status;
            let approvalLevel = 'PENDING';
            
            if (amount < AUTO_APPROVAL_THRESHOLD) {
                // Auto-approve for small amounts
                status = 'APPROVED';
                approvalLevel = 'AUTO';
            } else if (amount < SUPERVISOR_APPROVAL_THRESHOLD) {
                // Supervisor review required
                status = 'UNDER_REVIEW';
                approvalLevel = 'SUPERVISOR';
            } else {
                // Manager + Supervisor dual approval required
                status = 'UNDER_REVIEW';
                approvalLevel = 'SUPERVISOR';
            }

            const { data: loan, error } = await supabase.from('loans').insert({
                id: loanId,
                user_id: userId,
                amount,
                interest_rate: interestRate,
                term_months: termMonths,
                purpose,
                status: status,
                approval_level: approvalLevel,
                reference,
                created_at: new Date()
            }).select().single();

            if (error) throw error;

            // Auto-disburse if approved
            if (status === 'APPROVED') {
                const { data: wallet } = await supabase
                    .from('wallets')
                    .select('id')
                    .eq('user_id', userId)
                    .single();

                if (wallet) {
                    await supabase.rpc('credit_wallet', {
                        p_wallet_id: wallet.id,
                        p_amount: amount,
                        p_reference: reference
                    });
                }
            }

            res.status(201).json({ 
                success: true, 
                data: loan,
                message: status === 'APPROVED' 
                    ? "Loan approved and disbursed successfully"
                    : `Loan submitted for ${approvalLevel === 'SUPERVISOR' ? 'supervisor' : 'manager'} review`
            });

        } catch (error) {
            logger.error("Loan creation error:", error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async approveLoan(req, res) {
        try {
            const parsed = loanApprovalSchema.parse(req.body);
            const { loanId, action, notes } = parsed;
            
            const { data: loan, error: loanError } = await supabase
                .from('loans')
                .select('*, users(full_name)')
                .eq('id', loanId)
                .single();
                
            if (loanError || !loan) {
                return res.status(404).json({ success: false, message: "Loan not found" });
            }

            if (loan.status !== 'UNDER_REVIEW') {
                return res.status(400).json({ 
                    success: false, 
                    message: `Loan is not pending review. Current status: ${loan.status}` 
                });
            }

            if (action === 'REJECT') {
                await supabase.from('loans').update({
                    status: 'REJECTED',
                    rejection_notes: notes || null,
                    reviewed_at: new Date()
                }).eq('id', loanId);
                
                return res.json({ success: true, message: "Loan rejected" });
            }

            // Approval logic based on amount and current level
            let newStatus = 'APPROVED';
            let newApprovalLevel = loan.approval_level;
            
            if (loan.amount >= SUPERVISOR_APPROVAL_THRESHOLD && loan.approval_level === 'SUPERVISOR') {
                // Needs manager approval for large loans
                newStatus = 'UNDER_REVIEW';
                newApprovalLevel = 'MANAGER';
            }

            await supabase.from('loans').update({
                status: newStatus,
                approval_level: newApprovalLevel,
                approved_by: req.adminUser?.id || null,
                approval_notes: notes || null,
                reviewed_at: new Date()
            }).eq('id', loanId);

            // Disburse if finally approved
            if (newStatus === 'APPROVED') {
                const { data: wallet } = await supabase
                    .from('wallets')
                    .select('id')
                    .eq('user_id', loan.user_id)
                    .single();

                if (wallet) {
                    await supabase.rpc('credit_wallet', {
                        p_wallet_id: wallet.id,
                        p_amount: loan.amount,
                        p_reference: loan.reference
                    });
                }
            }

            res.json({ 
                success: true, 
                message: newStatus === 'APPROVED' 
                    ? "Loan approved and disbursed"
                    : "Sent to manager for final approval"
            });

        } catch (error) {
            logger.error("Loan approval error:", error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async processRepayment(req, res) {
        try {
            const parsed = loanRepaymentSchema.parse(req.body);
            const { loanId, amount, paymentReference } = parsed;

            // Get loan details
            const { data: loan, error: loanError } = await supabase
                .from('loans')
                .select('*')
                .eq('id', loanId)
                .single();

            if (loanError || !loan) {
                return res.status(404).json({ success: false, message: "Loan not found" });
            }

            // Calculate interest portion (simplified - in real app, would use amortization schedule)
            const monthlyInterestRate = loan.interest_rate / 100 / 12;
            const interestAmount = PaymentService.roundMoney(loan.amount * monthlyInterestRate);
            const principalAmount = PaymentService.roundMoney(amount - interestAmount);

            // Create repayment record
            await supabase.from('loan_repayments').insert({
                loan_id: loanId,
                amount,
                principal_amount: principalAmount,
                interest_amount: interestAmount,
                payment_reference: paymentReference,
                status: 'COMPLETED',
                created_at: new Date()
            });

            // Post interest revenue
            if (interestAmount > 0) {
                await RevenueService.postLoanInterestRevenue({
                    loanId,
                    userId: loan.user_id,
                    amount: interestAmount,
                    reference: `LOAN-INT-${loanId}-${paymentReference}`,
                    interestRate: loan.interest_rate,
                    loanTerm: loan.term_months
                });
            }

            res.status(200).json({ 
                success: true, 
                message: "Loan repayment processed successfully",
                interestAmount,
                principalAmount
            });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getLoans(req, res) {
        try {
            const status = req.query.status;
            const approvalLevel = req.query.approvalLevel;
            let query = supabase.from('loans').select('*, users!inner(id, full_name, email, phone_number)');

            if (status) {
                query = query.eq('status', status);
            }
            if (approvalLevel) {
                query = query.eq('approval_level', approvalLevel);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getLoan(req, res) {
        try {
            const { loanId } = req.params;
            
            const { data: loan, error } = await supabase
                .from('loans')
                .select('*, users!inner(id, full_name, email, phone_number)')
                .eq('id', loanId)
                .single();

            if (error || !loan) {
                return res.status(404).json({ success: false, message: "Loan not found" });
            }

            res.json({ success: true, data: loan });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async disburseLoan(req, res) {
        try {
            const { loanId } = req.params;
            
            const { data: loan, error: loanError } = await supabase
                .from('loans')
                .select('*')
                .eq('id', loanId)
                .single();

            if (loanError || !loan) {
                return res.status(404).json({ success: false, message: "Loan not found" });
            }

            if (loan.status !== 'APPROVED') {
                return res.status(400).json({ 
                    success: false, 
                    message: `Loan must be APPROVED before disbursement. Current status: ${loan.status}` 
                });
            }

            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', loan.user_id)
                .single();

            if (wallet) {
                await supabase.rpc('credit_wallet', {
                    p_wallet_id: wallet.id,
                    p_amount: loan.amount,
                    p_reference: loan.reference
                });
            }

            await supabase.from('loans').update({
                disbursed_at: new Date(),
                status: 'DISBURSED'
            }).eq('id', loanId);

            res.json({ success: true, message: "Loan disbursed successfully" });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = LoanController;
