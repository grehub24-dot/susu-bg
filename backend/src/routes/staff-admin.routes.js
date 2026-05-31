const express = require("express");
const StaffAdminController = require("../controllers/staff-admin.controller");
const requireAdminSession = require("../middleware/requireAdminSession");

const router = express.Router();

const requireAdminOrManager = (req, res, next) => {
  const role = String(req.adminUser?.role || "").toUpperCase();
  if (role === "ADMIN" || role === "MANAGER") {
    next();
    return;
  }
  res.status(403).json({ success: false, message: "Forbidden: Requires ADMIN or MANAGER role" });
};

router.use(requireAdminSession);

router.get("/staff", StaffAdminController.getAllStaff);
router.get("/staff/stats", StaffAdminController.getStaffStats);
router.post("/staff", requireAdminOrManager, StaffAdminController.createStaff);
router.patch("/staff/:id", requireAdminOrManager, StaffAdminController.updateStaff);
router.delete("/staff/:id", requireAdminOrManager, StaffAdminController.deleteStaff);
router.patch("/staff/:id/status", requireAdminOrManager, StaffAdminController.toggleStatus);
router.patch("/staff/:id/role", requireAdminOrManager, StaffAdminController.changeRole);
router.patch("/staff/:id/lock", requireAdminOrManager, StaffAdminController.lockAccount);
router.patch("/staff/:id/unlock", requireAdminOrManager, StaffAdminController.unlockAccount);
router.get("/staff/:id/sessions", StaffAdminController.getSessionTokens);
router.get("/staff/failed-attempts", StaffAdminController.viewFailedAttempts);
router.get("/sessions", StaffAdminController.getActiveSessions);
router.post("/sessions/:id/revoke", requireAdminOrManager, StaffAdminController.forceLogout);
router.post("/staff/:id/reset-password", requireAdminOrManager, StaffAdminController.resetPassword);
router.get("/staff/:id/audit-logs", StaffAdminController.getAuditLogs);

module.exports = router;