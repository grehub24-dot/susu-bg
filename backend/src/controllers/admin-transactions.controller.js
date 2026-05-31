// backend/src/controllers/admin-transactions.controller.js
const supabase = require("../lib/supabase");

class AdminTransactionsController {
    static async getTransactions(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id, reference, amount, type, status, created_at,
                    wallets (
                        users ( full_name, phone_number )
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { data: transaction, error } = await supabase
                .from("transactions")
                .select("*, wallets(*, users(full_name, phone_number))")
                .eq("id", transactionId)
                .single();

            if (error) throw error;
            if (!transaction) {
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createTransaction(req, res) {
        try {
            const { wallet_id, amount, type, status, channel, teller_id, metadata, reference } = req.body;

            if (!wallet_id || !amount || !type || !reference) {
                return res.status(400).json({ success: false, message: "wallet_id, amount, type, and reference are required" });
            }

            const { data: transaction, error } = await supabase
                .from("transactions")
                .insert({
                    wallet_id,
                    amount,
                    type,
                    status: status || "PENDING",
                    channel,
                    teller_id,
                    metadata,
                    reference
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const updates = req.body;

            const { data: transaction, error } = await supabase
                .from("transactions")
                .update(updates)
                .eq("id", transactionId)
                .select()
                .single();

            if (error) throw error;
            if (!transaction) {
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { error } = await supabase
                .from("transactions")
                .delete()
                .eq("id", transactionId);

            if (error) throw error;
            res.json({ success: true, message: "Transaction deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getReceipts(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));

            const { data, error } = await supabase
                .from("receipts")
                .select("*")
                .order("generated_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createReceipt(req, res) {
        try {
            const { transaction_id, receipt_number, receipt_type, customer_name, amount, payment_method } = req.body;

            if (!receipt_number || !receipt_type || !amount) {
                return res.status(400).json({ success: false, message: "receipt_number, receipt_type, and amount are required" });
            }

            const { data: receipt, error } = await supabase
                .from("receipts")
                .insert({
                    transaction_id,
                    receipt_number,
                    receipt_type,
                    customer_name,
                    amount,
                    payment_method,
                    email_sent: false,
                    sms_sent: false
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: receipt });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateReceipt(req, res) {
        try {
            const { receiptId } = req.params;
            const updates = req.body;

            const { data: receipt, error } = await supabase
                .from("receipts")
                .update(updates)
                .eq("id", receiptId)
                .select()
                .single();

            if (error) throw error;
            if (!receipt) {
                return res.status(404).json({ success: false, message: "Receipt not found" });
            }
            res.json({ success: true, data: receipt });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteReceipt(req, res) {
        try {
            const { receiptId } = req.params;
            const { error } = await supabase
                .from("receipts")
                .delete()
                .eq("id", receiptId);

            if (error) throw error;
            res.json({ success: true, message: "Receipt deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = AdminTransactionsController;
