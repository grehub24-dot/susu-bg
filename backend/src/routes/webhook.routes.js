const express = require("express");
const WebhookController = require("../controllers/webhook.controller");

const router = express.Router();

router.post("/paystack", WebhookController.paystack);

module.exports = router;
