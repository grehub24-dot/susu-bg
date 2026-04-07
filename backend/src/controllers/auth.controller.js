const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const supabase = require("../lib/supabase");
const WigalService = require("../services/wigal.service");

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10).max(15),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pin: z.string().regex(/^\d{4,6}$/),
  momoNumber: z.string().optional(),
  bankAccountNumber: z
    .preprocess(normalizeDigits, z.string())
    .optional()
    .refine((value) => !value || /^\d{13}$/.test(value) || /^\d{16}$/.test(value), {
      message: "Bank account numbers must be 13 digits (universal banks) or 16 digits (rural banks)."
    }),
  bankName: z.string().optional(),
  cardNumber: z
    .preprocess(normalizeDigits, z.string())
    .optional()
    .refine((value) => !value || /^\d{13,19}$/.test(value), {
      message: "Card numbers must be 13 to 19 digits."
    }),
  houseAddress: z.string().min(2),
  gpsAddress: z.string().min(2),
  cityTown: z.string().min(2),
  hometown: z.string().min(2),
  passportPicture: z.string().startsWith("data:image/"),
  idType: z.string().min(2),
  idNumber: z.string().min(2),
  idCardFront: z.string().startsWith("data:image/"),
  idCardBack: z.string().startsWith("data:image/")
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  pin: z.string().regex(/^\d{4,6}$/)
});

const verifyRegistrationOtpSchema = z.object({
  identifier: z.string().min(3),
  otp: z.string().regex(/^\d{6}$/)
});

const verifyLoginOtpSchema = z.object({
  sessionToken: z.string().min(20),
  otp: z.string().regex(/^\d{6}$/)
});

const resetPinSchema = z.object({
  resetToken: z.string().min(20),
  newPin: z.string().regex(/^\d{4,6}$/),
  selfieImageDataUrl: z.string().startsWith("data:image/")
});

const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
const generateToken = () => crypto.randomUUID();
const isEmail = (value) => value.includes("@");
const normalizeIdentifier = (value) => value.trim().toLowerCase();

const findUserByIdentifier = async (identifier, selectFields) => {
  const normalized = normalizeIdentifier(identifier);
  const column = isEmail(normalized) ? "email" : "phone_number";
  return supabase
    .from("users")
    .select(selectFields)
    .eq(column, normalized)
    .single();
};

