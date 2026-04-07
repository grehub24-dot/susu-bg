const { z } = require("zod");
const supabase = require("../lib/supabase");
const PaymentService = require("../services/payment.service");
const WigalService = require("../services/wigal.service");

const depositSchema = z.object({
  walletId: z.string().uuid(),
  email: z.string().email(),
  amount: z.number().positive(),
  reference: z.string().min(8)
});

const withdrawSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().positive(),
  recipientCode: z.string().min(3),
  reference: z.string().min(8)
});

class TransactionController {
  static async initDeposit(req, res) {
    try {
      const parsed = depositSchema.parse(req.body);
      const authorizationUrl = await PaymentService.initDeposit(
        parsed.walletId,
        parsed.amount,
        parsed.email,
        parsed.reference
      );
      res.status(201).json({ success: true, authorization_url: authorizationUrl });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async initWithdrawal(req, res) {
    try {
      const parsed = withdrawSchema.parse(req.body);
      const transfer = await PaymentService.initWithdrawal(
        parsed.walletId,
        parsed.amount,
        parsed.recipientCode,
        parsed.reference
      );
      res.status(201).json({ success: true, transfer });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async history(req, res) {
    try {
      const userId = String(req.query.userId || "");
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!wallet) {
        res.status(404).json({ success: false, message: "Wallet not found" });
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("id, reference, amount, type, status, created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false });

      if (error) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async notifySuccess(phoneNumber, type, amount, newBalance) {
    await WigalService.sendTransactionAlert(phoneNumber, type, amount, newBalance);
  }
}

module.exports = TransactionController;
