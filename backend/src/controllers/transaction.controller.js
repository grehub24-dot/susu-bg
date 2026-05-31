const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../lib/supabase");
const PaymentService = require("../services/payment.service");
const WigalService = require("../services/wigal.service");
const ReceiptService = require("../services/receipt.service");
const logger = require("../lib/logger");

const DEMO_DELAY_SECONDS = Number(process.env.DEMO_DELAY_SECONDS) || 300;

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

const demoSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  paymentMethod: z.string(),
  userPhone: z.string().optional(),
  userNetwork: z.string().optional(),
  bankReceiptNumber: z.string().optional(),
  stage: z.enum(["INITIATE", "FINALIZE"]),
  demoSessionId: z.string().uuid().optional()
});

class TransactionController {
  static async demoTransaction(req, res) {
    try {
      logger.info(`[DEMO] Received request: ${req.body.stage} for ${req.body.type} ${req.body.amount}`);
      const parsed = demoSchema.parse(req.body);
      const { userId, amount, type, paymentMethod, stage, demoSessionId } = parsed;

      // 1. Get User details for notifications
      const { data: user } = await supabase
        .from("users")
        .select("phone_number, email")
        .eq("id", userId)
        .single();

      if (stage === "INITIATE") {
        const createdReference = `DEMO-${type.substring(0, 1)}-${Date.now()}`;
        const createdSessionId = uuidv4();
        const readyAtMs = Date.now() + DEMO_DELAY_SECONDS * 1000;
        const readyAt = new Date(readyAtMs).toISOString();

        await supabase.from("demo_sessions").insert({
          id: createdSessionId,
          user_id: userId,
          amount,
          type,
          payment_method: paymentMethod,
          reference: createdReference,
          ready_at: readyAt,
          status: "PENDING"
        });

        if (user && user.phone_number) {
          const initMsg = `Susu-BG Alert: Your ${type} of GHS ${amount} via ${paymentMethod} has been initiated. Verification is in progress.`;
          await WigalService.sendSMS(user.phone_number, initMsg).catch(err => logger.error("Demo Init SMS failed:", err));
        }
        
        if (user && user.email) {
          const subject = `Susu-BG: ${type} Initiated`;
          const body = `Hello,\n\nYour ${type.toLowerCase()} of GHS ${amount} via ${paymentMethod} has been initiated and is currently being verified. This process usually takes about 30 minutes to 1 hour depending on the payment method.\n\nWe will notify you once it is successful.\n\nReference: ${createdReference}`;
          await ReceiptService.sendNotificationEmail(user.email, subject, body, {
            userId,
            emailType: "DEMO_TX_INIT",
            metadata: { reference: createdReference, type, amount, paymentMethod }
          }).catch(err => logger.error("Demo Init Email failed:", err));
        }
        
        logger.info(`[DEMO EMAIL] To: ${user?.email}, Subject: Transaction ${type} Initiated, Amount: GHS ${amount}`);
        
        return res.status(200).json({
          success: true,
          message: "Transaction initiated successfully. Please wait for verification.",
          stage: "INITIATED",
          demoSessionId: createdSessionId,
          reference: createdReference,
          waitSeconds: DEMO_DELAY_SECONDS
        });
      }

      // stage === "FINALIZE"
      if (!demoSessionId) {
        return res.status(400).json({ success: false, message: "Missing demo session id" });
      }

      const { data: session, error: sessionError } = await supabase
        .from("demo_sessions")
        .select("*")
        .eq("id", demoSessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ success: false, message: "Demo session not found or expired" });
      }

      if (session.user_id !== userId) {
        return res.status(403).json({ success: false, message: "Demo session does not belong to this user" });
      }

      const readyAt = new Date(session.ready_at).getTime();
      const remainingSeconds = Math.ceil((readyAt - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        return res.status(425).json({
          success: false,
          message: `Verification still in progress. Please wait ${remainingSeconds} seconds.`,
          remainingSeconds
        });
      }

      const finalAmount = session.amount;
      const finalType = session.type;
      const finalPaymentMethod = session.payment_method;
      const reference = session.reference;

      // 1. Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) {
        return res.status(404).json({ success: false, message: "Wallet not found" });
      }

      // 2. Perform CRUD
      if (finalType === "DEPOSIT") {
        await supabase.from("transactions").insert({
          wallet_id: wallet.id,
          reference: reference,
          amount: finalAmount,
          type: "DEPOSIT",
          status: "PENDING"
        });

        const { error: creditError } = await supabase.rpc("credit_wallet", {
          p_wallet_id: wallet.id,
          p_amount: finalAmount,
          p_reference: reference
        });

        if (creditError) throw creditError;
      } else {
        const { error: withdrawError } = await supabase.rpc("init_withdrawal", {
          p_wallet_id: wallet.id,
          p_amount: finalAmount,
          p_reference: reference
        });

        if (withdrawError) throw withdrawError;

        await supabase
          .from("transactions")
          .update({ status: "SUCCESS" })
          .eq("reference", reference);
      }

      // 4. Post revenue for transaction fees
      await PaymentService.postTransactionFeeRevenue(reference);

      // 5. Get new balance
      const { data: newWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("id", wallet.id)
        .single();

      // 6. Trigger "Successful" Notification
      if (user && user.phone_number && newWallet) {
        WigalService.sendTransactionAlert(
          user.phone_number,
          finalType,
          finalAmount,
          newWallet.balance
        ).catch(err => logger.error("Demo Success SMS failed:", err));
      }
      
      if (user && user.email) {
        const subject = `Susu-BG: ${finalType} Successful`;
        const body = `Hello,\n\nYour ${finalType.toLowerCase()} of GHS ${finalAmount} via ${finalPaymentMethod} was successful!\n\nNew Balance: GHS ${newWallet?.balance || 'Unknown'}\nReference: ${reference}\n\nThank you for using Susu-BG.`;
        await ReceiptService.sendNotificationEmail(user.email, subject, body, {
          userId,
          emailType: "DEMO_TX_SUCCESS",
          metadata: { reference, type: finalType, amount: finalAmount, paymentMethod: finalPaymentMethod, balance: newWallet?.balance }
        }).catch(err => logger.error("Demo Success Email failed:", err));
      }

      await supabase
        .from("demo_sessions")
        .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
        .eq("id", demoSessionId);

      logger.info(`[DEMO EMAIL] To: ${user?.email}, Subject: Transaction ${finalType} Successful, Amount: GHS ${finalAmount}, New Balance: GHS ${newWallet?.balance || 'Unknown'}`);

      res.status(200).json({
        success: true,
        message: `Demo ${finalType} successful`,
        reference,
        newBalance: newWallet?.balance || 0,
        stage: "FINALIZED"
      });

    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

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
