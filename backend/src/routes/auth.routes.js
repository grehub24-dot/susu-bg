const express = require("express");
const AuthController = require("../controllers/auth.controller");
const AdminAuthController = require("../controllers/admin-auth.controller");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");
const { verifyToken } = require("../services/token.service");

const router = express.Router();

const validateClientSessionHandler = async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
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

    if (payload.type !== "client_access") {
      res.status(401).json({ success: false, message: "Invalid token type" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: payload.userId,
        phone: payload.phone,
        email: payload.email
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

router.post("/register", AuthController.register);
router.post("/resend-registration-otp", AuthController.resendRegistrationOtp);
router.post("/verify-registration-otp", AuthController.verifyRegistrationOtp);
router.post("/login", AuthController.login);
router.post("/resend-login-otp", AuthController.resendLoginOtp);
router.post("/verify-login-otp", AuthController.verifyLoginOtp);
router.post("/request-pin-reset-otp", AuthController.requestPinResetOtp);
router.post("/verify-pin-reset-otp", AuthController.verifyPinResetOtp);
router.post("/reset-pin", AuthController.resetPin);
router.post("/logout", AuthController.clientLogout);
router.post("/validate", validateClientSessionHandler);

// Admin login routes with rate limiting
router.post("/admin/login", authLimiter, AdminAuthController.login);
router.post("/admin/verify-otp", otpLimiter, AdminAuthController.verifyOtp);
router.post("/admin/resend-otp", otpLimiter, AdminAuthController.resendOtp);
router.get("/admin/verify-session", AdminAuthController.verifySession);
router.post("/admin/verify-session", AdminAuthController.verifySession);
router.post("/admin/logout", AdminAuthController.logout);

module.exports = router;
