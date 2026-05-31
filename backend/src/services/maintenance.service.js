const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const RevenueService = require("./revenue.service");

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'GHS';

class MaintenanceService {
    static getMaintenanceFeeConfig() {
        return {
            monthlyFee: Number(process.env.MAINTENANCE_MONTHLY_FEE) || 5.00,
            annualFee: Number(process.env.MAINTENANCE_ANNUAL_FEE) || 50.00,
            inactivityFee: Number(process.env.MAINTENANCE_INACTIVITY_FEE) || 2.00,
            minBalanceForFee: Number(process.env.MAINTENANCE_MIN_BALANCE_FOR_FEE) || 100.00
        };
    }

    static async chargeMonthlyMaintenance() {
        const config = this.getMaintenanceFeeConfig();
        
        // Get all active wallets above minimum balance
        const { data: wallets, error } = await supabase
            .from('wallets')
            .select('id, user_id, balance')
            .gte('balance', config.minBalanceForFee);

        if (error) throw error;

        const results = [];
        
        for (const wallet of wallets) {
            try {
                const maintenanceId = uuidv4();
                const reference = `MAINT-MONTHLY-${maintenanceId.substring(0, 8)}-${Date.now()}`;

                // Debit maintenance fee
                const { error: debitError } = await supabase.rpc('debit_wallet', {
                    p_wallet_id: wallet.id,
                    p_amount: config.monthlyFee,
                    p_reference: reference
                });

                if (debitError) {
                    results.push({ walletId: wallet.id, success: false, error: debitError.message });
                    continue;
                }

                // Post maintenance revenue
                await RevenueService.postMaintenanceRevenue({
                    maintenanceId,
                    userId: wallet.user_id,
                    amount: config.monthlyFee,
                    reference,
                    maintenanceType: 'MONTHLY_ACCOUNT_FEE',
                    billingPeriod: new Date().toISOString().substring(0, 7) // YYYY-MM
                });

                results.push({ walletId: wallet.id, success: true, amount: config.monthlyFee });

            } catch (error) {
                results.push({ walletId: wallet.id, success: false, error: error.message });
            }
        }

        return results;
    }

    static async chargeInactivityFee(userId, walletId) {
        const config = this.getMaintenanceFeeConfig();
        const maintenanceId = uuidv4();
        const reference = `MAINT-INACTIVITY-${maintenanceId.substring(0, 8)}-${Date.now()}`;

        try {
            // Check if wallet has sufficient balance
            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('id', walletId)
                .single();

            if (error || !wallet) {
                throw new Error('Wallet not found');
            }

            if (wallet.balance < config.inactivityFee) {
                throw new Error('Insufficient balance for inactivity fee');
            }

            // Debit inactivity fee
            const { error: debitError } = await supabase.rpc('debit_wallet', {
                p_wallet_id: walletId,
                p_amount: config.inactivityFee,
                p_reference: reference
            });

            if (debitError) throw debitError;

            // Post maintenance revenue
            await RevenueService.postMaintenanceRevenue({
                maintenanceId,
                userId,
                amount: config.inactivityFee,
                reference,
                maintenanceType: 'INACTIVITY_FEE',
                billingPeriod: 'ONE_TIME'
            });

            return { success: true, amount: config.inactivityFee, reference };

        } catch (error) {
            throw new Error(`Failed to charge inactivity fee: ${error.message}`);
        }
    }

    static async applyPenalty(userId, walletId, penaltyType, penaltyReason, amount) {
        const penaltyId = uuidv4();
        const reference = `PENALTY-${penaltyId.substring(0, 8)}-${Date.now()}`;

        try {
            // Check if wallet has sufficient balance
            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('id', walletId)
                .single();

            if (error || !wallet) {
                throw new Error('Wallet not found');
            }

            if (wallet.balance < amount) {
                throw new Error('Insufficient balance for penalty');
            }

            // Debit penalty amount
            const { error: debitError } = await supabase.rpc('debit_wallet', {
                p_wallet_id: walletId,
                p_amount: amount,
                p_reference: reference
            });

            if (debitError) throw debitError;

            // Post penalty revenue
            await RevenueService.postPenaltyRevenue({
                penaltyId,
                userId,
                amount,
                reference,
                penaltyType,
                penaltyReason
            });

            return { success: true, amount, reference };

        } catch (error) {
            throw new Error(`Failed to apply penalty: ${error.message}`);
        }
    }
}

module.exports = MaintenanceService;
