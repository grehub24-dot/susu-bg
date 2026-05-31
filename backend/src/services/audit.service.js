const supabase = require("../lib/supabase");
const logger = require("../lib/logger");

const ACTION = {
  STAFF_LOGIN_SUCCESS: "STAFF_LOGIN_SUCCESS",
  STAFF_LOGIN_FAILED: "STAFF_LOGIN_FAILED",
  STAFF_LOGIN_OTP_SENT: "STAFF_LOGIN_OTP_SENT",
  STAFF_LOGIN_OTP_VERIFIED: "STAFF_LOGIN_OTP_VERIFIED",
  STAFF_LOGOUT: "STAFF_LOGOUT",
  STAFF_SESSION_REFRESHED: "STAFF_SESSION_REFRESHED",
  CLIENT_LOGIN_SUCCESS: "CLIENT_LOGIN_SUCCESS",
  CLIENT_LOGIN_FAILED: "CLIENT_LOGIN_FAILED",
  CLIENT_LOGIN_OTP_SENT: "CLIENT_LOGIN_OTP_SENT",
  CLIENT_LOGIN_OTP_VERIFIED: "CLIENT_LOGIN_OTP_VERIFIED",
  CLIENT_LOGOUT: "CLIENT_LOGOUT",
  CLIENT_PIN_RESET: "CLIENT_PIN_RESET",
  CLIENT_REGISTRATION: "CLIENT_REGISTRATION",
  CLIENT_KYC_APPROVED: "CLIENT_KYC_APPROVED",
  CLIENT_KYC_REJECTED: "CLIENT_KYC_REJECTED",
  TRANSACTION_CREATED: "TRANSACTION_CREATED",
  TRANSACTION_APPROVED: "TRANSACTION_APPROVED",
  TRANSACTION_REJECTED: "TRANSACTION_REJECTED",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_SUSPENDED: "USER_SUSPENDED",
  STAFF_CREATED: "STAFF_CREATED",
  STAFF_UPDATED: "STAFF_UPDATED",
  PERMISSION_DENIED: "PERMISSION_DENIED"
};

const logAudit = async ({
  userId = null,
  action,
  entityType = null,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) => {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      action: String(action || "").trim(),
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null
    });

    if (error) {
      logger.error("[AUDIT] Failed to write audit log:", error.message);
    }
  } catch (err) {
    logger.error("[AUDIT] Exception while writing audit log:", err.message);
  }
};

const logStaffLogin = async (staffUser, success, reason, ipAddress, userAgent) => {
  await logAudit({
    userId: staffUser?.id || null,
    action: success ? ACTION.STAFF_LOGIN_SUCCESS : ACTION.STAFF_LOGIN_FAILED,
    entityType: "STAFF_USER",
    entityId: staffUser?.id || null,
    metadata: {
      staff_code: staffUser?.staff_code || null,
      email: staffUser?.email || null,
      role: staffUser?.role || null,
      reason: reason || null
    },
    ipAddress,
    userAgent
  });
};

const logClientLogin = async (user, success, reason, ipAddress, userAgent) => {
  await logAudit({
    userId: user?.id || null,
    action: success ? ACTION.CLIENT_LOGIN_SUCCESS : ACTION.CLIENT_LOGIN_FAILED,
    entityType: "USER",
    entityId: user?.id || null,
    metadata: {
      email: user?.email || null,
      phone_number: user?.phone_number || null,
      reason: reason || null
    },
    ipAddress,
    userAgent
  });
};

const logAuthAction = async (userId, action, ipAddress, userAgent, metadata) => {
  await logAudit({
    userId,
    action,
    ipAddress,
    userAgent,
    metadata
  });
};

module.exports = {
  ACTION,
  logAudit,
  logStaffLogin,
  logClientLogin,
  logAuthAction
};