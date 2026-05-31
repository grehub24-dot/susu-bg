// backend/src/controllers/admin-users.controller.js
const supabase = require("../lib/supabase");

class AdminUsersController {

    static async getUsers(req, res) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 200);
            const offset = parseInt(req.query.offset) || 0;

            // Join users with their wallets
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, full_name, phone_number, created_at, kyc_status,
                    wallets ( balance, currency )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getUser(req, res) {
        try {
            const userId = String(req.params.userId || "").trim();
            if (!userId) {
                res.status(400).json({ success: false, message: "userId is required" });
                return;
            }

            const { data, error } = await supabase
                .from("users")
                .select(
                    `id, full_name, phone_number, email, created_at, kyc_status, date_of_birth,
                    momo_number, bank_account_number, bank_sort_code, bank_name, card_number,
                    house_address, gps_address, region, hometown,
                    passport_picture_url, id_type, id_number, id_card_front_url, id_card_back_url,
                    wallets ( balance, currency )`
                )
                .eq("id", userId)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getUserTransactions(req, res) {
        try {
            const userId = String(req.params.userId || "").trim();
            if (!userId) {
                res.status(400).json({ success: false, message: "userId is required" });
                return;
            }

            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));

            const { data, error } = await supabase
                .from("transactions")
                .select(
                    `id, reference, amount, type, status, created_at,
                    wallets ( id, user_id, users ( full_name, phone_number ) )`
                )
                .order("created_at", { ascending: false })
                .eq("wallets.user_id", userId)
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data, limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createUser(req, res) {
        try {
            const { full_name, email, phone_number, pin_hash, risk_rating, pep_status, ghana_card_number, ghana_card_image_url } = req.body;

            if (!full_name || !email || !phone_number || !pin_hash) {
                return res.status(400).json({ success: false, message: "full_name, email, phone_number, and pin_hash are required" });
            }

            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    full_name,
                    email,
                    phone_number,
                    pin_hash,
                    risk_rating: risk_rating || 'LOW',
                    pep_status: pep_status || false,
                    ghana_card_number,
                    ghana_card_image_url,
                    kyc_status: 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const updates = req.body;

            const { data: user, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Wallet Management Methods
    static async getWallets(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const userId = String(req.query.userId || "").trim();

            let query = supabase
                .from("wallets")
                .select("*, users(full_name, phone_number, email)")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (userId) {
                query = query.eq("user_id", userId);
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getWallet(req, res) {
        try {
            const { walletId } = req.params;
            const { data: wallet, error } = await supabase
                .from("wallets")
                .select("*, users(full_name, phone_number, email)")
                .eq("id", walletId)
                .single();

            if (error) throw error;
            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createWallet(req, res) {
        try {
            const { user_id, balance, currency, daily_limit, monthly_limit, branch_id, status } = req.body;

            if (!user_id) {
                return res.status(400).json({ success: false, message: "user_id is required" });
            }

            const { data: wallet, error } = await supabase
                .from("wallets")
                .insert({
                    user_id,
                    balance: balance || 0.00,
                    currency: currency || "GHS",
                    daily_limit: daily_limit || 5000.00,
                    monthly_limit: monthly_limit || 50000.00,
                    branch_id,
                    status: status || "ACTIVE"
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateWallet(req, res) {
        try {
            const { walletId } = req.params;
            const updates = req.body;

            const { data: wallet, error } = await supabase
                .from("wallets")
                .update(updates)
                .eq("id", walletId)
                .select()
                .single();

            if (error) throw error;
            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteWallet(req, res) {
        try {
            const { walletId } = req.params;
            const { error } = await supabase
                .from("wallets")
                .delete()
                .eq("id", walletId);

            if (error) throw error;
            res.json({ success: true, message: "Wallet deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async approveKYC(req, res) {
        try {
            const { userId } = req.params;
            
            // Validate user exists
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, full_name, email, phone_number')
                .eq('id', userId)
                .single();
                
            if (fetchError || !user) throw new Error("User not found");

            // Update KYC Status
            const { error: updateError } = await supabase
                .from('users')
                .update({ kyc_status: 'APPROVED', updated_at: new Date() })
                .eq('id', userId);

            if (updateError) throw updateError;

            const smsMessage = "Susu-BG Alert: Your KYC verification has been approved. You now have full access to all features!";
            const emailSubject = "Susu-BG KYC Approved";
            const emailBody = `Hello ${String(user.full_name || "").trim() || "Customer"},\n\nYour KYC verification has been approved. You now have full access to all Susu-BG features.\n\nThank you for choosing Susu-BG.`;
            await Promise.all([
                user.phone_number ? WigalService.sendSMS(user.phone_number, smsMessage) : Promise.resolve(),
                user.email ? ReceiptService.sendNotificationEmail(user.email, emailSubject, emailBody, { userId: user.id, emailType: "KYC_APPROVED" }) : Promise.resolve()
            ]);

            res.json({ success: true, message: "KYC Approved Successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = AdminUsersController;
