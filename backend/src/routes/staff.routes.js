const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const supabase = require("../lib/supabase");
const generateToken = () => crypto.randomUUID();
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
const { findStaffByIdentifier } = require("../services/staff.service");
const { createAccessToken, createRefreshToken, verifyToken } = require("../services/token.service");
const { logStaffLogin, logAuthAction, ACTION } = require("../services/audit.service");
const requireAdminApiKey = require("../middleware/requireAdminApiKey");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");
const { createAuthCookie, clearAuthCookie } = require("../lib/cookie");
const logger = require("../lib/logger");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const OTP_TTL_MINUTES = 10;

const staffLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

const staffVerifyOtpSchema = z.object({
  otpSessionToken: z.string().min(1, "OTP session token is required"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits")
});

const staffRefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

const createStaffSchema = z.object({
  staff_code: z.string().min(1, "Staff code is required"),
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone_number: z.string().optional(),
  role: z.enum(["LOAN_OFFICER", "SUSU_COLLECTOR", "TELLER", "SUPERVISOR", "MANAGER", "ADMIN", "AUDITOR"]),
  password: z.string().min(1, "Password is required")
});

const updateStaffSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  role: z.enum(["LOAN_OFFICER", "SUSU_COLLECTOR", "TELLER", "SUPERVISOR", "MANAGER", "ADMIN", "AUDITOR"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  password: z.string().optional()
});

const ALL_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'TELLER', 'LOAN_OFFICER', 'SUSU_COLLECTOR', 'AUDITOR'];

const getStaffRoles = (role) => {
  if (role === 'ADMIN') {
    return ALL_ROLES;
  }
  return role ? [role] : [];
};

const seedStaffData = [
  { staff_code: "ADM-001", full_name: "System Admin", email: "admin@susu-bg.com", phone_number: "+233501234567", role: "ADMIN" },
  { staff_code: "MGR-001", full_name: "Branch Manager", email: "manager@susu-bg.com", phone_number: "+233501234568", role: "MANAGER" },
  { staff_code: "SUP-001", full_name: "Office Supervisor", email: "supervisor@susu-bg.com", phone_number: "+233501234569", role: "SUPERVISOR" },
  { staff_code: "TLR-001", full_name: "Front Desk Teller", email: "teller@susu-bg.com", phone_number: "+233501234570", role: "TELLER" },
  { staff_code: "TLR-002", full_name: "Cash Teller", email: "teller2@susu-bg.com", phone_number: "+233501234571", role: "TELLER" },
  { staff_code: "LOAN-001", full_name: "Loan Officer", email: "loan@susu-bg.com", phone_number: "+233501234572", role: "LOAN_OFFICER" },
  { staff_code: "COLL-001", full_name: "Susu Collector", email: "collector@susu-bg.com", phone_number: "+233501234573", role: "SUSU_COLLECTOR" },
  { staff_code: "AUD-001", full_name: "Internal Auditor", email: "auditor@susu-bg.com", phone_number: "+233501234574", role: "AUDITOR" }
];

const hashOtp = (otp) => bcrypt.hash( String(otp).trim(), 8 );
const verifyOtpHash = (otp, hash) => bcrypt.compare( String(otp).trim(), hash );

const getClientInfo = (req) => ({
  ip: req.header("x-forwarded-for") || req.header("x-real-ip") || req.socket?.remoteAddress || null,
  userAgent: req.header("user-agent") || null
});

