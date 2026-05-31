const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../lib/supabase');
const WigalService = require('./wigal.service');
const ReceiptService = require('./receipt.service');
const logger = require('../lib/logger');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const FRONTEND_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL;
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'GHS';

// E-Levy Configuration (Ghana government tax on digital transactions)
// Effective May 1, 2022: 0.5% on transfers/withdrawals over GHS 100

class PaymentService {
    static asMoney(value) {
        return Number(value || 0).toFixed(2);
    }

    static roundMoney(value) {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }

    static parseNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    static parseRate(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 0;
        return parsed > 1 ? parsed / 100 : parsed;
    }

    static isMissingRelationError(error) {
        return String(error?.code || '') === '42P01';
    }

    static normalizeFeeType(type) {
        return String(type || '').toUpperCase() === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT';
    }

    static calculateElevy(amount) {
        // E-Levy: Ghana government tax on mobile money transactions
        // Applied on withdrawals/transfers OVER GHS 100 at 0.5%
        const rate = parseFloat(process.env.ELEVY_RATE || "0.005");
        const threshold = parseFloat(process.env.ELEVY_THRESHOLD || "100");
        const minVal = parseFloat(process.env.ELEVY_MIN || "0.10");
        const maxVal = parseFloat(process.env.ELEVY_MAX || "100.00");
        if (amount <= threshold) return 0;
        const raw = amount * rate;
        if (raw < minVal) return minVal;
        if (raw > maxVal) return maxVal;
        return this.roundMoney(raw);
    }

    // Ghana-standard fee rates
    static getStandardFee(type) {
        return type.toUpperCase() === 'WITHDRAWAL' ? 0.02 : 0.01; // 2% withdrawal, 1% deposit
    }

    // Calculate standard Ghana fees (no config needed)
    static calculateStandardFees(amount, type) {
        const feeRate = this.getStandardFee(type);
        const fee = this.roundMoney(amount * feeRate);
        const elevy = type.toUpperCase() === 'WITHDRAWAL'
            ? this.calculateElevy(amount)
            : 0;
        return {
            fee,
            elevy,
            totalFees: this.roundMoney(fee + elevy),
            grossAmount: amount,
            netAmount: this.roundMoney(amount - fee - elevy)
        };
    }

    static calculateTotalFees(amount, type) {
        // Calculate all fees for a transaction
        const serviceFee = this.getConfiguredTransactionFee(type, amount);
        const elevy = type.toUpperCase() === 'WITHDRAWAL'
            ? this.calculateElevy(amount)
            : 0;
        return {
            serviceFee,
            elevy,
            totalFees: this.roundMoney(serviceFee + elevy),
            grossAmount: amount,
            netAmount: this.roundMoney(amount - serviceFee - elevy)
        };
    }

    static getConfiguredTransactionFee(type, amount) {
        const normalizedType = this.normalizeFeeType(type);
        
        // Default to Ghana-standard rates if env vars not set
        const prefix = normalizedType === 'WITHDRAWAL' ? 'TX_FEE_WITHDRAWAL' : 'TX_FEE_DEPOSIT';
        const fixed = this.parseNumber(process.env[`${prefix}_FIXED`]);
        const rate = this.parseRate(process.env[`${prefix}_RATE`]);
        const min = this.parseNumber(process.env[`${prefix}_MIN`]);
        const max = this.parseNumber(process.env[`${prefix}_MAX`]);

        // If no custom rate configured, use Ghana standard rates
        if (!process.env[`${prefix}_RATE`]) {
            return this.roundMoney(amount * this.getStandardFee(normalizedType));
        }

        let fee = fixed + this.parseNumber(amount) * rate;
        if (min > 0 && fee < min) fee = min;
        if (max > 0 && fee > max) fee = max;
        return this.roundMoney(fee);
    }

    static buildTransactionMetadata(type, amount, currentMetadata = null) {
        const base = currentMetadata && typeof currentMetadata === 'object' ? { ...currentMetadata } : {};
        const existingFee = typeof base.fee_amount !== 'undefined' ? this.parseNumber(base.fee_amount) : this.parseNumber(base.fee);
        const feeAmount = existingFee > 0 ? existingFee : this.getConfiguredTransactionFee(type, amount);

        if (feeAmount <= 0) return Object.keys(base).length > 0 ? base : null;

        return {
            ...base,
            fee_amount: feeAmount,
            fee_currency: String(base.fee_currency || DEFAULT_CURRENCY),
            fee_category: 'TRANSACTION_FEE',
            fee_source: String(base.fee_source || 'AUTO_CONFIG')
        };
    }

    static async saveTransactionMetadata(reference, metadata) {
        if (!reference || !metadata || typeof metadata !== 'object') return;
        const { error } = await supabase
            .from('transactions')
            .update({ metadata, updated_at: new Date() })
            .eq('reference', reference);

        if (error) throw new Error(`Failed to update transaction metadata: ${error.message}`);
    }

