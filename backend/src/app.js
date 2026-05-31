const express = require("express");
const cors = require("cors");
 const { z } = require("zod");

// Logger
const logger = require("./lib/logger");

// Sentry error tracking (optional - requires SENTRY_DSN env var)
const { initSentry, createTransaction } = require("./lib/sentry");

// Request ID for tracing
const { requestIdMiddleware } = require("./middleware/requestId");

// Rate Limiter
const { authLimiter, otpLimiter, apiLimiter } = require("./middleware/rateLimiter");

// Routes
const authRoutes = require("./routes/auth.routes");
const walletRoutes = require("./routes/wallet.routes");
const transactionRoutes = require("./routes/transaction.routes");
const webhookRoutes = require("./routes/webhook.routes");
const ussdRoutes = require("./routes/ussd.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const tellerRoutes = require("./routes/teller.routes");
const susuRoutes = require("./routes/susu.routes");
const ghanapayRoutes = require("./routes/ghanapay.routes");
const staffRoutes = require("./routes/staff.routes");
const staffAdminRoutes = require("./routes/staff-admin.routes");

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.api(req, res, duration);
  });
  next();
});

// CORS - Restrict to allowed origins
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL || null,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean).join(",");
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || defaultOrigins;
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-session-token", "x-refresh-token", "x-csrf-token", "x-request-id"],
};

app.use(cors(corsOptions));

// Initialize Sentry if DSN is configured
initSentry(app);

// Request ID tracking
app.use(requestIdMiddleware);

// Raw body for webhook signature verification
app.use("/api/webhooks", express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// JSON body parsing (limit configurable for Vercel — Hobby plan max ~4.5mb)
const BODY_LIMIT = process.env.BODY_LIMIT || "50mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

// Input sanitization middleware
const { sanitizeInput } = require("./middleware/sanitize");
app.use(sanitizeInput);

// CSRF protection (disabled for API routes)
const { csrfMiddleware } = require("./middleware/csrf");
app.use(csrfMiddleware);

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Swagger docs (in production)
if (process.env.NODE_ENV !== "test") {
  try {
    const { swaggerSpec } = require("./lib/swagger");
    const swaggerUi = require("swagger-ui-express");

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .wrapper { max-width: 900px; }',
      customsiteTitle: "Susu-BG API Documentation",
    }));

    app.get("/api-docs.json", (req, res) => {
      res.json(swaggerSpec);
    });

    logger.info("Swagger docs available at /api-docs");
  } catch (err) {
    logger.warn("Swagger not available:", err.message);
  }
}

// API Routes with caching for read-only endpoints
const { cacheMiddleware, CACHE_TTL } = require("./middleware/cache");

// Public routes with caching
app.use("/health", cacheMiddleware(CACHE_TTL.SHORT));

// Admin summary endpoints - cache for 30 seconds
app.use("/api/admin/summary", cacheMiddleware(CACHE_TTL.ADMIN_SUMMARY));
app.use("/api/admin/compliance", cacheMiddleware(CACHE_TTL.COMPLIANCE));

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/ussd", ussdRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teller", tellerRoutes);
app.use("/api/susu", susuRoutes);
app.use("/api/ghanapay", ghanapayRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin/staff-management", staffAdminRoutes);

// NEW: Additional admin routes for frontend compatibility
// /api/admin/staff-admin (proxied from /api/admin-proxy/staff-admin)
// This avoids the double "/staff" path segment from staffAdminRoutes.
const requireAdminSession = require("./middleware/requireAdminSession");
const StaffAdminController = require("./controllers/staff-admin.controller");
const staffAdminAliasRouter = require("express").Router();
staffAdminAliasRouter.use(requireAdminSession);

const requireAdminOrManager = (req, res, next) => {
  const role = String(req.adminUser?.role || "").toUpperCase();
  if (role === "ADMIN" || role === "MANAGER") {
    next();
    return;
  }
  res.status(403).json({ success: false, message: "Forbidden: Requires ADMIN or MANAGER role" });
};

staffAdminAliasRouter.get("/stats", StaffAdminController.getStaffStats);
staffAdminAliasRouter.get("/staff", StaffAdminController.getAllStaff);
staffAdminAliasRouter.post("/staff", requireAdminOrManager, StaffAdminController.createStaff);
staffAdminAliasRouter.patch("/staff/:id", requireAdminOrManager, StaffAdminController.updateStaff);
staffAdminAliasRouter.delete("/staff/:id", requireAdminOrManager, StaffAdminController.deleteStaff);
staffAdminAliasRouter.patch("/staff/:id/status", requireAdminOrManager, StaffAdminController.toggleStatus);
staffAdminAliasRouter.patch("/staff/:id/role", requireAdminOrManager, StaffAdminController.changeRole);
staffAdminAliasRouter.patch("/staff/:id/lock", requireAdminOrManager, StaffAdminController.lockAccount);
staffAdminAliasRouter.patch("/staff/:id/unlock", requireAdminOrManager, StaffAdminController.unlockAccount);
staffAdminAliasRouter.get("/staff/:id/sessions", StaffAdminController.getSessionTokens);
staffAdminAliasRouter.get("/staff/failed-attempts", StaffAdminController.viewFailedAttempts);
staffAdminAliasRouter.get("/sessions", StaffAdminController.getActiveSessions);
staffAdminAliasRouter.post("/sessions/:id/revoke", requireAdminOrManager, StaffAdminController.forceLogout);
staffAdminAliasRouter.post("/staff/:id/reset-password", requireAdminOrManager, StaffAdminController.resetPassword);
staffAdminAliasRouter.get("/staff/:id/audit-logs", StaffAdminController.getAuditLogs);
app.use("/api/admin/staff-admin", staffAdminAliasRouter);
// /api/admin/ledger (proxied from /api/admin-proxy/ledger)
const AdminController = require("./controllers/admin.controller");
const ledgerRouter = require("express").Router();
ledgerRouter.use(requireAdminSession);
ledgerRouter.use((req, res, next) => {
  const role = String(req.adminUser?.role || "").toUpperCase();
  if (role === "ADMIN" || role === "MANAGER") {
    next();
    return;
  }
  res.status(403).json({ success: false, message: "Forbidden: Requires ADMIN or MANAGER role" });
});
ledgerRouter.get("/", AdminController.getRevenueLedger);
app.use("/api/admin/ledger", ledgerRouter);

// Error handling middleware
const { errorHandler } = require("./middleware/errorHandler");
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  });

  if (err instanceof z?.ZodError) {
    errorHandler(err, req, res, next);
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

module.exports = app;