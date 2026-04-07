const express = require("express");
const TransactionController = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/deposit", TransactionController.initDeposit);
router.post("/withdraw", TransactionController.initWithdrawal);
router.get("/history", TransactionController.history);

module.exports = router;
