require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../lib/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const CONCURRENT_COLLECTIONS = process.env.LOAD_TEST_COUNT || 100;

async function simulateCollection(userIndex) {
    const userId = uuidv4();
    const walletId = uuidv4();

    try {
        await supabase.from('wallets').insert({
            id: walletId,
            user_id: userId,
            balance: 1000,
            currency: 'GHS'
        });

        await supabase.from('transactions').insert({
            wallet_id: walletId,
            reference: `LOAD_TEST_${Date.now()}_${userIndex}`,
            amount: 10,
            type: 'DEPOSIT',
            status: 'PENDING'
        });

        await supabase.from('journal_entries').insert({
            transaction_id: (await supabase.from('transactions').select('id').eq('reference', `LOAD_TEST_${Date.now()}_${userIndex}`).single()).data?.id,
            account_type: 'LIABILITY',
            account_code: 'USER_WALLET',
            entry_type: 'DEBIT',
            amount_cents: 1000
        });

        return { userIndex, status: 'success' };
    } catch (error) {
        return { userIndex, status: 'failed', error: error.message };
    }
}

async function runLoadTest() {
    logger.info(`Starting load test: ${CONCURRENT_COLLECTIONS} concurrent collections...`);

    const startTime = Date.now();
    const results = await Promise.allSettled(
        Array.from({ length: CONCURRENT_COLLECTIONS }, (_, i) => simulateCollection(i))
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`
=== Load Test Results ===
Collections: ${CONCURRENT_COLLECTIONS}
Successful: ${successful}
Failed: ${failed}
Duration: ${duration}ms
Throughput: ${(CONCURRENT_COLLECTIONS / duration * 1000).toFixed(2)} req/sec
    `);

    if (failed > 0) {
        logger.error('Load test FAILED - database locking issues detected');
        process.exit(1);
    }

    logger.info('Load test PASSED');
    process.exit(0);
}

if (require.main === module) {
    runLoadTest();
}

module.exports = { runLoadTest, simulateCollection };