    static async postTransactionFeeRevenue(reference, fallback = {}) {
        if (!reference) return;

        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('id, reference, amount, type, status, metadata')
            .eq('reference', reference)
            .maybeSingle();

        if (error || !transaction) return;
        if (String(transaction.status || '').toUpperCase() !== 'SUCCESS') return;

        const metadata = this.buildTransactionMetadata(
            transaction.type,
            transaction.amount,
            transaction.metadata && typeof transaction.metadata === 'object'
                ? { ...transaction.metadata, ...fallback }
                : fallback
        );
        const feeAmount = this.parseNumber(metadata?.fee_amount);
        if (feeAmount <= 0) return;

        if (metadata && JSON.stringify(metadata) !== JSON.stringify(transaction.metadata || null)) {
            await this.saveTransactionMetadata(reference, metadata);
        }

        const { data: existing, error: existingError } = await supabase
            .from('revenue_ledger')
            .select('id')
            .eq('reference', reference)
            .eq('category', 'TRANSACTION_FEE')
            .eq('source_type', 'TRANSACTION')
            .maybeSingle();

        if (existingError) {
            if (this.isMissingRelationError(existingError)) return;
            throw new Error(`Failed to query revenue ledger: ${existingError.message}`);
        }

        if (existing) return;

        const payload = {
            source_type: 'TRANSACTION',
            category: 'TRANSACTION_FEE',
            amount: feeAmount,
            currency: String(metadata?.fee_currency || DEFAULT_CURRENCY),
            reference,
            note: `${String(transaction.type || 'TRANSACTION').toUpperCase()} fee revenue`,
            metadata: {
                transaction_id: transaction.id,
                transaction_reference: reference,
                transaction_type: String(transaction.type || 'TRANSACTION').toUpperCase(),
                fee_source: String(metadata?.fee_source || 'AUTO_CONFIG')
            }
        };

        const { error: insertError } = await supabase
            .from('revenue_ledger')
            .insert(payload);

        if (insertError && !this.isMissingRelationError(insertError)) {
            throw new Error(`Failed to insert revenue ledger entry: ${insertError.message}`);
        }
    }

    static getUserFromTransactionRecord(record) {
        const wallets = record?.wallets;
        const users = wallets?.users;
        if (Array.isArray(users)) return users[0] || null;
        return users || null;
    }

    static async notifyTransactionUpdate(reference) {
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select(`
                id, reference, amount, type, status,
                wallets (
                    balance,
                    users ( full_name, email, phone_number )
                )
            `)
            .eq('reference', reference)
            .maybeSingle();

        if (error || !transaction) return;

        const user = this.getUserFromTransactionRecord(transaction);
        if (!user) return;

        const txType = String(transaction.type || 'TRANSACTION').toUpperCase();
        const txStatus = String(transaction.status || 'PENDING').toUpperCase();
        const amountLabel = this.asMoney(transaction.amount);
        const balanceLabel = this.asMoney(transaction.wallets?.balance);

        const statusLabel = txStatus === 'SUCCESS' ? 'successful' : txStatus === 'FAILED' ? 'failed' : 'pending';
        const smsMessage = `Susu-BG Alert: ${txType} of GHS ${amountLabel} is ${statusLabel}. Current balance is GHS ${balanceLabel}. Ref: ${reference}`;
        const emailSubject = `Susu-BG ${txType} ${txStatus}`;
        const emailBody = `Hello ${String(user.full_name || '').trim() || 'Customer'},\n\nYour ${txType.toLowerCase()} transaction with reference ${reference} is ${statusLabel}.\nAmount: GHS ${amountLabel}\nCurrent Balance: GHS ${balanceLabel}\n\nThank you for using Susu-BG.`;

        await Promise.all([
            user.phone_number ? WigalService.sendSMS(user.phone_number, smsMessage).catch(() => {}) : Promise.resolve(),
            user.email
                ? ReceiptService.sendNotificationEmail(user.email, emailSubject, emailBody, {
                      userId: user.id,
                      emailType: "TX_UPDATE",
                      metadata: { reference, type: txType, status: txStatus }
                  }).catch(() => {})
                : Promise.resolve()
        ]);
    }

