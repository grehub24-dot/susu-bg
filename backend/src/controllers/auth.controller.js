const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const supabase = require("../lib/supabase");
const WigalService = require("../services/wigal.service");
const ReceiptService = require("../services/receipt.service");
const { createAccessToken, createRefreshToken } = require("../services/token.service");
const { createAuthCookie, clearAuthCookie } = require("../lib/cookie");
const { logClientLogin, logAuthAction, ACTION } = require("../services/audit.service");

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
  bankSortCode: z.string().optional(),
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

const adminLoginSchema = z.object({
  identifier: z.string().min(3),
  password: z
    .string()
    .min(6)
    .max(128)
    .regex(/^[A-Za-z0-9!@#$%^&*()_\-+=.?]+$/, "Password contains unsupported characters")
});

const requestPinResetOtpSchema = z.object({
  identifier: z.string().min(3)
});

const verifyPinResetOtpSchema = z.object({
  identifier: z.string().min(3),
  otp: z.preprocess(
    (value) => String(value || "").trim().toUpperCase(),
    z.string().regex(/^[A-Z0-9]{6}$/)
  )
});

const verifyRegistrationOtpSchema = z.object({
  identifier: z.string().min(3),
  otp: z.preprocess(
    (value) => String(value || "").trim().toUpperCase(),
    z.string().regex(/^[A-Z0-9]{6}$/)
  )
});

const verifyLoginOtpSchema = z.object({
  sessionToken: z.string().min(20),
  otp: z.preprocess(
    (value) => String(value || "").trim().toUpperCase(),
    z.string().regex(/^[A-Z0-9]{6}$/)
  )
});

const resendLoginOtpSchema = z.object({
  sessionToken: z.string().min(20)
});

const resendRegistrationOtpSchema = z.object({
  identifier: z.string().min(3)
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
const OTP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const findUserByIdentifier = async (identifier, selectFields) => {
  const normalized = normalizeIdentifier(identifier);
  const column = isEmail(normalized) ? "email" : "phone_number";
  return supabase
    .from("users")
    .select(selectFields)
    .eq(column, normalized)
    .single();
};

const findStaffByIdentifier = async (identifier, selectFields) => {
  const raw = String(identifier || "").trim();
  const normalized = normalizeIdentifier(identifier);
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    raw
  );
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

const markOtpPending = async (userId, purpose, otpCodeHash = null) => {
  const { error } = await supabase
    .from("users")
    .update({
      otp_code_hash: otpCodeHash,
      otp_purpose: purpose,
      otp_expires_at: addMinutes(10),
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

const getOtpContextLabel = (purpose) => {
  if (purpose === "REGISTER") return "account registration";
  if (purpose === "LOGIN") return "login verification";
  if (purpose === "PIN_RESET") return "PIN reset";
  return "verification";
};

const generateOtpCode = () => {
  const length = 6;
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const charIndex = crypto.randomInt(0, OTP_CHARS.length);
    value += OTP_CHARS[charIndex];
  }
  return value;
};

const hashOtpCode = (value) =>
  crypto.createHash("sha256").update(String(value || "").trim().toUpperCase()).digest("hex");

const sendLoginOtpToChannels = async (user, otpCode) => {
  if (!user.phone_number) {
    throw new Error("User phone number is required for OTP delivery");
  }

  const deliveries = [WigalService.sendOTP(user.phone_number, otpCode)];
  if (user.email) {
    const subject = "Susu-BG Login OTP Code";
    const body = `Hello ${String(user.full_name || "").trim() || "Customer"},\n\nYour Susu-BG login OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please contact support immediately.\n\nSusu-BG`;
    deliveries.push(
      ReceiptService.sendNotificationEmail(user.email, subject, body, {
        userId: user.id,
        emailType: "LOGIN_OTP",
        metadata: { purpose: "LOGIN" }
      })
    );
  }

  await Promise.all(deliveries);
};

const requestWigalOtp = async (user, purpose) => {
  if (!user.phone_number) {
    throw new Error("User phone number is required for OTP delivery");
  }
  await WigalService.generateOTP(user.phone_number);
  if (user.email) {
    const contextLabel = getOtpContextLabel(purpose);
    const subject = "Susu-BG OTP Notification";
    const body = `Hello ${String(user.full_name || "").trim() || "Customer"},\n\nAn OTP has been sent to your registered phone number for ${contextLabel}.\n\nIf you did not request this, please contact support immediately.\n\nSusu-BG`;
    await ReceiptService.sendNotificationEmail(user.email, subject, body, {
      userId: user.id,
      emailType: "OTP_NOTIFICATION",
      metadata: { purpose }
    });
  }
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
          bank_sort_code: parsed.bankSortCode || null,
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
      await requestWigalOtp(user, "REGISTER");
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

  static async requestPinResetOtp(req, res) {
    try {
      const parsed = requestPinResetOtpSchema.parse(req.body);
      const { data: user, error } = await findUserByIdentifier(
        parsed.identifier,
        "id, full_name, email, phone_number"
      );

      if (error || !user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      await markOtpPending(user.id, "PIN_RESET");
      await requestWigalOtp(user, "PIN_RESET");

      res.json({
        success: true,
        requiresOtp: true,
        flow: "pin_reset",
        identifier: String(user.email || parsed.identifier).trim().toLowerCase(),
        message: "OTP sent for PIN reset"
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

  static async verifyPinResetOtp(req, res) {
    try {
      const parsed = verifyPinResetOtpSchema.parse(req.body);
      const { data: user, error } = await findUserByIdentifier(
        parsed.identifier,
        "id, full_name, email, phone_number, otp_purpose, otp_expires_at"
      );

      if (error || !user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (user.otp_purpose !== "PIN_RESET") {
        res.status(400).json({ success: false, message: "No PIN reset OTP pending" });
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
          pin_reset_token: resetToken,
          pin_reset_expires_at: addMinutes(15),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ success: false, message: updateError.message });
        return;
      }

      res.json({ success: true, resetToken });
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

  static async resendRegistrationOtp(req, res) {
    try {
      const parsed = resendRegistrationOtpSchema.parse(req.body);
      const { data: user, error } = await findUserByIdentifier(
        parsed.identifier,
        "id, full_name, email, phone_number, otp_verified_at"
      );

      if (error || !user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (user.otp_verified_at) {
        res.status(400).json({ success: false, message: "Registration already verified" });
        return;
      }

      await markOtpPending(user.id, "REGISTER");
      await requestWigalOtp(user, "REGISTER");

      res.json({
        success: true,
        requiresOtp: true,
        flow: "registration",
        identifier: String(user.email || parsed.identifier).trim().toLowerCase(),
        message: "A new OTP has been sent"
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

      const loginOtpCode = generateOtpCode();
      await markOtpPending(user.id, "LOGIN", hashOtpCode(loginOtpCode));
      await sendLoginOtpToChannels(user, loginOtpCode);

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

  static async resendLoginOtp(req, res) {
    try {
      const parsed = resendLoginOtpSchema.parse(req.body);

      const { data: user, error } = await supabase
        .from("users")
        .select(
          "id, full_name, email, phone_number, otp_purpose, login_otp_session_token, login_otp_session_expires_at"
        )
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
        res.status(400).json({ success: false, message: "Session has expired. Please login again." });
        return;
      }

      if (user.otp_purpose !== "LOGIN") {
        res.status(400).json({ success: false, message: "No login OTP pending" });
        return;
      }

      const loginOtpCode = generateOtpCode();
      await markOtpPending(user.id, "LOGIN", hashOtpCode(loginOtpCode));
      await sendLoginOtpToChannels(user, loginOtpCode);

      res.json({
        success: true,
        requiresOtp: true,
        flow: "login",
        sessionToken: parsed.sessionToken,
        message: "A new OTP has been sent"
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

  static async verifyLoginOtp(req, res) {
    try {
      const parsed = verifyLoginOtpSchema.parse(req.body);
      const { data: user, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, otp_code_hash, otp_purpose, otp_expires_at, login_otp_session_expires_at")
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

      let isValidOtp = false;
      if (user.otp_code_hash) {
        isValidOtp = hashOtpCode(parsed.otp) === String(user.otp_code_hash);
      } else {
        const verifyResult = await WigalService.verifyOTP(user.phone_number, parsed.otp);
        isValidOtp = String(verifyResult?.status || "").toUpperCase() === "SUCCESS";
      }

      if (!isValidOtp) {
        res.status(401).json({ success: false, message: "Invalid OTP" });
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          ...clearOtpFields,
          login_otp_session_token: null,
          login_otp_session_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        res.status(400).json({ success: false, message: updateError.message });
        return;
      }

      const accessToken = createAccessToken({
        userId: user.id,
        phone: user.phone_number,
        email: user.email,
        type: "client_access"
      });

      const refreshToken = createRefreshToken({
        userId: user.id,
        type: "client_refresh"
      });

      const { ip, userAgent } = {
        ip: req.header("x-forwarded-for") || req.header("x-real-ip") || null,
        userAgent: req.header("user-agent") || null
      };
      await logClientLogin({ id: user.id, email: user.email, phone_number: user.phone_number }, true, "OTP verified", ip, userAgent);

      res.setHeader("Set-Cookie", [
        createAuthCookie("client_session", accessToken, 24),
        createAuthCookie("client_refresh", refreshToken, 168)
      ]);
      res.json({
        success: true,
        requiresOtp: false,
        flow: "login",
        accessToken,
        refreshToken,
        expiresIn: 900,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number
        }
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

  static async adminLogin(req, res) {
    try {
      const parsed = adminLoginSchema.parse(req.body);
      const { data: staffUser, error } = await findStaffByIdentifier(
        parsed.identifier,
        "id, staff_code, full_name, email, phone_number, password_hash, role, status"
      );

      if (error || !staffUser) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      if (String(staffUser.status || "").toUpperCase() !== "ACTIVE") {
        res.status(403).json({ success: false, message: "Access denied. Staff account is inactive." });
        return;
      }

      const isValidPassword = await bcrypt.compare(parsed.password, String(staffUser.password_hash || ""));
      if (!isValidPassword) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      const adminSessionToken = generateToken();
      const { error: sessionError } = await supabase
        .from("staff_users")
        .update({
          admin_session_token: adminSessionToken,
          admin_session_expires_at: addMinutes(60 * 24), // 24 hours
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", staffUser.id);

      if (sessionError) {
        res.status(400).json({ success: false, message: sessionError.message });
        return;
      }

      res.json({
        success: true,
        requiresOtp: false,
        flow: "admin_login",
        adminSessionToken,
        user: {
          id: staffUser.id,
          staff_code: staffUser.staff_code,
          full_name: staffUser.full_name,
          email: staffUser.email,
          phone_number: staffUser.phone_number,
          role: staffUser.role
        }
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

  static async clientLogout(req, res) {
    try {
      const refreshTokenSchema = z.object({
        refreshToken: z.string().min(1)
      });
      const parsed = refreshTokenSchema.parse(req.body);
      const { ip, userAgent } = {
        ip: req.header("x-forwarded-for") || req.header("x-real-ip") || null,
        userAgent: req.header("user-agent") || null
      };

      if (req.clientUser?.id) {
        await logAuthAction(req.clientUser.id, ACTION.CLIENT_LOGOUT, ip, userAgent, {
          phone: req.clientUser.phone
        });
      }

      res.setHeader("Set-Cookie", clearAuthCookie("client_session"));
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async verifyAdminSession(req, res) {
    try {
      const { adminSessionToken } = req.query;

      if (!adminSessionToken) {
        res.status(401).json({ success: false, message: "No session token provided" });
        return;
      }

      const { data: staffUser, error } = await supabase
        .from("staff_users")
        .select("id, staff_code, full_name, email, phone_number, role, status, admin_session_expires_at")
        .eq("admin_session_token", adminSessionToken)
        .single();

      if (error || !staffUser) {
        res.status(401).json({ success: false, message: "Invalid session token" });
        return;
      }

      if (String(staffUser.status || "").toUpperCase() !== "ACTIVE") {
        res.status(403).json({ success: false, message: "Access denied. Staff account is inactive." });
        return;
      }

      if (
        !staffUser.admin_session_expires_at ||
        new Date(staffUser.admin_session_expires_at).getTime() < Date.now()
      ) {
        res.status(401).json({ success: false, message: "Session expired" });
        return;
      }

      res.json({
        success: true,
        user: {
          id: staffUser.id,
          staff_code: staffUser.staff_code,
          full_name: staffUser.full_name,
          email: staffUser.email,
          phone_number: staffUser.phone_number,
          role: staffUser.role
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = AuthController;
