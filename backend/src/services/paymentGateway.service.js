const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");

/**
 * Multi-Channel Payment Gateway Service
 * Supports: Paystack, Mobile Money (MTN, Vodafone, AirtelTigo), Cash, E-zwich, GIP
 * Based on System upgrade.md requirements
 */
class PaymentGatewayService {
    // Payment channels enum
    static CHANNELS = {
        PAYSTACK_CARD: 'PAYSTACK_CARD',
        PAYSTACK_TRANSFER: 'PAYSTACK_TRANSFER',
        MOMO_MTN: 'MOMO_MTN',
        MOMO_VODAFONE: 'MOMO_VODAFONE',
        MOMO_AIRTELTIGO: 'MOMO_AIRTELTIGO',
        CASH: 'CASH',
        BANK_DEPOSIT: 'BANK_DEPOSIT',
        BANK_WITHDRAWAL: 'BANK_WITHDRAWAL',
        E_ZWICH: 'E_ZWICH',
        GIP: 'GIP',
        TELLER_CASH: 'TELLER_CASH',
        TELLER_MOMO: 'TELLER_MOMO',
        TELLER_BANK: 'TELLER_BANK'
    };

    /**
     * Route payment to appropriate channel provider
     */
    static async routePayment(paymentData) {
        const { channel, amount, type, walletId, userId, metadata } = paymentData;

        try {
            let result;

            switch (channel) {
                case this.CHANNELS.PAYSTACK_CARD:
                case this.CHANNELS.PAYSTACK_TRANSFER:
                    result = await this.processPaystackPayment(paymentData);
                    break;
                case this.CHANNELS.MOMO_MTN:
                case this.CHANNELS.MOMO_VODAFONE:
                case this.CHANNELS.MOMO_AIRTELTIGO:
                    result = await this.processMobileMoneyPayment(paymentData);
                    break;
                case this.CHANNELS.E_ZWICH:
                    result = await this.processEzwichPayment(paymentData);
                    break;
                case this.CHANNELS.GIP:
                    result = await this.processGIPPayment(paymentData);
                    break;
                case this.CHANNELS.CASH:
                case this.CHANNELS.TELLER_CASH:
                case this.CHANNELS.TELLER_MOMO:
                case this.CHANNELS.TELLER_BANK:
                    result = await this.processCashPayment(paymentData);
                    break;
                default:
                    throw new Error(`Unsupported payment channel: ${channel}`);
            }

            // Post revenue for transaction fees
            await this.postTransactionRevenue(result.reference, channel, amount);

            return result;

        } catch (error) {
            throw new Error(`Payment routing failed: ${error.message}`);
        }
    }

