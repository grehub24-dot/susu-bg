const supabase = require('../lib/supabase');
const logger = require('../lib/logger');

class ReconciliationService {
    async reconcilieAllWallets() {
        const { data: wallets, error } = await supabase
            .from('wallets')
            .select('id, balance, updated_at');

        if (error) throw error;

        const discrepancies = [];

        for (const wallet of wallets) {
            const { data: journalData, error: jeError } = await supabase
                .from('journal_entries')
                .select('account_code, entry_type, amount_cents')
                .eq('account_code', 'USER_WALLET')
                .in('entry_type', ['DEBIT', 'CREDIT']);

            if (jeError) {
                logger.error(`Journal query failed for wallet ${wallet.id}`, jeError);
                continue;
            }

            const totalDebits = journalData
                .filter(j => j.entry_type === 'DEBIT')
                .reduce((sum, j) => sum + Number(j.amount_cents), 0) / 100;

            const totalCredits = journalData
                .filter(j => j.entry_type === 'CREDIT')
                .reduce((sum, j) => sum + Number(j.amount_cents), 0) / 100;

            const calculatedBalance = totalDebits - totalCredits;
            const discrepancy = Number(wallet.balance) - calculatedBalance;

            if (Math.abs(discrepancy) > 0.01) {
                discrepancies.push({
                    walletId: wallet.id,
                    reportedBalance: wallet.balance,
                    calculatedBalance,
                    discrepancy
                });
            }
        }

        if (discrepancies.length > 0) {
            logger.warn('Reconciliation discrepancies found:', discrepancies);
            await this.logReconciliationRun(discrepancies, 'FAILED');
        } else {
            logger.info('All wallet balances reconciled successfully');
            await this.logReconciliationRun([], 'PASSED');
        }

        return { totalWallets: wallets.length, discrepancies };
    }

    async logReconciliationRun(discrepancies, status) {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action: 'RECONCILIATION',
                status,
                metadata: {
                    discrepancyCount: discrepancies.length,
                    discrepancies,
                    runAt: new Date().toISOString()
                }
            });

        if (error) logger.error('Failed to log reconciliation run', error);
    }
}

module.exports = new ReconciliationService();