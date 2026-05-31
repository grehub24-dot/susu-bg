const express = require("express");
const AdminController = require("../controllers/admin.controller");
const requireAdminSession = require("../middleware/requireAdminSession");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

router.use(requireAdminSession);

// RBAC policy (admin portal)
// - ADMIN: everything
// - MANAGER: everything
// - SUPERVISOR: read-only + compliance flagging/report/resolve
// - AUDITOR: strict read-only (no mutations, no messaging, no KYC approve)
const requireAdminOrManager = requireRole("ADMIN", "MANAGER");
const requireAdminManagerOrSupervisor = requireRole("ADMIN", "MANAGER", "SUPERVISOR");

// User Management Routes
router.get("/users", AdminController.getUsers);
router.get("/users/:userId", AdminController.getUser);
router.get("/users/:userId/transactions", AdminController.getUserTransactions);
router.post("/users", requireAdminOrManager, AdminController.createUser);
router.patch("/users/:userId", requireAdminOrManager, AdminController.updateUser);
router.delete("/users/:userId", requireAdminOrManager, AdminController.deleteUser);

// Wallet Management Routes
router.get("/wallets", AdminController.getWallets);
router.get("/wallets/:walletId", AdminController.getWallet);
router.post("/wallets", requireAdminOrManager, AdminController.createWallet);
router.patch("/wallets/:walletId", requireAdminOrManager, AdminController.updateWallet);
router.delete("/wallets/:walletId", requireAdminOrManager, AdminController.deleteWallet);

// Transaction Management Routes
router.get("/transactions", AdminController.getTransactions);
router.get("/transactions/:transactionId", AdminController.getTransaction);
router.post("/transactions", requireAdminOrManager, AdminController.createTransaction);
router.patch("/transactions/:transactionId", requireAdminOrManager, AdminController.updateTransaction);
router.delete("/transactions/:transactionId", requireAdminOrManager, AdminController.deleteTransaction);

// Summary and Reports
router.get("/summary", AdminController.getSummary);
router.get("/revenue/ledger", AdminController.getRevenueLedger);
router.get("/email-logs", AdminController.getEmailLogs);
router.post("/messages/email", requireAdminOrManager, AdminController.sendAdminEmail);
router.patch("/kyc/:userId/approve", requireAdminOrManager, AdminController.approveKYC);

// Susu Group Management Routes
router.get("/susu/groups", AdminController.getSusuGroups);
router.get("/susu-groups", AdminController.getSusuGroups);
router.get("/susu/groups/:groupId", AdminController.getSusuGroup);
router.post("/susu/groups", requireAdminOrManager, AdminController.createSusuGroup);
router.patch("/susu/groups/:groupId", requireAdminOrManager, AdminController.updateSusuGroup);
router.delete("/susu/groups/:groupId", requireAdminOrManager, AdminController.deleteSusuGroup);
router.get("/susu/groups/:groupId/members", AdminController.getSusuGroupMembers);
router.get("/susu/groups/:groupId/contributions", AdminController.getSusuGroupContributions);
router.get("/susu/groups/:groupId/loans", AdminController.getSusuGroupLoans);
router.get("/susu/groups/:groupId/payouts", AdminController.getSusuGroupPayouts);

// Alternative route paths (without slashes)
router.get("/susu-groups/:groupId/members", AdminController.getSusuGroupMembers);
router.get("/susu-groups/:groupId/contributions", AdminController.getSusuGroupContributions);
router.get("/susu-groups/:groupId/loans", AdminController.getSusuGroupLoans);
router.get("/susu-groups/:groupId/payouts", AdminController.getSusuGroupPayouts);

// Susu Membership Management Routes
router.post("/susu/memberships", requireAdminOrManager, AdminController.createSusuMembership);
router.post("/susu-memberships", requireAdminOrManager, AdminController.createSusuMembership);
router.patch("/susu/memberships/:membershipId", requireAdminOrManager, AdminController.updateSusuMembership);
router.delete("/susu/memberships/:membershipId", requireAdminOrManager, AdminController.deleteSusuMembership);

// Susu Contribution Management Routes
router.post("/susu/contributions", requireAdminOrManager, AdminController.createSusuContribution);
router.patch("/susu/contributions/:contributionId", requireAdminOrManager, AdminController.updateSusuContribution);
router.delete("/susu/contributions/:contributionId", requireAdminOrManager, AdminController.deleteSusuContribution);

// Susu Loan Management Routes
router.post("/susu/loans", requireAdminOrManager, AdminController.createSusuLoan);
router.patch("/susu/loans/:loanId", requireAdminOrManager, AdminController.updateSusuLoan);
router.delete("/susu/loans/:loanId", requireAdminOrManager, AdminController.deleteSusuLoan);

