const supabase = require("../lib/supabase");

const normalizeIdentifier = (identifier) => {
  if (!identifier) return "";
  const raw = String(identifier).trim().toLowerCase();
  if (raw.includes("@")) return raw;
  const phoneParts = raw.replace(/\D/g, "");
  if (phoneParts.length >= 9 && phoneParts.startsWith("233")) {
    return "+" + phoneParts;
  }
  if (phoneParts.length === 9) {
    return "+233" + phoneParts;
  }
  return raw;
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value || "");

const findStaffByIdentifier = async (identifier, selectFields) => {
  const raw = String(identifier || "").trim();
  const normalized = normalizeIdentifier(identifier);
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
  const query = supabase.from("staff_users").select(selectFields);
  if (isEmail(normalized)) {
    return query.eq("email", normalized).single();
  }
  if (isUuidLike) {
    return query.eq("id", raw).single();
  }
  const escapedRaw = raw.replace(/,/g, "\\,");
  return query.or(`phone_number.eq.${escapedRaw},staff_code.ilike.${escapedRaw}`).single();
};

module.exports = { findStaffByIdentifier, normalizeIdentifier };