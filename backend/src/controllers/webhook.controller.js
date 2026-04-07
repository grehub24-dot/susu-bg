const PaymentService = require("../services/payment.service");

class WebhookController {
  static async paystack(req, res) {
    try {
      const isValid = PaymentService.verifyWebhookSignature(req);
      if (!isValid) {
        res.status(401).json({ success: false, message: "Invalid signature" });
        return;
      }

      await PaymentService.handleWebhook(req.body);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = WebhookController;
