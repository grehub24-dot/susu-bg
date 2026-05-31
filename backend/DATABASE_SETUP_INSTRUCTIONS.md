# Database Setup Instructions

Since `psql` is not installed on your system, please use the Supabase Dashboard to apply the system upgrade schema.

## Steps to Apply Database Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Schema**
   - Open the file: `backend/src/database/system-upgrade-schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Execute the Schema**
   - Click "Run" to execute the SQL
   - Wait for completion - this may take a minute

5. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see these new tables:
     - `tellers`
     - `compliance_flags`
     - `branch_accounts`
     - `audit_logs`
     - `receipts`
     - `revenue_ledger`

6. **Verify Table Enhancements**
   - Check that existing tables have new columns:
     - `users` should have: `risk_rating`, `pep_status`
     - `wallets` should have: `daily_limit`, `monthly_limit`, `branch_id`
     - `transactions` should have: `channel`, `teller_id`
     - `susu_groups` should have: `target_market`, `tier`, `liquidity_ratio`
     - `susu_memberships` should have: `guarantor_1_id`, `guarantor_2_id`, `compliance_status`

## Alternative: Apply via Supabase CLI

If you have the Supabase CLI installed, you can run:

```bash
supabase db reset --db-url $DATABASE_URL
```

Then manually apply the schema via the SQL Editor as above.

## Disk Space Issue

The `npm run build` command failed due to insufficient disk space. To fix this:

1. **Clean npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Clear system disk space:**
   - Empty Recycle Bin
   - Delete temporary files: `%TEMP%`
   - Use Disk Cleanup tool

4. **Try build again:**
   ```bash
   npm run build
   ```

## After Database Setup

Once the schema is applied:

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **The frontend is already running** on http://localhost:3000

3. **Test the new features:**
   - Navigate to `/teller` to test the Teller Terminal
   - Navigate to `/admin/tellers` to manage tellers
   - Navigate to `/admin/compliance` to view compliance dashboard

## Environment Variables Required

Make sure these are set in your backend `.env` file:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_API_KEY=your_admin_api_key
NEXT_PUBLIC_ADMIN_API_KEY=your_public_admin_api_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

For payment gateway features (optional):

```
PAYSTACK_SECRET_KEY=your_paystack_key
MTN_MOMO_API_KEY=your_mtn_momo_key
MTN_MOMO_USER_ID=your_mtn_user_id
MTN_MOMO_API_SECRET=your_mtn_secret
```
