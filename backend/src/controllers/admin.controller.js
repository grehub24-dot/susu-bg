// backend/src/controllers/admin.controller.js
const supabase = require('../lib/supabase'); // Admin Client

class AdminController {
    
    /**
     * Get All Users with their Wallet Balances
     */
    static async getUsers(req, res) {
        try {
            // Join users with their wallets
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, full_name, phone_number, created_at, kyc_status,
                    wallets ( balance, currency )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * View Global Transaction Logs
     */
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

    /**
     * Manual KYC Approval (Admin Action)
     */
    static async approveKYC(req, res) {
        try {
            const { userId } = req.params;
            
            // Validate user exists
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, phone_number')
                .eq('id', userId)
                .single();
                
            if (fetchError || !user) throw new Error("User not found");

            // Update KYC Status
            const { error: updateError } = await supabase
                .from('users')
                .update({ kyc_status: 'APPROVED', updated_at: new Date() })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Trigger SMS Notification via Wigal
            const WigalService = require('../services/wigal.service');
            await WigalService.sendSMS(
                user.phone_number, 
                "Susu-BG Alert: Your KYC verification has been approved. You now have full access to all features!"
            );

            res.json({ success: true, message: "KYC Approved Successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = AdminController;
