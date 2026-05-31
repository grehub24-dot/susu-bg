// Migration script for staff authentication model
// This script does data migration only. Schema DDL must be run in Supabase SQL Editor.
// - Keeps `users` as client-only identities
// - Maps `tellers` records to `staff_users` identities
// - Backfills `tellers.staff_user_id` for teller authentication

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_TELLER_PASSWORD = "admin123";

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const requiredSqlPath = path.resolve(__dirname, "../src/database/staff-auth-migration.sql");
  const requiredSql = fs.existsSync(requiredSqlPath)
    ? fs.readFileSync(requiredSqlPath, "utf8")
    : "-- Missing SQL file: backend/src/database/staff-auth-migration.sql";

  const relationMissing = (error) => {
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("does not exist") ||
      message.includes("could not find the table") ||
      message.includes("schema cache") ||
      String(error?.code || "") === "42P01"
    );
  };

  const columnMissing = (error) =>
    String(error?.message || "").toLowerCase().includes("column") &&
    String(error?.message || "").toLowerCase().includes("does not exist");

  const sanitizeCode = (value) => String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  const normalizeStatus = (value) => {
    const status = String(value || "ACTIVE").toUpperCase();
    return status === "ACTIVE" || status === "INACTIVE" || status === "SUSPENDED" ? status : "ACTIVE";
  };

  const ensureSchemaReady = async () => {
    const { error: staffError } = await supabase.from("staff_users").select("id").limit(1);
    if (staffError && relationMissing(staffError)) {
      throw new Error([
        "Missing `staff_users` table. Apply schema SQL first in Supabase SQL Editor.",
        `SQL file: ${requiredSqlPath}`,
        "",
        requiredSql
      ].join("\n"));
    }
    if (staffError) throw staffError;

    const { error: tellerError } = await supabase.from("tellers").select("id,staff_user_id").limit(1);
    if (tellerError && columnMissing(tellerError)) {
      throw new Error([
        "Missing `tellers.staff_user_id` column. Apply schema SQL first in Supabase SQL Editor.",
        `SQL file: ${requiredSqlPath}`,
        "",
        requiredSql
      ].join("\n"));
    }
    if (tellerError) throw tellerError;
  };

  const getOrCreateTellerStaffUserId = async (teller, passwordHash) => {
    const staffCode = sanitizeCode(teller.teller_code) || `TLR-${String(teller.id).slice(0, 8).toUpperCase()}`;
    const baseEmail = `${staffCode.toLowerCase()}@staff.susu-bg.local`;
    const tellerStatus = normalizeStatus(teller.status);
    const tellerName = String(teller.full_name || "").trim() || `Teller ${staffCode}`;

    const { data: existingByCode, error: byCodeError } = await supabase
      .from("staff_users")
      .select("id")
      .eq("staff_code", staffCode)
      .maybeSingle();
    if (byCodeError) throw byCodeError;
    if (existingByCode?.id) return existingByCode.id;

    const candidateEmails = [baseEmail, `${staffCode.toLowerCase()}-${String(teller.id).slice(0, 6)}@staff.susu-bg.local`];
    for (const candidateEmail of candidateEmails) {
      const { data: created, error: createError } = await supabase
        .from("staff_users")
        .insert({
          staff_code: staffCode,
          full_name: tellerName,
          email: candidateEmail,
          role: "TELLER",
          status: tellerStatus,
          password_hash: passwordHash
        })
        .select("id")
        .single();

      if (!createError && created?.id) return created.id;

      const duplicate = String(createError?.message || "").toLowerCase().includes("duplicate");
      if (!duplicate) throw createError;
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from("staff_users")
      .select("id")
      .eq("staff_code", staffCode)
      .maybeSingle();
    if (fallbackError) throw fallbackError;
    if (!fallback?.id) throw new Error(`Failed to create or resolve staff user for teller code: ${staffCode}`);
    return fallback.id;
  };

  async function migrate() {
    console.log("Starting migration: staff_users and teller-staff mapping");
    await ensureSchemaReady();

    const passwordHash = await bcrypt.hash(DEFAULT_TELLER_PASSWORD, 10);
    const { data: tellers, error: tellersError } = await supabase
      .from("tellers")
      .select("id,teller_code,full_name,status,staff_user_id")
      .order("created_at", { ascending: true });
    if (tellersError) throw tellersError;

    let mappedCount = 0;
    for (const teller of tellers || []) {
      if (teller.staff_user_id) continue;
      const staffUserId = await getOrCreateTellerStaffUserId(teller, passwordHash);
      const { error: updateError } = await supabase
        .from("tellers")
        .update({ staff_user_id: staffUserId })
        .eq("id", teller.id);
      if (updateError) throw updateError;
      mappedCount += 1;
      console.log(`Mapped teller ${teller.teller_code} -> staff user ${staffUserId}`);
    }

    console.log(`Migration completed. ${mappedCount} teller record(s) mapped.`);
    console.log("Clients remain in `users`; backoffice and operations users are in `staff_users`.");
  }

  migrate().catch((error) => {
    console.error("Migration failed:", error.message || error);
    process.exitCode = 1;
  });
}
