const express = require("express");
const AuthController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/verify-registration-otp", AuthController.verifyRegistrationOtp);
router.post("/login", AuthController.login);
router.post("/verify-login-otp", AuthController.verifyLoginOtp);
router.post("/reset-pin", AuthController.resetPin);

module.exports = router;