const markOtpPending = async (userId, purpose) => {
  const { error } = await supabase
    .from("users")
    .update({
      otp_code_hash: null,
      otp_purpose: purpose,
      otp_expires_at: addMinutes(10),
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

const requestWigalOtp = async (user) => {
  if (!user.phone_number) {
    throw new Error("User phone number is required for OTP delivery");
  }
  await WigalService.generateOTP(user.phone_number);
};

const clearOtpFields = {
  otp_code_hash: null,
  otp_purpose: null,
  otp_expires_at: null,
  updated_at: new Date().toISOString()
};

const uploadBase64Image = async (base64Str, folderPath) => {
  if (!base64Str) return null;
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const buffer = Buffer.from(matches[2], 'base64');
  const fileName = `${folderPath}/${crypto.randomUUID()}`;
  await supabase.ensureBucketExists('susu-documents', { public: true });
  const { error } = await supabase.storage
    .from('susu-documents')
    .upload(fileName, buffer, { contentType: matches[1], upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: publicUrlData } = supabase.storage.from('susu-documents').getPublicUrl(fileName);
  return publicUrlData.publicUrl;
};

class AuthController {
  static async register(req, res) {
    try {
      const parsed = registerSchema.parse(req.body);
      const normalizedEmail = parsed.email.trim().toLowerCase();
      const normalizedPhone = parsed.phoneNumber.trim();
      const pinHash = await bcrypt.hash(parsed.pin, 12);

      const passportUrl = await uploadBase64Image(parsed.passportPicture, 'kyc/passports');
      const idCardFrontUrl = await uploadBase64Image(parsed.idCardFront, 'kyc/cards');
      const idCardBackUrl = await uploadBase64Image(parsed.idCardBack, 'kyc/cards');

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          full_name: parsed.fullName,
          email: normalizedEmail,
          phone_number: normalizedPhone,
          date_of_birth: parsed.dateOfBirth,
          pin_hash: pinHash,
          momo_number: parsed.momoNumber || null,
          bank_account_number: parsed.bankAccountNumber || null,
          bank_name: parsed.bankName || null,
          card_number: parsed.cardNumber || null,
          house_address: parsed.houseAddress,
          gps_address: parsed.gpsAddress,
          region: parsed.cityTown,
          hometown: parsed.hometown,
          passport_picture_url: passportUrl,
          id_type: parsed.idType,
          id_number: parsed.idNumber,
          id_card_front_url: idCardFrontUrl,
          id_card_back_url: idCardBackUrl
        })
        .select("id, full_name, email, phone_number")
        .single();

      if (userError) {
        res.status(400).json({ success: false, message: userError.message });
        return;
      }

      const { error: walletError } = await supabase.from("wallets").insert({
        user_id: user.id,
        balance: 0
      });

      if (walletError) {
        res.status(400).json({ success: false, message: walletError.message });
        return;
      }

      await markOtpPending(user.id, "REGISTER");
      await requestWigalOtp(user);
      res.status(201).json({
        success: true,
        requiresOtp: true,
        flow: "registration",
        identifier: normalizedEmail
      });
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

  static async verifyRegistrationOtp(req, res) {
    try {
      const parsed = verifyRegistrationOtpSchema.parse(req.body);
      const { data: user, error } = await findUserByIdentifier(
        parsed.identifier,
        "id, phone_number, otp_purpose, otp_expires_at"
      );

      if (error || !user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (user.otp_purpose !== "REGISTER") {
        res.status(400).json({ success: false, message: "No registration OTP pending" });
        return;
      }

      if (!user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
        res.status(400).json({ success: false, message: "OTP has expired" });
        return;
      }

      const verifyResult = await WigalService.verifyOTP(user.phone_number, parsed.otp);
      if (String(verifyResult?.status || "").toUpperCase() !== "SUCCESS") {
        res.status(401).json({ success: false, message: "Invalid OTP" });
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          ...clearOtpFields,
          otp_verified_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ success: false, message: updateError.message });
        return;
      }

      res.json({ success: true, message: "Registration verified. You can login now." });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async login(req, res) {
    try {
      const parsed = loginSchema.parse(req.body);
      const { data: user, error } = await findUserByIdentifier(
        parsed.identifier,
        "id, full_name, email, phone_number, pin_hash, otp_verified_at"
      );

      if (error || !user) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      const isValidPin = await bcrypt.compare(parsed.pin, user.pin_hash);
      if (!isValidPin) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      if (!user.otp_verified_at) {
        res.status(403).json({ success: false, message: "Complete registration OTP verification first" });
        return;
      }

      await markOtpPending(user.id, "LOGIN");
      await requestWigalOtp(user);

      const sessionToken = generateToken();
      const { error: sessionError } = await supabase
        .from("users")
        .update({
          login_otp_session_token: sessionToken,
          login_otp_session_expires_at: addMinutes(10),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (sessionError) {
        res.status(400).json({ success: false, message: sessionError.message });
        return;
      }

      res.json({
        success: true,
        requiresOtp: true,
        flow: "login",
        sessionToken
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async verifyLoginOtp(req, res) {
    try {
      const parsed = verifyLoginOtpSchema.parse(req.body);
      const { data: user, error } = await supabase
        .from("users")
        .select("id, phone_number, otp_purpose, otp_expires_at, login_otp_session_expires_at")
        .eq("login_otp_session_token", parsed.sessionToken)
        .single();

      if (error || !user) {
        res.status(401).json({ success: false, message: "Invalid session token" });
        return;
      }

      if (
        !user.login_otp_session_expires_at ||
        new Date(user.login_otp_session_expires_at).getTime() < Date.now()
      ) {
        res.status(401).json({ success: false, message: "Login session expired" });
        return;
      }

      if (user.otp_purpose !== "LOGIN") {
        res.status(400).json({ success: false, message: "No login OTP pending" });
        return;
      }

      if (!user.otp_expires_at || new Date(user.otp_expires_at).getTime() < Date.now()) {
        res.status(400).json({ success: false, message: "OTP has expired" });
        return;
      }

      const verifyResult = await WigalService.verifyOTP(user.phone_number, parsed.otp);
      if (String(verifyResult?.status || "").toUpperCase() !== "SUCCESS") {
        res.status(401).json({ success: false, message: "Invalid OTP" });
        return;
      }

      const resetToken = generateToken();
      const { error: updateError } = await supabase
        .from("users")
        .update({
          ...clearOtpFields,
          login_otp_session_token: null,
          login_otp_session_expires_at: null,
          pin_reset_token: resetToken,
          pin_reset_expires_at: addMinutes(15),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ success: false, message: updateError.message });
        return;
      }

      res.json({ success: true, requiresPinReset: true, resetToken });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async resetPin(req, res) {
    try {
      const parsed = resetPinSchema.parse(req.body);
      const { data: user, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, pin_reset_expires_at")
        .eq("pin_reset_token", parsed.resetToken)
        .single();

      if (error || !user) {
        res.status(401).json({ success: false, message: "Invalid reset token" });
        return;
      }

      if (!user.pin_reset_expires_at || new Date(user.pin_reset_expires_at).getTime() < Date.now()) {
        res.status(401).json({ success: false, message: "Reset token expired" });
        return;
      }

      const pinHash = await bcrypt.hash(parsed.newPin, 12);
      const { error: updateError } = await supabase
        .from("users")
        .update({
          pin_hash: pinHash,
          pin_reset_token: null,
          pin_reset_expires_at: null,
          pin_reset_selfie_url: parsed.selfieImageDataUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ success: false, message: updateError.message });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = AuthController;
