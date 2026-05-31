// Seed Staff Users Script
// Run this script to create default staff users for all roles in the staff_users table

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exitCode = 1;
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_STAFF_USERS = [
  {
    staff_code: 'ADM-001',
    full_name: 'System Administrator',
    email: 'admin@susu-bg.com',
    phone_number: '+233200000000',
    role: 'ADMIN',
    status: 'ACTIVE'
  },
  {
    staff_code: 'MGR-001',
    full_name: 'Branch Manager',
    email: 'manager@susu-bg.com',
    phone_number: '+233200000001',
    role: 'MANAGER',
    status: 'ACTIVE'
  },
  {
    staff_code: 'SUP-001',
    full_name: 'Operations Supervisor',
    email: 'supervisor@susu-bg.com',
    phone_number: '+233200000002',
    role: 'SUPERVISOR',
    status: 'ACTIVE'
  },
  {
    staff_code: 'TLR-001',
    full_name: 'Main Teller',
    email: 'teller@susu-bg.com',
    phone_number: '+233200000003',
    role: 'TELLER',
    status: 'ACTIVE'
  },
  {
    staff_code: 'SCL-001',
    full_name: 'Susu Collector',
    email: 'collector@susu-bg.com',
    phone_number: '+233200000004',
    role: 'SUSU_COLLECTOR',
    status: 'ACTIVE'
  },
  {
    staff_code: 'LON-001',
    full_name: 'Loan Officer',
    email: 'loanofficer@susu-bg.com',
    phone_number: '+233200000005',
    role: 'LOAN_OFFICER',
    status: 'ACTIVE'
  },
  {
    staff_code: 'AUD-001',
    full_name: 'Internal Auditor',
    email: 'auditor@susu-bg.com',
    phone_number: '+233200000006',
    role: 'AUDITOR',
    status: 'ACTIVE'
  }
];

async function seedStaffUsers() {
  // Quick schema check
  const { error: checkError } = await supabase
    .from('staff_users')
    .select('id')
    .limit(1);

  const relationMissing = String(checkError?.message || "").toLowerCase().includes("could not find the table")
    || String(checkError?.message || "").toLowerCase().includes("schema cache")
    || String(checkError?.message || "").toLowerCase().includes("does not exist");

  if (checkError && relationMissing) {
    throw new Error("`staff_users` table is missing. Run the staff migration SQL in Supabase SQL Editor first.");
  }

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let createdOrUpdated = 0;

  for (const staffUser of DEFAULT_STAFF_USERS) {
    const payload = {
      ...staffUser,
      password_hash: passwordHash
    };

    const { error: upsertError } = await supabase
      .from('staff_users')
      .upsert(payload, { onConflict: 'staff_code' });

    if (upsertError) throw upsertError;
    createdOrUpdated += 1;
  }

  console.log('Staff users seeded successfully.');
  console.log(`  Records processed: ${createdOrUpdated}`);
  console.log(`  Default password: ${DEFAULT_PASSWORD}`);
  console.log('  Seeded roles:', DEFAULT_STAFF_USERS.map((item) => item.role).join(', '));
}

seedStaffUsers()
  .then(() => {
    console.log('Staff user seeding completed');
  })
  .catch((error) => {
    console.error('Error seeding staff users:', error.message || error);
    process.exitCode = 1;
  });
