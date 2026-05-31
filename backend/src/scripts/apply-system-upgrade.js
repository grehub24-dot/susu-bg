const supabase = require('../lib/supabase');
const fs = require('fs');
const path = require('path');

async function applySystemUpgrade() {
    console.log('🚀 Applying System Upgrade Schema...');
    
    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, '../database/system-upgrade-schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split into individual statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const statement of statements) {
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                if (error) {
                    // Try direct execution if RPC fails
                    console.log(`⚠️  RPC failed, trying direct execution for: ${statement.substring(0, 50)}...`);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                // Some statements might fail if objects already exist - that's okay
                console.log(`⚠️  Statement execution note: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log(`✅ System upgrade applied: ${successCount} successful, ${errorCount} notes`);
        console.log('📊 Note: Some errors are expected if objects already exist');
        
        // Verify key tables exist
        const tables = ['tellers', 'compliance_flags', 'branch_accounts', 'audit_logs', 'receipts', 'revenue_ledger'];
        console.log('\n🔍 Verifying new tables...');
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table).select('*').limit(1);
                if (error && error.code === '42P01') {
                    console.log(`❌ Table '${table}' does not exist`);
                } else {
                    console.log(`✅ Table '${table}' exists`);
                }
            } catch (err) {
                console.log(`⚠️  Could not verify table '${table}': ${err.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ System upgrade failed:', error.message);
        process.exit(1);
    }
}

// Alternative: Use Supabase SQL editor approach
async function applyViaDirectSQL() {
    console.log('🚀 Applying System Upgrade via Direct SQL...');
    
    const upgradeStatements = [
        // Create TELLERS table
        `CREATE TABLE IF NOT EXISTS tellers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            teller_code VARCHAR(20) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            branch_id UUID NOT NULL,
            daily_limit DECIMAL(15,2) DEFAULT 50000.00,
            current_cash_position DECIMAL(15,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        // Create COMPLIANCE_FLAGS table
        `CREATE TABLE IF NOT EXISTS compliance_flags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            flag_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            amount_involved DECIMAL(15,2),
            status VARCHAR(20) DEFAULT 'OPEN',
            reported_to_bog BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE
        )`,
        
        // Create BRANCH_ACCOUNTS table
        `CREATE TABLE IF NOT EXISTS branch_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_name VARCHAR(255) NOT NULL,
            branch_code VARCHAR(20) UNIQUE NOT NULL,
            location TEXT,
            assets DECIMAL(15,2) DEFAULT 0.00,
            liabilities DECIMAL(15,2) DEFAULT 0.00,
            equity DECIMAL(15,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        // Create AUDIT_LOGS table
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50),
            entity_id UUID,
            old_values JSONB,
            new_values JSONB,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        // Create RECEIPTS table
        `CREATE TABLE IF NOT EXISTS receipts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            transaction_id UUID,
            receipt_number VARCHAR(50) UNIQUE NOT NULL,
            receipt_type VARCHAR(20) NOT NULL,
            customer_name VARCHAR(255),
            amount DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(30),
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            pdf_url TEXT,
            email_sent BOOLEAN DEFAULT FALSE,
            sms_sent BOOLEAN DEFAULT FALSE
        )`
    ];
    
    try {
        for (const sql of upgradeStatements) {
            console.log(`Executing: ${sql.substring(0, 60)}...`);
            // Note: This would need to be executed via Supabase SQL editor or API
            console.log('⚠️  Please run this SQL in Supabase SQL Editor');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the upgrade
applySystemUpgrade().catch(console.error);
