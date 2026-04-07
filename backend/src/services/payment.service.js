const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../lib/supabase');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const FRONTEND_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL;

class PaymentService {
    static async initDeposit(walletId, amount, email, reference) {
        const { error } = await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference: reference,
            amount: amount,
            type: 'DEPOSIT',
            status: 'PENDING'
        });
        
        if (error) throw new Error(`DB Error: ${error.message}`);

        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
            email: email,
            amount: amount * 100,
            reference: reference,
            callback_url: FRONTEND_CALLBACK_URL
        }, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });

        return response.data.data.authorization_url;
    }

    static async initWithdrawal(walletId, amount, recipientCode, reference) {
        const { error: debitError } = await supabase.rpc('init_withdrawal', {
            p_wallet_id: walletId,
            p_amount: amount,
            p_reference: reference
        });

        if (debitError) throw new Error(`Insufficient funds or DB error: ${debitError.message}`);

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

        if (event.event === 'charge.success') {
            const amount = event.data.amount / 100;
            await supabase.rpc('credit_wallet', {
                p_wallet_id: event.data.metadata.wallet_id,
                p_amount: amount,
                p_reference: reference
            });
            return { status: 'handled' };
        } 
        
        else if (event.event === 'transfer.success') {
            await supabase.from('transactions')
                .update({ status: 'SUCCESS', updated_at: new Date() })
                .eq('reference', reference)
                .eq('status', 'PENDING');
            return { status: 'handled' };
        } 
        
        else if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
            await supabase.rpc('refund_wallet', { p_reference: reference });
            return { status: 'handled' };
        }

        return { status: 'ignored' };
    }
}

module.exports = PaymentService;
