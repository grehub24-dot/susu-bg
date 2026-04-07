const supabase = require("../lib/supabase");
const PaymentService = require("../services/payment.service");

const sessionStore = new Map();

class USSDController {
  static async handleUSSD(req, res) {
    const { sessionid, msisdn, userdata, msgtype } = req.body;
    const phoneNumber = msisdn;
    let session = sessionStore.get(sessionid);
    let responseText = "";
    let isEnd = false;

    if (!session || msgtype === "0") {
      session = { level: 0, phone: phoneNumber, data: {} };
      sessionStore.set(sessionid, session);
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("phone_number", phoneNumber)
      .single();

    if (!user) {
      res.set("Content-Type", "text/plain");
      res.send("END You are not registered on Susu-BG. Visit our website to register.");
      return;
    }

    const input = typeof userdata === "string" ? userdata.trim() : "";

    try {
      switch (session.level) {
        case 0:
          responseText = `Welcome to Susu-BG, ${user.full_name.split(" ")[0]}\n1. Check Balance\n2. Deposit\n3. Withdraw`;
          session.level = 1;
          break;
        case 1:
          if (input === "1") {
            const { data: wallet } = await supabase
              .from("wallets")
              .select("balance")
              .eq("user_id", user.id)
              .single();
            responseText = `Your Susu-BG balance is GHS ${wallet?.balance ?? 0}`;
            isEnd = true;
          } else if (input === "2") {
            responseText = "Enter amount to deposit (GHS):";
            session.level = 21;
          } else if (input === "3") {
            responseText = "Enter amount to withdraw (GHS):";
            session.level = 31;
          } else {
            responseText = "Invalid option.\n1. Check Balance\n2. Deposit\n3. Withdraw";
          }
          break;
        case 21: {
          const amount = Number.parseFloat(input);
          if (!Number.isFinite(amount) || amount <= 0) {
            responseText = "Invalid amount. Enter amount to deposit (GHS):";
            break;
          }
          session.data.amount = amount;
          responseText = `Deposit of GHS ${amount} initiated. Continue in app to complete payment.`;
          isEnd = true;
          break;
        }
        case 31: {
          const amount = Number.parseFloat(input);
          if (!Number.isFinite(amount) || amount <= 0) {
            responseText = "Invalid amount. Enter amount to withdraw (GHS):";
            break;
          }
          session.data.amount = amount;
          responseText = `Enter your Susu-BG PIN to withdraw GHS ${amount}:`;
          session.level = 32;
          break;
        }
        case 32: {
          const { data: walletData } = await supabase
            .from("wallets")
            .select("id")
            .eq("user_id", user.id)
            .single();
          const reference = `WDL-${Date.now()}`;
          await PaymentService.initWithdrawal(
            walletData.id,
            session.data.amount,
            phoneNumber,
            reference
          );
          responseText = `Withdrawal of GHS ${session.data.amount} is being processed. You will receive an SMS shortly.`;
          isEnd = true;
          break;
        }
        default:
          responseText = "Invalid session state.";
          isEnd = true;
      }
    } catch (error) {
      responseText = `An error occurred. ${error.message}`;
      isEnd = true;
    }

    if (isEnd) {
      sessionStore.delete(sessionid);
    } else {
      sessionStore.set(sessionid, session);
    }

    res.set("Content-Type", "text/plain");
    res.send(`${isEnd ? "END" : "CON"} ${responseText}`);
  }
}

module.exports = USSDController;
