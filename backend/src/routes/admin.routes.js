const express = require("express");
const AdminController = require("../controllers/admin.controller");

const router = express.Router();

router.get("/users", AdminController.getUsers);
router.get("/transactions", AdminController.getTransactions);
router.patch("/kyc/:userId/approve", AdminController.approveKYC);

module.exports = router;
