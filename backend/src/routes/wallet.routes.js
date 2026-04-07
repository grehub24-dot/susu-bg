const express = require("express");
const WalletController = require("../controllers/wallet.controller");

const router = express.Router();

router.get("/balance", WalletController.getBalance);

module.exports = router;
