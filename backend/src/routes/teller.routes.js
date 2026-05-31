const express = require("express");
const TellerController = require("../controllers/teller.controller");

const router = express.Router();

// Teller authentication
router.post("/login", TellerController.login);
router.post("/logout", TellerController.logout);
router.get("/session", TellerController.getSession);

// Client lookup
router.get("/client", TellerController.findClient);

// Transaction processing
router.post("/deposit", TellerController.processDeposit);
router.post("/withdrawal", TellerController.processWithdrawal);

// Receipt and reporting
router.get("/receipt", TellerController.generateReceipt);
router.get("/transactions", TellerController.getTransactions);
router.get("/summary", TellerController.getDailySummary);
router.post("/balance", TellerController.updateCashPosition);

module.exports = router;
