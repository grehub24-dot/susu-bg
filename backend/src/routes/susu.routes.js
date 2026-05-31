const express = require("express");
const SusuController = require("../controllers/susu.controller");

const router = express.Router();

// Group Management
router.post("/groups", SusuController.createGroup);
router.get("/groups", SusuController.getGroups);
router.get("/groups/:groupId/summary", SusuController.getGroupSummary);

// Membership Management
router.post("/groups/:groupId/members", SusuController.addMember);
router.get("/groups/:groupId/members", SusuController.getGroupMembers);

// Daily Contributions
router.post("/contributions", SusuController.recordContribution);
router.get("/groups/:groupId/contributions", SusuController.getDailyContributions);

// Loan Management
router.post("/loans/apply", SusuController.applyForLoan);
router.post("/loans/approve", SusuController.approveLoan);
router.post("/loans/disburse", SusuController.disburseLoan);
router.get("/groups/:groupId/loans", SusuController.getGroupLoans);

// Monthly Payouts
router.post("/groups/:groupId/payouts", SusuController.processMonthlyPayouts);
router.get("/groups/:groupId/payouts", SusuController.getPayoutHistory);

// Revenue and Liquidity
router.get("/groups/:groupId/revenue", SusuController.getRevenueSummary);
router.get("/groups/:groupId/liquidity", SusuController.getLiquidityStatus);

// Fee Management
router.post("/fees/sms", SusuController.chargeSMSFee);
router.post("/fees/premature-withdrawal", SusuController.chargePrematureWithdrawalFee);

// Compliance and Reporting
router.get("/groups/:groupId/compliance", SusuController.getMemberCompliance);
router.get("/groups/:groupId/sms-logs", SusuController.getSMSLogs);

// USSD Integration
router.get("/balance", SusuController.checkBalance);

module.exports = router;
