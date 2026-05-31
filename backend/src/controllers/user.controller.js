const { z } = require("zod");
const supabase = require("../lib/supabase");

const profileQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    identifier: z.string().min(3).optional()
  })
  .refine((value) => value.userId || value.identifier, {
    message: "userId or identifier is required",
    path: ["userId"]
  });

const normalizeIdentifier = (value) => {
  const trimmed = String(value || "").trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return trimmed;
};
const isEmail = (value) => String(value).includes("@");
const ghanaBankAccountNumberRegex = /^(?:\d{10,13}|\d{16})$/;
const cardNumberRegex = /^(?:\d{13}|\d{15}|\d{16})$/;
const detectCardType = (value) => {
  const normalized = String(value || "").replace(/\D/g, "");
  if (/^4\d{12}(\d{3})?$/.test(normalized)) return "VISA";
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7([01]\d{12}|20\d{12})))$/.test(normalized)) return "MASTERCARD";
  if (/^3[47]\d{13}$/.test(normalized)) return "AMEX";
  if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13})$/.test(normalized)) return "DISCOVER";
  return null;
};
const isValidLuhn = (value) => {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};
const optionalBankAccountSchema = z.preprocess((value) => {
  if (value === null || typeof value === "undefined") return null;
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}, z.union([z.null(), z.string().regex(ghanaBankAccountNumberRegex, "Bank account number must be 10-13 digits or 16 digits")]));
const optionalCardNumberSchema = z.preprocess((value) => {
  if (value === null || typeof value === "undefined") return null;
  const normalized = String(value).trim().replace(/[\s-]/g, "");
  return normalized === "" ? null : normalized;
}, z.union([
  z.null(),
  z
    .string()
    .regex(cardNumberRegex, "Card number must be 13, 15, or 16 digits")
    .refine((value) => Boolean(detectCardType(value)), "Unsupported card type")
    .refine((value) => isValidLuhn(value), "Card number failed checksum validation")
]));

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).optional(),
  momoNumber: z.string().min(6).optional().nullable(),
  bankAccountNumber: optionalBankAccountSchema.optional(),
  bankSortCode: z.string().min(2).max(10).optional().nullable(),
  bankName: z.string().min(2).optional().nullable(),
  cardNumber: optionalCardNumberSchema.optional(),
  houseAddress: z.string().min(2).optional(),
  gpsAddress: z.string().min(2).optional(),
  region: z.string().min(2).optional(),
  hometown: z.string().min(2).optional()
});

class UserController {
  static async getProfile(req, res) {
    try {
      const { userId, identifier } = profileQuerySchema.parse(req.query);

      const selectFields = [
        "id",
        "full_name",
        "email",
        "phone_number",
        "momo_number",
        "bank_account_number",
        "bank_sort_code",
        "bank_name",
        "card_number",
        "house_address",
        "gps_address",
        "region",
        "hometown",
        "passport_picture_url",
        "id_type",
        "id_number",
        "id_card_front_url",
        "id_card_back_url",
        "pin_reset_selfie_url"
      ].join(",");

      let user = null;
      let error = null;

      if (userId) {
        const result = await supabase.from("users").select(selectFields).eq("id", userId).single();
        user = result.data;
        error = result.error;
      }

      if ((!user || error) && identifier) {
        const normalized = normalizeIdentifier(identifier);
        const column = isEmail(normalized) ? "email" : "phone_number";
        const result = await supabase.from("users").select(selectFields).eq(column, normalized).single();
        user = result.data;
        error = result.error;

        if ((!user || error) && column === "email") {
          const retry = await supabase
            .from("users")
            .select(selectFields)
            .ilike("email", normalized)
            .limit(1)
            .maybeSingle();
          user = retry.data;
          error = retry.error;
        }
      }

      if (error || !user) {
        const noRowErrorCodes = new Set(["PGRST116"]);
        if (!user && (!error || noRowErrorCodes.has(String(error.code || "")))) {
          res.status(404).json({ success: false, message: "User not found" });
          return;
        }

        res.status(400).json({ success: false, message: error?.message || "Failed to load profile" });
        return;
      }

      res.json({ success: true, user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
        return;
      }

      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateProfile(req, res) {
    try {
      const parsed = updateProfileSchema.parse(req.body);

      const updates = {
        updated_at: new Date().toISOString()
      };

      if (typeof parsed.fullName === "string") updates.full_name = parsed.fullName;
      if (typeof parsed.momoNumber !== "undefined") updates.momo_number = parsed.momoNumber || null;
      if (typeof parsed.bankAccountNumber !== "undefined") updates.bank_account_number = parsed.bankAccountNumber || null;
      if (typeof parsed.bankSortCode !== "undefined") updates.bank_sort_code = parsed.bankSortCode || null;
      if (typeof parsed.bankName !== "undefined") updates.bank_name = parsed.bankName || null;
      if (typeof parsed.cardNumber !== "undefined") updates.card_number = parsed.cardNumber || null;
      if (typeof parsed.houseAddress === "string") updates.house_address = parsed.houseAddress;
      if (typeof parsed.gpsAddress === "string") updates.gps_address = parsed.gpsAddress;
      if (typeof parsed.region === "string") updates.region = parsed.region;
      if (typeof parsed.hometown === "string") updates.hometown = parsed.hometown;

      const { data: user, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", parsed.userId)
        .select(
          [
            "id",
            "full_name",
            "email",
            "phone_number",
            "momo_number",
            "bank_account_number",
            "bank_sort_code",
            "bank_name",
            "card_number",
            "house_address",
            "gps_address",
            "region",
            "hometown",
            "passport_picture_url",
            "id_type",
            "id_number",
            "id_card_front_url",
            "id_card_back_url",
            "pin_reset_selfie_url"
          ].join(",")
        )
        .single();

      if (error || !user) {
        res.status(400).json({ success: false, message: error?.message || "Update failed" });
        return;
      }

      res.json({ success: true, user, message: "Profile updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
        return;
      }

      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = UserController;
