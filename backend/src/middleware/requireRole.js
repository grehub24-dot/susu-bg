const { hasPermission } = require("./requireAdminApiKey");

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      res.status(401).json({ success: false, message: "Unauthorized: No session" });
      return;
    }

    const userRole = String(req.adminUser.role || "").toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      res.status(403).json({ success: false, message: `Forbidden: Requires role [${normalizedAllowed.join(", ")}]` });
      return;
    }

    next();
  };
};

const requirePermission = (...allowedActions) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      res.status(401).json({ success: false, message: "Unauthorized: No session" });
      return;
    }

    const userRole = String(req.adminUser.role || "").toUpperCase();

    for (const action of allowedActions) {
      if (hasPermission(userRole, action)) {
        next();
        return;
      }
    }

    res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
  };
};

module.exports = { requireRole, requirePermission };