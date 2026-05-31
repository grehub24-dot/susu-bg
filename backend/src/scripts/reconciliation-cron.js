require('dotenv').config();
const reconciliationService = require('../services/reconciliation.service');
const logger = require('../lib/logger');

async function runReconciliation() {
    logger.info('Starting nightly reconciliation...');

    try {
        const result = await reconciliationService.reconcilieAllWallets();

        if (result.discrepancies.length > 0) {
            logger.error(`Reconciliation FAILED: ${result.discrepancies.length} discrepancies found`);
            process.exit(1);
        } else {
            logger.info(`Reconciliation PASSED: ${result.totalWallets} wallets verified`);
            process.exit(0);
        }
    } catch (error) {
        logger.error('Reconciliation error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runReconciliation();
}

module.exports = { runReconciliation };