    /**
     * Process Paystack payment (card or transfer)
     */
    static async processPaystackPayment(paymentData) {
        const { channel, amount, type, walletId, userId, metadata } = paymentData;
        const reference = `PAYSTACK-${uuidv4().substring(0, 8)}`;

        // Initialize transaction in database
        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference,
            amount,
            type,
            status: 'PENDING',
            channel,
            metadata: {
                ...metadata,
                provider: 'PAYSTACK',
                payment_method: channel === this.CHANNELS.PAYSTACK_CARD ? 'CARD' : 'TRANSFER'
            }
        });

        // Call Paystack API (placeholder - integrate actual Paystack SDK)
        const paystackResult = await this.callPaystackAPI({
            reference,
            amount: amount * 100, // Paystack expects amount in pesewas
            email: metadata.email,
            channel: channel === this.CHANNELS.PAYSTACK_CARD ? 'card' : 'bank'
        });

        if (paystackResult.success) {
            // Update transaction status
            await supabase.from('transactions')
                .update({ 
                    status: 'SUCCESS',
                    external_reference: paystackResult.reference
                })
                .eq('reference', reference);

            // Credit or debit wallet
            if (type === 'DEPOSIT') {
                await supabase.rpc('credit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            } else if (type === 'WITHDRAWAL') {
                await supabase.rpc('debit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            }

            return {
                success: true,
                reference,
                channel,
                provider: 'PAYSTACK',
                status: 'SUCCESS'
            };
        } else {
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference);

            throw new Error(paystackResult.message || 'Paystack payment failed');
        }
    }

    /**
     * Process Mobile Money payment (MTN, Vodafone, AirtelTigo)
     */
    static async processMobileMoneyPayment(paymentData) {
        const { channel, amount, type, walletId, userId, metadata } = paymentData;
        const reference = `MOMO-${channel.split('_')[1]}-${uuidv4().substring(0, 8)}`;

        // Initialize transaction
        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference,
            amount,
            type,
            status: 'PENDING',
            channel,
            metadata: {
                ...metadata,
                provider: channel.split('_')[1],
                phone_number: metadata.phoneNumber,
                payment_method: 'MOBILE_MONEY'
            }
        });

        // Call Mobile Money API (placeholder - integrate actual provider SDKs)
        const momoResult = await this.callMobileMoneyAPI({
            reference,
            amount,
            provider: channel.split('_')[1],
            phoneNumber: metadata.phoneNumber,
            type // 'debit' for deposits, 'credit' for withdrawals
        });

        if (momoResult.success) {
            await supabase.from('transactions')
                .update({ 
                    status: 'SUCCESS',
                    external_reference: momoResult.transactionId
                })
                .eq('reference', reference);

            if (type === 'DEPOSIT') {
                await supabase.rpc('credit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            } else if (type === 'WITHDRAWAL') {
                await supabase.rpc('debit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            }

            return {
                success: true,
                reference,
                channel,
                provider: channel.split('_')[1],
                status: 'SUCCESS'
            };
        } else {
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference);

            throw new Error(momoResult.message || 'Mobile Money payment failed');
        }
    }

    /**
     * Process E-zwich payment (biometric card)
     */
    static async processEzwichPayment(paymentData) {
        const { amount, type, walletId, metadata } = paymentData;
        const reference = `EZWICH-${uuidv4().substring(0, 8)}`;

        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference,
            amount,
            type,
            status: 'PENDING',
            channel: this.CHANNELS.E_ZWICH,
            metadata: {
                ...metadata,
                provider: 'GHIPSS',
                payment_method: 'E_ZWICH',
                card_serial: metadata.cardSerial
            }
        });

        // Call E-zwich API (placeholder - integrate GHIPSS SDK)
        const ezwichResult = await this.callEzwichAPI({
            reference,
            amount,
            cardSerial: metadata.cardSerial,
            pin: metadata.pin
        });

        if (ezwichResult.success) {
            await supabase.from('transactions')
                .update({ 
                    status: 'SUCCESS',
                    external_reference: ezwichResult.transactionId
                })
                .eq('reference', reference);

            if (type === 'DEPOSIT') {
                await supabase.rpc('credit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            } else if (type === 'WITHDRAWAL') {
                await supabase.rpc('debit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            }

            return {
                success: true,
                reference,
                channel: this.CHANNELS.E_ZWICH,
                provider: 'GHIPSS',
                status: 'SUCCESS'
            };
        } else {
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference);

            throw new Error(ezwichResult.message || 'E-zwich payment failed');
        }
    }

    /**
     * Process GIP (Ghana Interbank Payment) - real-time interbank transfer
     */
    static async processGIPPayment(paymentData) {
        const { amount, type, walletId, metadata } = paymentData;
        const reference = `GIP-${uuidv4().substring(0, 8)}`;

        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference,
            amount,
            type,
            status: 'PENDING',
            channel: this.CHANNELS.GIP,
            metadata: {
                ...metadata,
                provider: 'BANK_OF_GHANA',
                payment_method: 'GIP',
                destination_bank: metadata.destinationBank,
                destination_account: metadata.destinationAccount
            }
        });

        // Call GIP API (placeholder - integrate BoG GIP SDK)
        const gipResult = await this.callGIPAPI({
            reference,
            amount,
            destinationBank: metadata.destinationBank,
            destinationAccount: metadata.destinationAccount,
            narration: metadata.narration || 'Transfer'
        });

        if (gipResult.success) {
            await supabase.from('transactions')
                .update({ 
                    status: 'SUCCESS',
                    external_reference: gipResult.transactionId
                })
                .eq('reference', reference);

            if (type === 'DEPOSIT') {
                await supabase.rpc('credit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            } else if (type === 'WITHDRAWAL') {
                await supabase.rpc('debit_wallet', {
                    p_wallet_id: walletId,
                    p_amount: amount,
                    p_reference: reference
                });
            }

            return {
                success: true,
                reference,
                channel: this.CHANNELS.GIP,
                provider: 'BANK_OF_GHANA',
                status: 'SUCCESS'
            };
        } else {
            await supabase.from('transactions')
                .update({ status: 'FAILED' })
                .eq('reference', reference);

            throw new Error(gipResult.message || 'GIP payment failed');
        }
    }

    /**
     * Process cash payment (teller or direct)
     */
    static async processCashPayment(paymentData) {
        const { channel, amount, type, walletId, tellerId, metadata } = paymentData;
        const reference = `CASH-${uuidv4().substring(0, 8)}`;

        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference,
            amount,
            type,
            status: 'SUCCESS',
            channel,
            teller_id: tellerId,
            metadata: {
                ...metadata,
                provider: 'INTERNAL',
                payment_method: 'CASH',
                processed_by: tellerId ? 'TELLER' : 'DIRECT'
            }
        });

        if (type === 'DEPOSIT') {
            await supabase.rpc('credit_wallet', {
                p_wallet_id: walletId,
                p_amount: amount,
                p_reference: reference
            });

            // Update teller cash position if applicable
            if (tellerId) {
                await supabase.rpc('update_teller_cash_position', {
                    p_teller_id: tellerId,
                    p_amount: amount,
                    p_operation: 'ADD'
                });
            }
        } else if (type === 'WITHDRAWAL') {
            await supabase.rpc('debit_wallet', {
                p_wallet_id: walletId,
                p_amount: amount,
                p_reference: reference
            });

            if (tellerId) {
                await supabase.rpc('update_teller_cash_position', {
                    p_teller_id: tellerId,
                    p_amount: amount,
                    p_operation: 'SUBTRACT'
                });
            }
        }

        return {
            success: true,
            reference,
            channel,
            provider: 'INTERNAL',
            status: 'SUCCESS'
        };
    }

    /**
     * Handle webhook from payment providers
     */
    static async handleWebhook(provider, webhookData) {
        const { reference, status, transactionId } = webhookData;

        try {
            const { data: transaction, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('reference', reference)
                .single();

            if (error || !transaction) {
                throw new Error('Transaction not found');
            }

            // Update transaction status based on webhook
            const newStatus = status === 'success' ? 'SUCCESS' : 'FAILED';
            await supabase.from('transactions')
                .update({ 
                    status: newStatus,
                    external_reference: transactionId
                })
                .eq('reference', reference);

            // Handle wallet updates based on final status
            if (newStatus === 'SUCCESS') {
                if (transaction.type === 'DEPOSIT') {
                    await supabase.rpc('credit_wallet', {
                        p_wallet_id: transaction.wallet_id,
                        p_amount: transaction.amount,
                        p_reference: reference
                    });
                }
            } else if (newStatus === 'FAILED') {
                // Refund if debit occurred
                await supabase.rpc('refund_wallet', { p_reference: reference });
            }

            return { success: true, message: 'Webhook processed successfully' };

        } catch (error) {
            throw new Error(`Webhook processing failed: ${error.message}`);
        }
    }

    /**
     * Post transaction revenue to ledger
     */
    static async postTransactionRevenue(reference, channel, amount) {
        // Calculate transaction fee based on channel
        const fee = this.calculateTransactionFee(channel, amount);

        if (fee > 0) {
            await supabase.rpc('post_revenue', {
                p_category: 'TRANSACTION_FEE',
                p_source_type: 'TRANSACTION',
                p_source_id: null,
                p_amount: fee,
                p_description: `Transaction fee for ${channel}`,
                p_metadata: { channel, reference },
                p_teller_id: null,
                p_susu_group_id: null,
                p_branch_id: null
            });
        }
    }

    /**
     * Calculate transaction fee based on channel
     */
    static calculateTransactionFee(channel, amount) {
        const feeConfig = {
            [this.CHANNELS.PAYSTACK_CARD]: 0.015, // 1.5%
            [this.CHANNELS.PAYSTACK_TRANSFER]: 0.01, // 1%
            [this.CHANNELS.MOMO_MTN]: 0.01, // 1%
            [this.CHANNELS.MOMO_VODAFONE]: 0.01, // 1%
            [this.CHANNELS.MOMO_AIRTELTIGO]: 0.01, // 1%
            [this.CHANNELS.E_ZWICH]: 0.005, // 0.5%
            [this.CHANNELS.GIP]: 0.002, // 0.2%
            [this.CHANNELS.CASH]: 0.005, // 0.5%
            [this.CHANNELS.TELLER_CASH]: 0.005, // 0.5%
            [this.CHANNELS.TELLER_MOMO]: 0.01, // 1%
            [this.CHANNELS.TELLER_BANK]: 0.005 // 0.5%
        };

        const rate = feeConfig[channel] || 0.01;
        return amount * rate;
    }

    // Placeholder API methods - integrate actual SDKs
    static async callPaystackAPI(params) {
        // TODO: Integrate Paystack SDK
        console.log('Paystack API call:', params);
        return { success: true, reference: params.reference };
    }

    static async callMobileMoneyAPI(params) {
        // TODO: Integrate Mobile Money APIs (MTN, Vodafone, AirtelTigo)
        console.log('Mobile Money API call:', params);
        return { success: true, transactionId: uuidv4() };
    }

    static async callEzwichAPI(params) {
        // TODO: Integrate GHIPSS E-zwich SDK
        console.log('E-zwich API call:', params);
        return { success: true, transactionId: uuidv4() };
    }

    static async callGIPAPI(params) {
        // TODO: Integrate BoG GIP SDK
        console.log('GIP API call:', params);
        return { success: true, transactionId: uuidv4() };
    }
}

module.exports = PaymentGatewayService;
