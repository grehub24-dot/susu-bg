-- Multi-Level Loan Approval Metadata
-- Add approval workflow fields to existing loans table

ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS approval_level VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;

-- Update function for loan workflow
CREATE OR REPLACE FUNCTION update_loan_status(p_loan_id UUID, p_status VARCHAR(20))
RETURNS void AS $$
BEGIN
    UPDATE loans
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_loan_id;
END;
$$ LANGUAGE plpgsql;

-- Get loans pending review by approval level
CREATE OR REPLACE FUNCTION get_pending_loans(p_approval_level VARCHAR(20))
RETURNS TABLE (
    id UUID,
    user_id UUID,
    amount DECIMAL,
    status VARCHAR(20),
    approval_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.user_id,
        l.amount,
        l.status,
        l.approval_level,
        l.created_at
    FROM loans l
    WHERE l.status = 'UNDER_REVIEW'
    AND l.approval_level = p_approval_level
    ORDER BY l.created_at ASC;
END;
$$ LANGUAGE plpgsql;