const supabase = require("../lib/supabase");
const PaymentService = require("../services/payment.service");
const logger = require("../lib/logger");

const SESSION_TTL_MINUTES = 30;

class USSDController {
  static async handleUSSD(req, res) {
    const { sessionid, msisdn, userdata, msgtype } = req.body;
    const phoneNumber = msisdn;
    let responseText = "";
    let isEnd = false;

    try {
      let session = await this.getSession(sessionid);
      
      if (!session || msgtype === "0") {
        session = {
          id: sessionid,
          phone: phoneNumber,
          level: 0,
          data: {}
        };
        await this.saveSession(session);
      } else {
        session.data = session.data || {};
        session.level = session.level || 0;
      }

      const { data: user } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, phone_number")
        .eq("phone_number", phoneNumber)
        .single();

      if (!user) {
        res.set("Content-Type", "text/plain");
        res.send("END You are not registered on Susu-BG. Visit our website to register.");
        return;
      }

      const input = typeof userdata === "string" ? userdata.trim() : "";

      if (session.waitingPIN) {
        const pinVerified = await this.verifyPIN(user.id, input);
        if (!pinVerified) {
          responseText = "Invalid PIN. Try again.";
          isEnd = true;
          await this.clearSession(sessionid);
        } else {
          responseText = await this.processPINAction(session, user);
          isEnd = true;
          await this.clearSession(sessionid);
        }
        res.set("Content-Type", "text/plain");
        res.send(`${isEnd ? "END" : "CON"} ${responseText}`);
        return;
      }

      switch (session.level) {
        case 0:
          responseText = `Welcome to Susu-BG, ${user.full_name.split(" ")[0]}\n1. Check Balance\n2. Deposit\n3. Withdraw`;
          session.level = 1;
          await this.saveSession(session);
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
            await this.clearSession(sessionid);
          } else if (input === "2") {
            responseText = "Enter amount to deposit (GHS):";
            session.level = 21;
            await this.saveSession(session);
          } else if (input === "3") {
            responseText = "Enter amount to withdraw (GHS):";
            session.level = 31;
            await this.saveSession(session);
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
          await this.clearSession(sessionid);
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
          session.waitingPIN = true;
          session.action = "withdraw";
          await this.saveSession(session);
          break;
        }
        default:
          responseText = "Invalid session state.";
          isEnd = true;
          await this.clearSession(sessionid);
      }
    } catch (error) {
      logger.error("USSD Error:", error);
      responseText = `An error occurred. Please try again.`;
      isEnd = true;
      await this.clearSession(sessionid);
    }

    res.set("Content-Type", "text/plain");
    res.send(`${isEnd ? "END" : "CON"} ${responseText}`);
  }

  static async getSession(sessionId) {
    const { data } = await supabase
      .from("ussd_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .gt("expires_at", new Date().toISOString())
      .single();
    
    if (!data) return null;
    
    return {
      id: data.id,
      phone: data.phone_number,
      level: parseInt(data.menu_level?.replace('level_', '')) || 0,
      data: data.input_data || {},
      waitingPIN: false,
      action: null
    };
  }

  static async saveSession(session) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();
    const menuLevel = `level_${session.level}`;
    
    await supabase
      .from("ussd_sessions")
      .upsert({
        phone_number: session.phone,
        session_id: session.id,
        menu_level: menuLevel,
        input_data: session.data,
        expires_at: expiresAt
      }, { onConflict: 'session_id' });
  }

  static async clearSession(sessionId) {
    await supabase
      .from("ussd_sessions")
      .delete()
      .eq("session_id", sessionId);
  }

  static async verifyPIN(userId, pin) {
    const { data: user } = await supabase
      .from("users")
      .select("pin_hash")
      .eq("id", userId)
      .single();
    
    if (!user?.pin_hash) return false;
    
    const bcrypt = require("bcryptjs");
    return bcrypt.compare(pin, user.pin_hash);
  }

  static async processPINAction(session, user) {
    if (session.action === "withdraw") {
      const { data: walletData } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!walletData) return "No wallet found.";
      
      const reference = `WDL-${Date.now()}`;
      await PaymentService.initWithdrawal(
        walletData.id,
        session.data.amount,
        user.phone_number,
        reference
      );
      return `Withdrawal of GHS ${session.data.amount} is being processed. You will receive an SMS shortly.`;
    }
    return "Action completed.";
  }
}

module.exports = USSDController;