const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const supabase = require("../lib/supabase");
const PaymentService = require("./payment.service");
const WigalService = require("./wigal.service");
const ReceiptService = require("./receipt.service");

const TELLER_SESSION_EXPIRY_HOURS = Number(process.env.TELLER_SESSION_EXPIRY_HOURS) || 8;

// Simple in-memory session store (in production, use Redis)
const sessionStore = new Map();

class TellerService {
    static async loginTeller(tellerCode, password) {
        const normalized = String(tellerCode || "").trim().toLowerCase();
        const isEmail = normalized.includes("@");
        const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);

        let staffQuery = supabase
            .from("staff_users")
            .select("id, staff_code, full_name, email, phone_number, password_hash, role, status")
            .eq("role", "TELLER")
            .eq("status", "ACTIVE");

        if (isEmail) staffQuery = staffQuery.eq("email", normalized);
        else if (isUuidLike) staffQuery = staffQuery.eq("id", normalized);
        else staffQuery = staffQuery.or(`staff_code.eq.${normalized},phone_number.eq.${normalized}`);

        const { data: staffUser, error: staffError } = await staffQuery.single();
        if (staffError || !staffUser) throw new Error("Invalid teller credentials");

        const isValidPassword = await bcrypt.compare(String(password || ""), String(staffUser.password_hash || ""));
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const { data: teller, error: tellerError } = await supabase
            .from('tellers')
            .select('*, branch_accounts(*)')
            .eq('status', 'ACTIVE')
            .or(`staff_user_id.eq.${staffUser.id},teller_code.eq.${String(staffUser.staff_code || "").trim()}`)
            .limit(1)
            .maybeSingle();

        if (tellerError) throw new Error(`Failed to find teller profile: ${tellerError.message}`);
        if (!teller) throw new Error('No teller profile mapped to this staff account');

        // Create session
        const sessionId = uuidv4();
        const session = {
            id: sessionId,
            staffUserId: staffUser.id,
            tellerId: teller.id,
            tellerCode: teller.teller_code,
            fullName: staffUser.full_name || teller.full_name,
            branchId: teller.branch_id,
            branchName: teller.branch_accounts?.branch_name || 'Unknown',
            dailyLimit: teller.daily_limit,
            currentCashPosition: teller.current_cash_position,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + TELLER_SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
        };

        sessionStore.set(sessionId, session);