// Client Loans (multi-level approval) - TODO: Implement missing controller methods
// router.get("/loans", AdminController.getLoans);
// router.get("/loans/:loanId", AdminController.getLoan);
// router.patch("/loans/:loanId/approve", AdminController.approveLoan);
// router.post("/loans/:loanId/disburse", AdminController.disburseLoan);

// Susu Payout Management Routes
router.post("/susu/payouts", requireAdminOrManager, AdminController.createSusuPayout);
router.get("/susu/payouts", AdminController.getSusuGroupPayouts);
router.patch("/susu/payouts/:payoutId", requireAdminOrManager, AdminController.updateSusuPayout);
router.delete("/susu/payouts/:payoutId", requireAdminOrManager, AdminController.deleteSusuPayout);

// Alternative payout routes
router.get("/susu-payouts", AdminController.getSusuGroupPayouts);

// Susu Cycle Management Routes
router.get("/susu/cycles", AdminController.getSusuCycles);
router.post("/susu/cycles", requireAdminOrManager, AdminController.createSusuCycle);
router.patch("/susu/cycles/:cycleId", requireAdminOrManager, AdminController.updateSusuCycle);
router.delete("/susu/cycles/:cycleId", requireAdminOrManager, AdminController.deleteSusuCycle);

// Susu Fee Management Routes
router.get("/susu/fees", AdminController.getSusuFees);
router.post("/susu/fees", requireAdminOrManager, AdminController.createSusuFee);
router.patch("/susu/fees/:feeId", requireAdminOrManager, AdminController.updateSusuFee);
router.delete("/susu/fees/:feeId", requireAdminOrManager, AdminController.deleteSusuFee);

// Teller Management Routes
router.get("/tellers", AdminController.getTellers);
router.get("/tellers/:tellerId", AdminController.getTeller);
router.post("/tellers", requireAdminOrManager, AdminController.createTeller);
router.patch("/tellers/:tellerId", requireAdminOrManager, AdminController.updateTeller);
router.delete("/tellers/:tellerId", requireAdminOrManager, AdminController.deleteTeller);

// Branch Management Routes
router.get("/branches", AdminController.getBranches);
router.get("/branches/:branchId", AdminController.getBranch);
router.post("/branches", requireAdminOrManager, AdminController.createBranch);
router.patch("/branches/:branchId", requireAdminOrManager, AdminController.updateBranch);
router.delete("/branches/:branchId", requireAdminOrManager, AdminController.deleteBranch);

// Compliance Routes
router.get("/compliance/dashboard", AdminController.getComplianceDashboard);
router.get("/compliance/flags", AdminController.getComplianceFlags);
router.get("/compliance/flags/:flagId", AdminController.getComplianceFlag);
router.post("/compliance/flags", requireAdminManagerOrSupervisor, AdminController.createComplianceFlag);
router.delete("/compliance/flags/:flagId", requireAdminOrManager, AdminController.deleteComplianceFlag);
router.patch("/compliance/flags/:flagId/report", requireAdminManagerOrSupervisor, AdminController.markFlagAsReported);
router.patch("/compliance/flags/:flagId/resolve", requireAdminManagerOrSupervisor, AdminController.resolveComplianceFlag);
router.get("/compliance/ctr", AdminController.getCTRReport);
router.get("/compliance/str", AdminController.getSTRReport);

// Revenue Ledger Management Routes
router.post("/revenue/entries", requireAdminOrManager, AdminController.createRevenueEntry);
router.patch("/revenue/entries/:entryId", requireAdminOrManager, AdminController.updateRevenueEntry);
router.delete("/revenue/entries/:entryId", requireAdminOrManager, AdminController.deleteRevenueEntry);

// Receipt Management Routes
router.get("/receipts", AdminController.getReceipts);
router.post("/receipts", requireAdminOrManager, AdminController.createReceipt);
router.patch("/receipts/:receiptId", requireAdminOrManager, AdminController.updateReceipt);
router.delete("/receipts/:receiptId", requireAdminOrManager, AdminController.deleteReceipt);

// Audit Log Management Routes
router.get("/audit-logs", AdminController.getAuditLogs);
router.post("/audit-logs", requireAdminOrManager, AdminController.createAuditLog);

// SMS Log Management Routes
router.get("/sms-logs", AdminController.getSMSLogs);
router.post("/sms-logs", requireAdminOrManager, AdminController.createSMSLog);
router.patch("/sms-logs/:logId", requireAdminOrManager, AdminController.updateSMSLog);
router.delete("/sms-logs/:logId", requireAdminOrManager, AdminController.deleteSMSLog);

// Health Check
router.get("/health", AdminController.getAdminHealth);

// Reconciliation & Load Testing
router.post("/reconciliation/run", requireAdminOrManager, AdminController.runReconciliation);
router.post("/loadtest/run", requireAdminOrManager, AdminController.runLoadTest);

module.exports = router;
