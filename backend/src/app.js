const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const walletRoutes = require("./routes/wallet.routes");
const transactionRoutes = require("./routes/transaction.routes");
const webhookRoutes = require("./routes/webhook.routes");
const ussdRoutes = require("./routes/ussd.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(cors());
app.use("/api/webhooks", express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/ussd", ussdRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, req, res, next) => {
  void next;
  res.status(500).json({ success: false, message: error.message });
});

module.exports = app;
