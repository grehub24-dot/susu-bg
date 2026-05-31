const express = require("express");
const GhanaPayService = require("../services/ghanapay.service");

const router = express.Router();

router.post("/verify-request", async (req, res) => {
  try {
    const request = await GhanaPayService.createVerificationRequest(req.body);
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/pending", async (req, res) => {
  try {
    const tellerId = req.headers['x-teller-id'];
    const pending = await GhanaPayService.getPendingVerifications(tellerId);
    res.json({ success: true, data: pending });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const tellerId = req.headers['x-teller-id'];
    const result = await GhanaPayService.verifyTransaction({
      ...req.body,
      tellerId
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const tellerId = req.headers['x-teller-id'];
    const history = await GhanaPayService.getVerificationHistory(tellerId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;