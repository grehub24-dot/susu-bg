const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const RevenueService = require("../services/revenue.service");
const PaymentService = require("../services/payment.service");
const MaintenanceService = require("../services/maintenance.service");

async function testRevenueSources() {
    console.log("🧪 Testing all revenue sources...\n");

    try {
        // Get a test user and wallet
        const { data: testUser } = await supabase
            .from('users')
            .select('id')
            .limit(1)
            .single();

        if (!testUser) {
            console.log("❌ No test user found. Creating one...");
            const { data: newUser } = await supabase
                .from('users')
                .insert({
                    id: uuidv4(),
                    full_name: 'Test Revenue User',
                    email: 'revenue-test@example.com',
                    phone_number: '+233200000000'
                })
                .select('id')
                .single();

            if (!newUser) throw new Error("Failed to create test user");

            // Create wallet for test user
            await supabase.from('wallets').insert({
                id: uuidv4(),
                user_id: newUser.id,
                balance: 1000.00
            });

            testUser.id = newUser.id;
        }

        const { data: wallet } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', testUser.id)
            .single();

        if (!wallet) throw new Error("No wallet found for test user");

        console.log(`✅ Using test user: ${testUser.id}`);
        console.log(`✅ Using wallet: ${wallet.id}\n`);

        // Test 1: Transaction Fee Revenue
        console.log("1. Testing Transaction Fee Revenue...");
        const txReference = `TEST-TX-${Date.now()}`;
        
        // Create a test transaction
        await supabase.from('transactions').insert({
            id: uuidv4(),
            wallet_id: wallet.id,
            reference: txReference,
            amount: 100,
            type: 'DEPOSIT',
            status: 'SUCCESS',
            metadata: {
                fee_amount: 2.50,
                fee_currency: 'GHS',
                fee_category: 'TRANSACTION_FEE'
            }
        });

        await PaymentService.postTransactionFeeRevenue(txReference);
        console.log("✅ Transaction fee revenue posted\n");

        // Test 2: Loan Interest Revenue
        console.log("2. Testing Loan Interest Revenue...");
        await RevenueService.postLoanInterestRevenue({
            loanId: uuidv4(),
            userId: testUser.id,
            amount: 15.75,
            reference: `TEST-LOAN-INT-${Date.now()}`,
            interestRate: 12.5,
            loanTerm: 6
        });
        console.log("✅ Loan interest revenue posted\n");

        // Test 3: Investment Return Revenue
        console.log("3. Testing Investment Return Revenue...");
        await RevenueService.postInvestmentReturnRevenue({
            investmentId: uuidv4(),
            userId: testUser.id,
            amount: 25.00,
            reference: `TEST-INV-RET-${Date.now()}`,
            returnRate: 8.5,
            investmentType: 'FIXED_DEPOSIT'
        });
        console.log("✅ Investment return revenue posted\n");

        // Test 4: Commission Revenue
        console.log("4. Testing Commission Revenue...");
        await RevenueService.postCommissionRevenue({
            commissionId: uuidv4(),
            userId: testUser.id,
            amount: 10.00,
            reference: `TEST-COMM-${Date.now()}`,
            commissionType: 'REFERRAL',
            commissionSource: 'NEW_USER_SIGNUP'
        });
        console.log("✅ Commission revenue posted\n");

        // Test 5: Penalty Revenue
        console.log("5. Testing Penalty Revenue...");
        await RevenueService.postPenaltyRevenue({
            penaltyId: uuidv4(),
            userId: testUser.id,
            amount: 5.00,
            reference: `TEST-PENALTY-${Date.now()}`,
            penaltyType: 'LATE_PAYMENT',
            penaltyReason: 'Loan repayment overdue by 15 days'
        });
        console.log("✅ Penalty revenue posted\n");

        // Test 6: Maintenance Revenue
        console.log("6. Testing Maintenance Revenue...");
        await RevenueService.postMaintenanceRevenue({
            maintenanceId: uuidv4(),
            userId: testUser.id,
            amount: 3.00,
            reference: `TEST-MAINT-${Date.now()}`,
            maintenanceType: 'MONTHLY_ACCOUNT_FEE',
            billingPeriod: '2025-01'
        });
        console.log("✅ Maintenance revenue posted\n");

        // Verify all entries in revenue_ledger
        console.log("7. Verifying all revenue entries...");
        const { data: revenueEntries, error } = await supabase
            .from('revenue_ledger')
            .select('*')
            .like('reference', 'TEST-%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ Found ${revenueEntries.length} test revenue entries:`);
        revenueEntries.forEach(entry => {
            console.log(`   - ${entry.category}: GHS ${entry.amount} (${entry.reference})`);
        });

        // Test admin dashboard aggregation
        console.log("\n8. Testing admin dashboard aggregation...");
        const { data: summary } = await supabase.rpc('get_financial_summary');
        
        if (summary) {
            console.log("✅ Admin dashboard summary:");
            console.log(`   - Total Revenue: GHS ${summary.total_revenue || 0}`);
            console.log(`   - Transaction Fees: GHS ${summary.transaction_fees || 0}`);
            console.log(`   - Loan Interest: GHS ${summary.loan_interest || 0}`);
            console.log(`   - Investment Returns: GHS ${summary.investment_returns || 0}`);
            console.log(`   - Commissions: GHS ${summary.commissions || 0}`);
            console.log(`   - Penalties: GHS ${summary.penalties || 0}`);
            console.log(`   - Maintenance: GHS ${summary.maintenance || 0}`);
        }

        console.log("\n🎉 All revenue source tests completed successfully!");
        console.log("💡 Check your admin dashboard to see the revenue data in action.");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    testRevenueSources()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { testRevenueSources };