        return {
            sessionId: sessionId,
            teller: {
                id: teller.id,
                staffUserId: staffUser.id,
                tellerCode: teller.teller_code,
                fullName: staffUser.full_name || teller.full_name,
                branchId: teller.branch_id,
                branchName: teller.branch_accounts?.branch_name
            },
            expiresAt: session.expiresAt
        };
    }

    static async logoutTeller(sessionId) {
        sessionStore.delete(sessionId);
        return { success: true };
    }

    static async getSession(sessionId) {
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new Error('Session not found or expired');
        }

        // Check if session expired
        if (new Date() > session.expiresAt) {
            sessionStore.delete(sessionId);
            throw new Error('Session expired');
        }

        return session;
    }

    static async updateCashPosition(tellerId, cashPosition) {
        const { error } = await supabase
            .from('tellers')
            .update({ current_cash_position: cashPosition })
            .eq('id', tellerId);

        if (error) throw new Error(`Failed to update cash position: ${error.message}`);

        return { success: true, newCashPosition: cashPosition };
    }

    static async findClient(identifier) {
        // Search by phone number, email, or user ID
        const { data: client, error } = await supabase
            .from('users')
            .select(`
                id,
                full_name,
                email,
                phone_number,
                risk_rating,
                pep_status,
                kyc_status,
                wallets (
                    id,
                    balance,
                    currency,
                    status,
                    daily_limit,
                    monthly_limit
                )
            `)
            .or(`phone_number.eq.${identifier},email.eq.${identifier},id.eq.${identifier}`)
            .maybeSingle();

        if (error) throw new Error(`Failed to find client: ${error.message}`);
        if (!client) throw new Error('Client not found');

        return client;
    }

    static async verifyClientPin(userId, pin) {
        const { data: user, error } = await supabase
            .from('users')
            .select('pin_hash')
            .eq('id', userId)
            .single();

        if (error) throw new Error(`Failed to verify PIN: ${error.message}`);
        if (!user) throw new Error('User not found');
        const isValidPin = await bcrypt.compare(String(pin || ""), String(user.pin_hash || ""));
        if (!isValidPin) throw new Error('Invalid PIN');

        return true;
    }

    static async processDeposit(walletId, amount, tellerId, paymentMethod = 'CASH') {
        const reference = `TELLER-DEP-${uuidv4().substring(0, 8)}-${Date.now()}`;
        
        try {
            // Create transaction record
            const { error: txError } = await supabase.from('transactions').insert({
                wallet_id: walletId,
                reference,
                amount,
                type: 'DEPOSIT',
                status: 'PENDING',
                metadata: {
                    teller_id: tellerId,
                    payment_method: paymentMethod,
                    processed_by: 'TELLER'
                }
            });

            if (txError) throw txError;

            // Credit wallet
            const { error: creditError } = await supabase.rpc('credit_wallet', {
                p_wallet_id: walletId,
                p_amount: amount,
                p_reference: reference
            });

            if (creditError) throw creditError;

            // Update transaction status to success
            await supabase.from('transactions')
                .update({ status: 'SUCCESS' })
                .eq('reference', reference);

            // Post revenue for transaction fees
            await PaymentService.postTransactionFeeRevenue(reference);

            // Send notification
            await PaymentService.notifyTransactionUpdate(reference);

            return {
                success: true,
                reference,
                message: 'Deposit processed successfully'
            };

        } catch (error) {
            // Mark transaction as failed if it exists
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference)
                .maybeSingle();

            throw error;
        }
    }

    static async processWithdrawal(walletId, amount, tellerId, userId, pin, paymentMethod = 'CASH') {
        const reference = `TELLER-WD-${uuidv4().substring(0, 8)}-${Date.now()}`;
        
        try {
            // Verify client PIN first
            await this.verifyClientPin(userId, pin);

            // Initialize withdrawal (debit wallet)
            const { error: debitError } = await supabase.rpc('init_withdrawal', {
                p_wallet_id: walletId,
                p_amount: amount,
                p_reference: reference
            });

            if (debitError) throw debitError;

            // Create transaction record
            const { error: txError } = await supabase.from('transactions').insert({
                wallet_id: walletId,
                reference,
                amount,
                type: 'WITHDRAWAL',
                status: 'SUCCESS',
                metadata: {
                    teller_id: tellerId,
                    payment_method: paymentMethod,
                    processed_by: 'TELLER',
                    pin_verified: true
                }
            });

            if (txError) throw txError;

            // Post revenue for transaction fees
            await PaymentService.postTransactionFeeRevenue(reference);

            // Send notification
            await PaymentService.notifyTransactionUpdate(reference);

            return {
                success: true,
                reference,
                message: 'Withdrawal processed successfully'
            };

        } catch (error) {
            // Refund wallet if debit occurred but transaction failed
            await supabase.rpc('refund_wallet', { p_reference: reference }).catch(() => {});
            
            // Mark transaction as failed if it exists
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference)
                .maybeSingle();

            throw error;
        }
    }

    static async generateReceipt(reference) {
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select(`
                id,
                reference,
                amount,
                type,
                status,
                created_at,
                metadata,
                wallets (
                    balance,
                    users (
                        full_name,
                        phone_number,
                        email
                    )
                )
            `)
            .eq('reference', reference)
            .single();

        if (error) throw error;
        if (!transaction) throw new Error('Transaction not found');

        const user = transaction.wallets?.users;
        if (!user) throw new Error('User information not found');

        const receiptData = {
            transactionId: transaction.id,
            reference: transaction.reference,
            amount: transaction.amount,
            type: transaction.type,
            status: transaction.status,
            createdAt: transaction.created_at,
            balanceAfter: transaction.wallets?.balance,
            customerName: user.full_name,
            customerPhone: user.phone_number,
            customerEmail: user.email,
            tellerId: transaction.metadata?.teller_id,
            paymentMethod: transaction.metadata?.payment_method || 'CASH',
            processedBy: transaction.metadata?.processed_by || 'TELLER'
        };

        return receiptData;
    }

    static async getTellerTransactions(tellerId, limit = 50) {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                id,
                reference,
                amount,
                type,
                status,
                created_at,
                metadata,
                wallets (
                    users (
                        full_name,
                        phone_number
                    )
                )
            `)
            .eq('metadata->>processed_by', 'TELLER')
            .eq('metadata->>teller_id', tellerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return transactions;
    }

    static async getDailyTellerSummary(tellerId) {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: summary, error } = await supabase
            .from('transactions')
            .select('type, amount, status')
            .eq('metadata->>processed_by', 'TELLER')
            .eq('metadata->>teller_id', tellerId)
            .gte('created_at', `${today}T00:00:00Z`)
            .lt('created_at', `${today}T23:59:59Z`);

        if (error) throw error;

        const stats = {
            totalTransactions: summary?.length || 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            successfulTransactions: 0,
            failedTransactions: 0
        };

        summary?.forEach(tx => {
            if (tx.status === 'SUCCESS') {
                stats.successfulTransactions++;
                if (tx.type === 'DEPOSIT') {
                    stats.totalDeposits += tx.amount;
                } else if (tx.type === 'WITHDRAWAL') {
                    stats.totalWithdrawals += tx.amount;
                }
            } else {
                stats.failedTransactions++;
            }
        });

        return stats;
    }
}

module.exports = TellerService;
