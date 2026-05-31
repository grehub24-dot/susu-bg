const { verifyToken } = require("../services/token.service");

const PRIVILEGED_STAFF_ROLES = new Set([
  "LOAN_OFFICER",
  "SUSU_COLLECTOR",
  "TELLER",
  "SUPERVISOR",
  "MANAGER",
  "ADMIN",
  "AUDITOR"
]);

const hasPermission = (role, action) => {
  const r = String(role || "").toUpperCase();

  const PERMISSIONS = {
    ADMIN: ["ALL"],
    MANAGER: [
      "READ_ALL",
      "TX_CREATE",
      "TX_APPROVE",
      "TX_VIEW",
      "TX_MONITOR",
      "USER_VIEW",
      "USER_MANAGE",
      "STAFF_VIEW",
      "STAFF_MANAGE",
      "SUSU_VIEW",
      "SUSU_MANAGE",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "LEDGER_VIEW",
      "MESSAGE_SEND",
      "SYSTEM_HEALTH_VIEW",
      "SETTINGS_VIEW",
      "SETTINGS_EDIT",
      "COMPLIANCE_VIEW",
      "COMPLIANCE_FLAG"
    ],
    SUPERVISOR: [
      "READ_ALL",
      "TX_CREATE",
      "TX_APPROVE",
      "TX_VIEW",
      "USER_VIEW",
      "USER_MANAGE",
      "STAFF_VIEW",
      "SUSU_VIEW",
      "SUSU_MANAGE",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "SYSTEM_HEALTH_VIEW",
      "COMPLIANCE_VIEW",
      "COMPLIANCE_FLAG"
    ],
    AUDITOR: [
      "READ_ALL",
      "TX_VIEW",
      "USER_VIEW",
      "STAFF_VIEW",
      "SUSU_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "SYSTEM_HEALTH_VIEW",
      "COMPLIANCE_VIEW"
    ],
    LOAN_OFFICER: [
      "TX_CREATE",
      "TX_VIEW",
      "USER_VIEW",
      "LOAN_CREATE",
      "LOAN_VIEW",
      "LOAN_APPROVE",
      "COMPLIANCE_VIEW"
    ],
    TELLER: [
      "TX_CREATE",
      "TX_VIEW",
      "USER_VIEW",
      "RECEIPT_PRINT"
    ],
    SUSU_COLLECTOR: [
      "TX_CREATE",
      "TX_VIEW",
      "USER_VIEW",
      "SUSU_VIEW",
      "SUSU_MANAGE",
      "COLLECTION_CREATE",
      "COLLECTION_VIEW"
    ]
  };

  const rolePerms = PERMISSIONS[r];
  if (!rolePerms) return false;
  return rolePerms.includes("ALL") || rolePerms.includes(action);
};

const requireAdminApiKey = async (req, res, next) => {
  try {
    const adminSessionToken = req.header("x-admin-session-token");

    if (adminSessionToken) {
      try {
        const payload = verifyToken(adminSessionToken);

        if (payload.type !== "staff_access" && payload.type !== "access") {
          res.status(401).json({ success: false, message: "Unauthorized: Invalid token type" });
          return;
        }

        const role = String(payload.role || "").toUpperCase();
        if (!PRIVILEGED_STAFF_ROLES.has(role)) {
          res.status(403).json({ success: false, message: "Forbidden: Staff access only" });
          return;
        }

        req.adminUser = {
          id: payload.userId,
          staff_code: payload.staffCode,
          full_name: payload.fullName,
          email: payload.email,
          phone_number: payload.phoneNumber,
          role: payload.role
        };
        next();
        return;
      } catch (jwtError) {
        if (
          jwtError.name === "TokenExpiredError" ||
          jwtError.name === "JsonWebTokenError" ||
          jwtError.message.includes("expired") ||
          jwtError.message.includes("invalid") ||
          jwtError.message.includes("AUTH_JWT_SECRET")
        ) {
          res.status(401).json({ success: false, message: "Unauthorized: Token invalid or expired" });
          return;
        }
        throw jwtError;
      }
    }

    const expected = String(process.env.ADMIN_API_KEY || "").trim();
    if (expected) {
      const provided = String(req.header("x-admin-key") || "").trim();
      if (provided && provided === expected) {
        req.adminUser = { role: "ADMIN", staff_code: "API_KEY" };
        next();
        return;
      }
    }

    res.status(401).json({ success: false, message: "Unauthorized: No valid authentication provided" });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Admin auth failed" });
  }
};

module.exports = requireAdminApiKey;
module.exports.hasPermission = hasPermission;