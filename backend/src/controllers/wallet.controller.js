const { z } = require("zod");
const supabase = require("../lib/supabase");

const userIdSchema = z.object({
  userId: z.string().uuid()
});

class WalletController {
  static async getBalance(req, res) {
    try {
      const { userId } = userIdSchema.parse(req.query);
      const { data: wallet, error } = await supabase
        .from("wallets")
        .select("id, balance, currency")
        .eq("user_id", userId)
        .single();

      if (error || !wallet) {
        res.status(404).json({ success: false, message: "Wallet not found" });
        return;
      }

      res.json({ success: true, wallet });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = WalletController;
