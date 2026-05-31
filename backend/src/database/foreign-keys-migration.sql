-- Foreign Key Constraints Migration
-- Add referential integrity to existing tables
-- Run this AFTER ensuring data integrity (no orphaned records)

-- ============================================================
-- WALLLETS - Foreign Keys
-- ============================================================

-- Add FK to users table (cascading delete)
ALTER TABLE wallets 
ADD CONSTRAINT fk_wallets_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add FK to branches table
ALTER TABLE wallets 
ADD CONSTRAINT fk_wallets_branch_id 
FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- ============================================================
-- TRANSACTIONS - Foreign Keys
-- ============================================================

-- Add FK to wallets table
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_wallet_id 
FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

-- Add FK to tellers table (optional - old transactions may not have tellers)
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_teller_id 
FOREIGN KEY (teller_id) REFERENCES tellers(id) ON DELETE SET NULL;

-- ============================================================
-- SUSU_MEMBERSHIPS - Foreign Keys  
-- ============================================================

-- Add FK to users table
ALTER TABLE susu_memberships 
ADD CONSTRAINT fk_memberships_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add FK to susu_groups table
ALTER TABLE susu_memberships 
ADD CONSTRAINT fk_memberships_group_id 
FOREIGN KEY (group_id) REFERENCES susu_groups(id) ON DELETE CASCADE;

-- ============================================================
-- SUSU_CONTRIBUTIONS - Foreign Keys
-- ============================================================

-- Add FK to memberships table
ALTER TABLE susu_contributions 
ADD CONSTRAINT fk_contributions_membership_id 
FOREIGN KEY (membership_id) REFERENCES susu_memberships(id) ON DELETE CASCADE;

-- Add FK to groups table
ALTER TABLE susu_contributions 
ADD CONSTRAINT fk_contributions_group_id 
FOREIGN KEY (group_id) REFERENCES susu_groups(id) ON DELETE CASCADE;

-- Add FK to collectors table (optional)
ALTER TABLE susu_contributions 
ADD CONSTRAINT fk_contributions_collector_id 
FOREIGN KEY (collector_id) REFERENCES staff_users(id) ON DELETE SET NULL;

-- ============================================================
-- SUSU_LOANS - Foreign Keys
-- ============================================================

-- Add FK to memberships table
ALTER TABLE susu_loans 
ADD CONSTRAINT fk_loans_membership_id 
FOREIGN KEY (membership_id) REFERENCES susu_memberships(id) ON DELETE CASCADE;

-- ============================================================
-- SUSU_CYCLES - Foreign Keys
-- ============================================================

-- Add FK to groups table
ALTER TABLE susu_cycles 
ADD CONSTRAINT fk_cycles_group_id 
FOREIGN KEY (group_id) REFERENCES susu_groups(id) ON DELETE CASCADE;

-- ============================================================
-- SUSU_PAYOUTS - Foreign Keys
-- ============================================================

-- Add FK to memberships table
ALTER TABLE susu_payouts 
ADD CONSTRAINT fk_payouts_membership_id 
FOREIGN KEY (membership_id) REFERENCES susu_memberships(id) ON DELETE CASCADE;

-- Add FK to cycles table
ALTER TABLE susu_payouts 
ADD CONSTRAINT fk_payouts_cycle_id 
FOREIGN KEY (cycle_id) REFERENCES susu_cycles(id) ON DELETE CASCADE;

-- ============================================================
-- RECEIPTS - Foreign Keys
-- ============================================================

-- Add FK to transactions table
ALTER TABLE receipts 
ADD CONSTRAINT fk_receipts_transaction_id 
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- ============================================================
-- AUDIT_LOGS - Foreign Keys
-- ============================================================

-- Add FK to users table (optional - can be null for system actions)
ALTER TABLE audit_logs 
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- SMS_LOGS - Foreign Keys
-- ============================================================

-- Add FK to users table (optional)
ALTER TABLE sms_logs 
ADD CONSTRAINT fk_sms_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- COMPLIANCE_FLAGS - Foreign Keys
-- ============================================================

-- Add FK to users table (optional)
ALTER TABLE compliance_flags 
ADD CONSTRAINT fk_compliance_flags_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- Note: Execute this migration with:
-- psql -h your-host -U your-user -d your-database -f foreign-keys-migration.sql
--
-- IMPORTANT: Before running, verify data integrity:
-- 1. No orphaned records (child records without parent)
-- 2. Fix any orphaned data or delete before adding constraints
-- ============================================================