    static async initDeposit(walletId, amount, email, reference) {
        const metadata = this.buildTransactionMetadata('DEPOSIT', amount);
        const { error } = await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference: reference,
            amount: amount,
            type: 'DEPOSIT',
            status: 'PENDING',
            metadata
        });
        
        if (error) throw new Error(`DB Error: ${error.message}`);

        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
            email: email,
            amount: amount * 100,
            reference: reference,
            callback_url: FRONTEND_CALLBACK_URL,
            metadata: {
                wallet_id: walletId,
                fee_amount: metadata?.fee_amount || 0,
                fee_currency: metadata?.fee_currency || DEFAULT_CURRENCY
            }
        }, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });

        return response.data.data.authorization_url;
    }

    static async initWithdrawal(walletId, amount, recipientCode, reference) {
        const metadata = this.buildTransactionMetadata('WITHDRAWAL', amount);
        const { error: debitError } = await supabase.rpc('init_withdrawal', {
            p_wallet_id: walletId,
            p_amount: amount,
            p_reference: reference
        });

        if (debitError) throw new Error(`Insufficient funds or DB error: ${debitError.message}`);

        if (metadata) {
            await this.saveTransactionMetadata(reference, metadata);
        }

        try {
            const response = await axios.post(`${PAYSTACK_BASE_URL}/transfer`, {
                source: "balance",
                amount: amount * 100,
                recipient: recipientCode,
                reason: "Susu Withdrawal",
                reference: reference
            }, {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
            });
            return response.data.data;
        } catch (error) {
            await supabase.rpc('refund_wallet', { p_reference: reference });
            throw new Error(`Transfer failed: ${error.response?.data?.message || error.message}`);
        }
    }

    static verifyWebhookSignature(req) {
        const bodyString = req.rawBody || JSON.stringify(req.body);
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
                           .update(bodyString)
                           .digest('hex');
        return hash === req.headers['x-paystack-signature'];
    }

    static async handleWebhook(event) {
        const reference = event.data.reference;

        // Idempotency: Check if already processed
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('reference', reference)
            .maybeSingle();

        if (existingTx && existingTx.status === 'SUCCESS') {
            return { status: 'already_processed' }; // Prevent double-crediting
        }

        if (event.event === 'charge.success') {
            const { data: pendingDeposit } = await supabase
                .from('transactions')
                .select('id')
                .eq('reference', reference)
                .eq('status', 'PENDING')
                .maybeSingle();

            if (!pendingDeposit) return { status: 'handled' };

            const amount = event.data.amount / 100;
            const fees = this.calculateTotalFees(amount, 'DEPOSIT');

            await supabase.rpc('credit_wallet_with_journal', {
                p_wallet_id: event.data.metadata.wallet_id,
                p_amount: amount,
                p_reference: reference,
                p_fee_amount: fees.serviceFee,
                p_elevy_amount: 0 // No E-Levy on deposits
            });

            await this.postTransactionFeeRevenue(reference, {
                fee_amount: event?.data?.metadata?.fee_amount || fees.serviceFee,
                fee_currency: event?.data?.metadata?.fee_currency || DEFAULT_CURRENCY
            });

            // Post E-Levy if applicable (for large deposits)
            if (fees.elevy > 0) {
                await this.postElevyRevenue(reference, fees.elevy);
            }

            await this.notifyTransactionUpdate(reference);
            return { status: 'handled' };
        }

        else if (event.event === 'transfer.success') {
            const { data: pendingTransfer } = await supabase
                .from('transactions')
                .select('id, amount')
                .eq('reference', reference)
                .eq('status', 'PENDING')
                .maybeSingle();

            if (!pendingTransfer) return { status: 'handled' };

            // Calculate E-Levy for withdrawal
            const fees = this.calculateTotalFees(pendingTransfer.amount, 'WITHDRAWAL');

            // Update transaction with E-Levy metadata
            await supabase
                .from('transactions')
                .update({
                    status: 'SUCCESS',
                    updated_at: new Date(),
                    metadata: {
                        ...(pendingTransfer.metadata || {}),
                        service_fee: fees.serviceFee,
                        elevy: fees.elevy,
                        total_fees: fees.totalFees
                    }
                })
                .eq('reference', reference);

            await this.postTransactionFeeRevenue(reference);
            await this.postElevyRevenue(reference, fees.elevy);
            await this.notifyTransactionUpdate(reference);
            return { status: 'handled' };
        }

        else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
            const { data: pendingTransfer } = await supabase
                .from('transactions')
                .select('id')
                .eq('reference', reference)
                .eq('status', 'PENDING')
                .maybeSingle();

            if (!pendingTransfer) return { status: 'handled' };

            await supabase.rpc('refund_wallet', { p_reference: reference });
            await this.notifyTransactionUpdate(reference);
            return { status: 'handled' };
        }

        return { status: 'ignored' };
    }

    static async postElevyRevenue(reference, amount) {
        if (!reference || !amount || amount <= 0) return;

        // Check for existing E-Levy entry (idempotency)
        const { data: existing } = await supabase
            .from('revenue_ledger')
            .select('id')
            .eq('reference', reference)
            .eq('category', 'GOV_TAX_ELEVY')
            .maybeSingle();

        if (existing) return;

        const { error } = await supabase
            .from('revenue_ledger')
            .insert({
                source_type: 'TRANSACTION',
                category: 'GOV_TAX_ELEVY',
                amount: this.roundMoney(amount),
                currency: DEFAULT_CURRENCY,
                reference,
                note: 'Ghana E-Levy government tax',
                // Update metadata with correct rate info
            metadata: { tax_type: 'ELEVY', rate: ELEVY_RATE, threshold: ELEVY_THRESHOLD }
            });

        if (error) {
            logger.error('Failed to post E-Levy revenue:', error.message);
        }
    }
}

module.exports = PaymentService;
