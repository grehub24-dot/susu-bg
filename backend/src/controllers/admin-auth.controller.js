const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const supabase = require("../lib/supabase");
const WigalService = require("../services/wigal.service");
const ReceiptService = require("../services/receipt.service");
const { createAuthCookie, clearAuthCookie } = require("../lib/cookie");

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z
    .string()
    .min(6)
    .max(128)
});

const verifyOtpSchema = z.object({
  otpSessionToken: z.string().min(20),
  otp: z.preprocess(
    (value) => String(value || "").trim(),
    z.string().regex(/^[0-9]{6}$/)
  )
});

const resendOtpSchema = z.object({
  otpSessionToken: z.string().min(20)
});

const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
const generateToken = () => crypto.randomUUID();
const isEmail = (value) => value.includes("@");
const normalizeIdentifier = (value) => value.trim().toLowerCase();
const OTP_CHARS = "0123456789";

const findAdminByIdentifier = async (identifier, selectFields) => {
  const raw = String(identifier || "").trim();
  const normalized = normalizeIdentifier(identifier);
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
  
  const query = supabase.from("admin_users").select(selectFields);
  if (isEmail(normalized)) {
    return query.eq("email", normalized).single();
  }
  if (isUuidLike) {
    return query.eq("id", raw).single();
  }
  return query.eq("admin_code", raw).single();
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
  crypto.createHash("sha256").update(String(value || "").trim()).digest("hex");

const sendOtpToChannels = async (admin, otpCode) => {
  const deliveries = [];
  
  if (admin.phone_number) {
    deliveries.push(WigalService.sendOTP(admin.phone_number, otpCode));
  }
  
  if (admin.email) {
    const subject = "Susu-BG Admin Login OTP";
    const body = `Hello ${String(admin.full_name || "").trim() || "Admin"},\n\nYour admin login OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please contact support immediately.\n\nSusu-BG`;
    deliveries.push(
      ReceiptService.sendNotificationEmail(admin.email, subject, body, {
        emailType: "ADMIN_LOGIN_OTP"
      })
    );
  }

  await Promise.all(deliveries);
};

const clearOtpFields = {
  otp_code_hash: null,
  otp_expires_at: null,
  otp_session_token: null,
  updated_at: new Date().toISOString()
};

class AdminAuthController {
  static async login(req, res) {
    try {
      const parsed = loginSchema.parse(req.body);
      
      const { data: admin, error } = await findAdminByIdentifier(
        parsed.identifier,
        "id, admin_code, full_name, email, phone_number, password_hash, status, mfa_enabled, locked_until"
      );
      
      if (error || !admin) {
        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      if (String(admin.status || "").toUpperCase() !== "ACTIVE") {
        res.status(403).json({ success: false, message: "Access denied. Admin account is inactive." });
        return;
      }

      if (admin.locked_until && new Date(admin.locked_until).getTime() > Date.now()) {
        res.status(403).json({ 
          success: false, 
          message: "Account is locked. Please try again later or contact support." 
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(parsed.password, String(admin.password_hash || ""));
      
      if (!isValidPassword) {
        const failedAttempts = (admin.failed_login_attempts || 0) + 1;
        const lockUntil = failedAttempts >= 5 ? addMinutes(30) : null;
        
        await supabase
          .from("admin_users")
          .update({
            failed_login_attempts: failedAttempts,
            locked_until: lockUntil,
            updated_at: new Date().toISOString()
          })
          .eq("id", admin.id);

        res.status(401).json({ success: false, message: "Invalid credentials" });
        return;
      }

      const otpSessionToken = generateToken();
      const otpCode = generateOtpCode();
      const otpCodeHash = hashOtpCode(otpCode);

      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          otp_code_hash: otpCodeHash,
          otp_expires_at: addMinutes(10),
          otp_session_token: otpSessionToken,
          failed_login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", admin.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (admin.mfa_enabled) {
        await sendOtpToChannels(admin, otpCode);
      }

      res.json({
        success: true,
        requiresOtp: admin.mfa_enabled,
        otpSessionToken: admin.mfa_enabled ? otpSessionToken : null,
        message: admin.mfa_enabled ? "OTP sent to your phone and email" : "Login successful"
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

  static async verifyOtp(req, res) {
    try {
      const parsed = verifyOtpSchema.parse(req.body);
      
      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("id, admin_code, full_name, email, phone_number, status, otp_code_hash, otp_expires_at, mfa_enabled")
        .eq("otp_session_token", parsed.otpSessionToken)
        .single();

      if (error || !admin) {
        res.status(401).json({ success: false, message: "Invalid or expired session" });
        return;
      }

      if (!admin.otp_expires_at || new Date(admin.otp_expires_at).getTime() < Date.now()) {
        res.status(401).json({ success: false, message: "OTP has expired. Please request a new one." });
        return;
      }

      let isValidOtp = false;
      if (!admin.mfa_enabled) {
        isValidOtp = true;
      } else if (admin.otp_code_hash) {
        isValidOtp = hashOtpCode(parsed.otp) === String(admin.otp_code_hash);
      } else {
        const verifyResult = await WigalService.verifyOTP(admin.phone_number, parsed.otp);
        isValidOtp = String(verifyResult?.status || "").toUpperCase() === "SUCCESS";
      }

      if (!isValidOtp) {
        res.status(401).json({ success: false, message: "Invalid OTP code" });
        return;
      }

      const sessionToken = generateToken();
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({
          ...clearOtpFields,
          session_token: sessionToken,
          session_expires_at: addMinutes(60 * 24),
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", admin.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.setHeader("Set-Cookie", createAuthCookie("admin_session", sessionToken));
      res.json({
        success: true,
        sessionToken,
        user: {
          id: admin.id,
          admin_code: admin.admin_code,
          full_name: admin.full_name,
          email: admin.email,
          phone_number: admin.phone_number
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

  static async resendOtp(req, res) {
    try {
      const parsed = resendOtpSchema.parse(req.body);

      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("id, admin_code, full_name, email, phone_number, mfa_enabled, otp_session_token")
        .eq("otp_session_token", parsed.otpSessionToken)
        .single();

      if (error || !admin) {
        res.status(401).json({ success: false, message: "Invalid session token" });
        return;
      }

      if (!admin.mfa_enabled) {
        res.json({
          success: true,
          requiresOtp: false,
          message: "MFA is disabled for this account"
        });
        return;
      }

      const otpCode = generateOtpCode();
      const otpCodeHash = hashOtpCode(otpCode);

      await supabase
        .from("admin_users")
        .update({
          otp_code_hash: otpCodeHash,
          otp_expires_at: addMinutes(10),
          updated_at: new Date().toISOString()
        })
        .eq("id", admin.id);

      await sendOtpToChannels(admin, otpCode);

      res.json({
        success: true,
        requiresOtp: true,
        message: "New OTP sent to your phone and email"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async verifySession(req, res) {
    try {
      const authHeader = req.header("x-admin-session-token");
      const sessionToken = authHeader || req.query.sessionToken;

      if (!sessionToken) {
        res.status(401).json({ success: false, message: "No session token provided" });
        return;
      }

      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("session_token", sessionToken)
        .single();

      if (error || !admin) {
        res.status(401).json({ success: false, message: "Invalid session token" });
        return;
      }

      if (String(admin.status || "").toUpperCase() !== "ACTIVE") {
        res.status(403).json({ success: false, message: "Access denied. Admin account is inactive." });
        return;
      }

      if (!admin.session_expires_at || new Date(admin.session_expires_at).getTime() < Date.now()) {
        res.status(401).json({ success: false, message: "Session expired" });
        return;
      }

      res.json({
        success: true,
        user: {
          id: admin.id,
          admin_code: admin.admin_code,
          full_name: admin.full_name,
          email: admin.email,
          phone_number: admin.phone_number,
          role: String(admin?.role || "ADMIN").toUpperCase()
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async logout(req, res) {
    try {
      const authHeader = req.header("x-admin-session-token");
      
      if (authHeader) {
        await supabase
          .from("admin_users")
          .update({
            session_token: null,
            session_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq("session_token", authHeader);
      }

      res.setHeader("Set-Cookie", clearAuthCookie("admin_session"));
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = AdminAuthController;