const staffLoginHandler = async (req, res) => {
  try {
    const parsed = staffLoginSchema.parse(req.body);
    const { ip, userAgent } = getClientInfo(req);

    const { data: staffUser, error } = await findStaffByIdentifier(
      parsed.email,
      "id, staff_code, full_name, email, phone_number, password_hash, role, status, mfa_enabled, locked_until, failed_login_attempts"
    );

    if (error || !staffUser) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    if (String(staffUser.status || "").toUpperCase() !== "ACTIVE") {
      res.status(403).json({ success: false, message: "Access denied. Staff account is inactive." });
      return;
    }

    if (staffUser.locked_until && new Date(staffUser.locked_until).getTime() > Date.now()) {
      res.status(403).json({ success: false, message: "Account locked. Too many failed login attempts. Try again later." });
      return;
    }

    const isValidPassword = await bcrypt.compare(parsed.password, String(staffUser.password_hash || ""));
    if (!isValidPassword) {
      const newAttempts = (staffUser.failed_login_attempts || 0) + 1;
      const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS ? addMinutes(LOCKOUT_MINUTES) : null;

      await supabase
        .from("staff_users")
        .update({
          failed_login_attempts: newAttempts,
          locked_until: lockUntil,
          updated_at: new Date().toISOString()
        })
        .eq("id", staffUser.id);

      await logStaffLogin(staffUser, false, `Invalid password. Attempt ${newAttempts}/${MAX_LOGIN_ATTEMPTS}`, ip, userAgent);

      if (lockUntil) {
        res.status(403).json({ success: false, message: "Too many failed attempts. Account locked for 30 minutes." });
        return;
      }

      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    await supabase
      .from("staff_users")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", staffUser.id);

    if (staffUser.mfa_enabled && staffUser.phone_number) {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = await hashOtp(otpCode);
      const otpSessionToken = generateToken();
      const expiresAt = addMinutes(OTP_TTL_MINUTES);

      await supabase
        .from("staff_users")
        .update({
          otp_code_hash: otpHash,
          otp_expires_at: expiresAt,
          otp_session_token: otpSessionToken,
          updated_at: new Date().toISOString()
        })
        .eq("id", staffUser.id);

      try {
        const { sendSMS } = require("../services/wigal.service");
        if (sendSMS) {
          await sendSMS(staffUser.phone_number, `Your Susu-BG OTP is: ${otpCode}. It expires in ${OTP_TTL_MINUTES} minutes.`);
        }
      } catch (smsErr) {
        logger.error("[STAFF LOGIN] Failed to send OTP SMS:", smsErr.message);
      }

      await logStaffLogin(staffUser, true, "OTP sent", ip, userAgent);

      res.json({
        success: true,
        requiresOtp: true,
        flow: "staff-login",
        otpSessionToken,
        message: `OTP sent to ${staffUser.phone_number ? "your registered phone" : "your email"}`
      });
return;
    }

    const accessToken = createAccessToken({
      userId: staffUser.id,
      staffCode: staffUser.staff_code,
      fullName: staffUser.full_name,
      email: staffUser.email,
      phoneNumber: staffUser.phone_number,
      role: staffUser.role,
      roles: getStaffRoles(staffUser.role),
      type: "staff_access"
    });

    const refreshToken = createRefreshToken({
      userId: staffUser.id,
      type: "staff_refresh"
    });

    await supabase.from("staff_sessions").insert({
      id: crypto.randomUUID(),
      staff_user_id: staffUser.id,
      refresh_token_hash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: addMinutes(60 * 24 * 7)
    });

    await logStaffLogin(staffUser, true, "Direct login (MFA disabled)", ip, userAgent);

    res.setHeader("Set-Cookie", createAuthCookie("staff_session", accessToken));

    res.json({
      success: true,
      requiresOtp: false,
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: staffUser.id,
        staff_code: staffUser.staff_code,
        full_name: staffUser.full_name,
        email: staffUser.email,
        phone_number: staffUser.phone_number,
        role: staffUser.role
      },
      roles: getStaffRoles(staffUser.role)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

const staffVerifyOtpHandler = async (req, res) => {
  try {
    const parsed = staffVerifyOtpSchema.parse(req.body);
    const { ip, userAgent } = getClientInfo(req);

    const { data: staffUser, error } = await supabase
      .from("staff_users")
      .select("id, staff_code, full_name, email, phone_number, role, status, otp_code_hash, otp_expires_at, otp_session_token")
      .eq("otp_session_token", parsed.otpSessionToken)
      .single();

    if (error || !staffUser) {
      res.status(401).json({ success: false, message: "Invalid or expired OTP session" });
      return;
    }

    if (String(staffUser.status || "").toUpperCase() !== "ACTIVE") {
      res.status(403).json({ success: false, message: "Access denied. Staff account is inactive." });
      return;
    }

    if (!staffUser.otp_expires_at || new Date(staffUser.otp_expires_at).getTime() < Date.now()) {
      res.status(401).json({ success: false, message: "OTP has expired. Please login again." });
      return;
    }

    const isValidOtp = await verifyOtpHash(parsed.otp, String(staffUser.otp_code_hash || ""));
    if (!isValidOtp) {
      res.status(401).json({ success: false, message: "Invalid OTP" });
      return;
    }

    await supabase
      .from("staff_users")
      .update({
        otp_code_hash: null,
        otp_expires_at: null,
        otp_session_token: null,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", staffUser.id);

    const accessToken = createAccessToken({
      userId: staffUser.id,
      staffCode: staffUser.staff_code,
      fullName: staffUser.full_name,
      email: staffUser.email,
      phoneNumber: staffUser.phone_number,
      role: staffUser.role,
      roles: getStaffRoles(staffUser.role),
      type: "staff_access"
    });

    const refreshToken = createRefreshToken({
      userId: staffUser.id,
      type: "staff_refresh"
    });

    await supabase.from("staff_sessions").insert({
      id: crypto.randomUUID(),
      staff_user_id: staffUser.id,
      refresh_token_hash: crypto.createHash("sha256").update(refreshToken).digest("hex"),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: addMinutes(60 * 24 * 7)
    });

    await logAuthAction(staffUser.id, ACTION.STAFF_LOGIN_OTP_VERIFIED, ip, userAgent, {
      staff_code: staffUser.staff_code
    });

    res.setHeader("Set-Cookie", createAuthCookie("staff_session", accessToken));
    res.json({
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: staffUser.id,
        staff_code: staffUser.staff_code,
        full_name: staffUser.full_name,
        email: staffUser.email,
        phone_number: staffUser.phone_number,
        role: staffUser.role
      },
      roles: getStaffRoles(staffUser.role)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

const staffLogoutHandler = async (req, res) => {
  try {
    const refreshToken = req.header("x-refresh-token");
    const { ip, userAgent } = getClientInfo(req);

    if (refreshToken) {
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      await supabase
        .from("staff_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("refresh_token_hash", tokenHash)
        .is("revoked_at", null);
    }

    if (req.adminUser?.id) {
      await logAuthAction(req.adminUser.id, ACTION.STAFF_LOGOUT, ip, userAgent, {
        staff_code: req.adminUser.staff_code
      });
    }

    res.setHeader("Set-Cookie", clearAuthCookie("staff_session"));
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const staffRefreshHandler = async (req, res) => {
  try {
    const parsed = staffRefreshSchema.parse(req.body);
    const { ip, userAgent } = getClientInfo(req);

    let payload;
    try {
      payload = verifyToken(parsed.refreshToken);
    } catch {
      res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
      return;
    }

    if (payload.type !== "staff_refresh") {
      res.status(401).json({ success: false, message: "Invalid token type" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(parsed.refreshToken).digest("hex");
    const { data: session } = await supabase
      .from("staff_sessions")
      .select("id, staff_user_id, expires_at, revoked_at")
      .eq("refresh_token_hash", tokenHash)
      .is("revoked_at", null)
      .single();

    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      res.status(401).json({ success: false, message: "Session expired or revoked" });
      return;
    }

    const { data: staffUser } = await supabase
      .from("staff_users")
      .select("id, staff_code, full_name, email, phone_number, role, status")
      .eq("id", payload.userId)
      .single();

    if (!staffUser || String(staffUser.status || "").toUpperCase() !== "ACTIVE") {
      res.status(403).json({ success: false, message: "Account inactive" });
      return;
    }

    const accessToken = createAccessToken({
      userId: staffUser.id,
      staffCode: staffUser.staff_code,
      fullName: staffUser.full_name,
      email: staffUser.email,
      phoneNumber: staffUser.phone_number,
      role: staffUser.role,
      roles: getStaffRoles(staffUser.role),
      type: "staff_access"
    });

    await logAuthAction(staffUser.id, ACTION.STAFF_SESSION_REFRESHED, ip, userAgent, {
      staff_code: staffUser.staff_code
    });

    res.json({
      success: true,
      accessToken,
      expiresIn: 900,
      user: {
        id: staffUser.id,
        staff_code: staffUser.staff_code,
        full_name: staffUser.full_name,
        email: staffUser.email,
        phone_number: staffUser.phone_number,
        role: staffUser.role
      },
      roles: getStaffRoles(staffUser.role)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

const listStaffHandler = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const { data: staff, error } = await supabase
      .from("staff_users")
      .select("id, staff_code, full_name, email, phone_number, role, status, last_login_at, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ success: true, staff: staff || [] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createStaffHandler = async (req, res) => {
  try {
    const parsed = createStaffSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const { data: existing } = await supabase
      .from("staff_users")
      .select("id")
      .eq("staff_code", parsed.staff_code)
      .single();

    if (existing) {
      res.status(400).json({ success: false, message: "Staff code already exists" });
      return;
    }

    const { data: staff, error } = await supabase
      .from("staff_users")
      .insert({
        staff_code: parsed.staff_code,
        full_name: parsed.full_name,
        email: parsed.email,
        phone_number: parsed.phone_number || null,
        role: parsed.role,
        password_hash: passwordHash,
        status: "ACTIVE"
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, staff });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateStaffHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateStaffSchema.parse(req.body);

    const updateData = { ...parsed, updated_at: new Date().toISOString() };

    if (parsed.password) {
      updateData.password_hash = await bcrypt.hash(parsed.password, 10);
      delete updateData.password;
    }

    const { data: staff, error } = await supabase
      .from("staff_users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, staff });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Validation failed", issues: error.issues });
      return;
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteStaffHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("staff_users")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const validateSessionHandler = async (req, res) => {
  try {
    const token = req.header("x-admin-session-token");
    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (jwtError) {
      res.status(401).json({ success: false, message: "Invalid or expired session" });
      return;
    }

    if (payload.type !== "staff_access") {
      res.status(401).json({ success: false, message: "Invalid token type" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: payload.userId,
        staff_code: payload.staffCode,
        full_name: payload.fullName,
        email: payload.email,
        phone_number: payload.phoneNumber,
        role: payload.role
      },
      roles: payload.roles || getStaffRoles(payload.role)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const seedStaffHandler = async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash("admin123", 10);
    const results = [];

    for (const staff of seedStaffData) {
      const { data: existing } = await supabase
        .from("staff_users")
        .select("id")
        .eq("staff_code", staff.staff_code)
        .single();

      if (existing) {
        results.push({ code: staff.staff_code, status: "exists" });
        continue;
      }

      const { data, error } = await supabase
        .from("staff_users")
        .insert({
          staff_code: staff.staff_code,
          full_name: staff.full_name,
          email: staff.email,
          phone_number: staff.phone_number,
          role: staff.role,
          password_hash: passwordHash,
          status: "ACTIVE"
        })
        .select()
        .single();

      if (error) {
        results.push({ code: staff.staff_code, status: "error", message: error.message });
      } else {
        results.push({ code: staff.staff_code, status: "created" });
      }
    }

    res.json({ success: true, message: "Staff seeding complete", results });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

router.post("/login", authLimiter, staffLoginHandler);
router.post("/verify-otp", otpLimiter, staffVerifyOtpHandler);
router.post("/logout", staffLogoutHandler);
router.post("/refresh", staffRefreshHandler);
router.post("/validate", validateSessionHandler);
router.get("/session", validateSessionHandler);  // NEW: GET session from cookie
router.get("/", requireAdminApiKey, listStaffHandler);
router.post("/", requireAdminApiKey, createStaffHandler);
router.put("/:id", requireAdminApiKey, updateStaffHandler);
router.delete("/:id", requireAdminApiKey, deleteStaffHandler);
router.post("/seed", seedStaffHandler);

module.exports = router;