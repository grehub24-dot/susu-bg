// backend/src/controllers/admin.controller.js
const bcrypt = require("bcryptjs");
const supabase = require("../lib/supabase");
const AMLService = require("../services/aml.service");
const BoGReportingService = require("../services/bogReporting.service"); 
const WigalService = require('../services/wigal.service');
const ReceiptService = require('../services/receipt.service');

const REVENUE_CATEGORY_CONFIG = [
    { key: "TRANSACTION_FEE", label: "Transaction Fees", color: "rgba(45, 91, 255, 0.95)" },
    { key: "LOAN_INTEREST", label: "Loan Interest", color: "rgba(124, 58, 237, 0.90)" },
    { key: "INVESTMENT_RETURN", label: "Investment Return", color: "rgba(16, 185, 129, 0.90)" },
    { key: "ACCOUNT_MAINTENANCE", label: "Maintenance", color: "rgba(245, 158, 11, 0.90)" },
    { key: "PENALTY", label: "Penalty", color: "rgba(239, 68, 68, 0.90)" },
    { key: "COMMISSION", label: "Commission", color: "rgba(236, 72, 153, 0.90)" },
    { key: "OTHER", label: "Other", color: "rgba(15, 23, 42, 0.45)" }
];

const CATEGORY_LABELS = Object.fromEntries(REVENUE_CATEGORY_CONFIG.map((item) => [item.key, item.label]));

const asAmount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const isMissingRelationError = (error) => String(error?.code || "") === "42P01";

const buildRevenueBreakdown = (totals) =>
    REVENUE_CATEGORY_CONFIG.map((item) => ({
        key: item.key,
        label: item.label,
        amount: asAmount(totals[item.key]),
        color: item.color
    }));

const buildRevenueFeedItem = ({ id, category, amount, reference, note, created_at, sourceType, source }) => ({
    id: String(id || `${category}-${created_at}`),
    category: String(category || "OTHER"),
    label: CATEGORY_LABELS[String(category || "OTHER")] || "Other",
    amount: asAmount(amount),
    reference: String(reference || ""),
    note: String(note || ""),
    created_at,
    sourceType: String(sourceType || "OTHER"),
    source: String(source || "LEDGER")
});

async function safeRevenueLedgerQuery(configure) {
    const query = configure(
        supabase
            .from("revenue_ledger")
            .select("id, source_type, category, amount, currency, reference, note, created_at")
    );
    const { data, error } = await query;
    if (error) {
        if (isMissingRelationError(error)) return [];
        throw error;
    }
    return Array.isArray(data) ? data : [];
}

class AdminController {
    
    /**
     * Get All Users with their Wallet Balances
     */
    static async getUsers(req, res) {
        try {
            // Join users with their wallets
            const { data, error } = await supabase
                .from('users')
                .select(`
                    id, full_name, phone_number, created_at, kyc_status,
                    wallets ( balance, currency )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getUser(req, res) {
        try {
            const userId = String(req.params.userId || "").trim();
            if (!userId) {
                res.status(400).json({ success: false, message: "userId is required" });
                return;
            }

            const { data, error } = await supabase
                .from("users")
                .select(
                    `id, full_name, phone_number, email, created_at, kyc_status, date_of_birth,
                    momo_number, bank_account_number, bank_sort_code, bank_name, card_number,
                    house_address, gps_address, region, hometown,
                    passport_picture_url, id_type, id_number, id_card_front_url, id_card_back_url,
                    wallets ( balance, currency )`
                )
                .eq("id", userId)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getUserTransactions(req, res) {
        try {
            const userId = String(req.params.userId || "").trim();
            if (!userId) {
                res.status(400).json({ success: false, message: "userId is required" });
                return;
            }

            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));

            const { data, error } = await supabase
                .from("transactions")
                .select(
                    `id, reference, amount, type, status, created_at,
                    wallets ( id, user_id, users ( full_name, phone_number ) )`
                )
                .order("created_at", { ascending: false })
                .eq("wallets.user_id", userId)
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data, limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createUser(req, res) {
        try {
            const { full_name, email, phone_number, pin_hash, risk_rating, pep_status, ghana_card_number, ghana_card_image_url } = req.body;

            if (!full_name || !email || !phone_number || !pin_hash) {
                return res.status(400).json({ success: false, message: "full_name, email, phone_number, and pin_hash are required" });
            }

            const { data: user, error } = await supabase
                .from('users')
                .insert({
                    full_name,
                    email,
                    phone_number,
                    pin_hash,
                    risk_rating: risk_rating || 'LOW',
                    pep_status: pep_status || false,
                    ghana_card_number,
                    ghana_card_image_url,
                    kyc_status: 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const updates = req.body;

            const { data: user, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Wallet Management Methods
    static async getWallets(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const userId = String(req.query.userId || "").trim();

            let query = supabase
                .from("wallets")
                .select("*, users(full_name, phone_number, email)")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (userId) {
                query = query.eq("user_id", userId);
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getWallet(req, res) {
        try {
            const { walletId } = req.params;
            const { data: wallet, error } = await supabase
                .from("wallets")
                .select("*, users(full_name, phone_number, email)")
                .eq("id", walletId)
                .single();

            if (error) throw error;
            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createWallet(req, res) {
        try {
            const { user_id, balance, currency, daily_limit, monthly_limit, branch_id, status } = req.body;

            if (!user_id) {
                return res.status(400).json({ success: false, message: "user_id is required" });
            }

            const { data: wallet, error } = await supabase
                .from("wallets")
                .insert({
                    user_id,
                    balance: balance || 0.00,
                    currency: currency || "GHS",
                    daily_limit: daily_limit || 5000.00,
                    monthly_limit: monthly_limit || 50000.00,
                    branch_id,
                    status: status || "ACTIVE"
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateWallet(req, res) {
        try {
            const { walletId } = req.params;
            const updates = req.body;

            const { data: wallet, error } = await supabase
                .from("wallets")
                .update(updates)
                .eq("id", walletId)
                .select()
                .single();

            if (error) throw error;
            if (!wallet) {
                return res.status(404).json({ success: false, message: "Wallet not found" });
            }
            res.json({ success: true, data: wallet });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteWallet(req, res) {
        try {
            const { walletId } = req.params;
            const { error } = await supabase
                .from("wallets")
                .delete()
                .eq("id", walletId);

            if (error) throw error;
            res.json({ success: true, message: "Wallet deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * View Global Transaction Logs
     */
    static async getTransactions(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    id, reference, amount, type, status, created_at,
                    wallets (
                        users ( full_name, phone_number )
                    )
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { data: transaction, error } = await supabase
                .from("transactions")
                .select("*, wallets(*, users(full_name, phone_number))")
                .eq("id", transactionId)
                .single();

            if (error) throw error;
            if (!transaction) {
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createTransaction(req, res) {
        try {
            const { wallet_id, amount, type, status, channel, teller_id, metadata, reference } = req.body;

            if (!wallet_id || !amount || !type || !reference) {
                return res.status(400).json({ success: false, message: "wallet_id, amount, type, and reference are required" });
            }

            const { data: transaction, error } = await supabase
                .from("transactions")
                .insert({
                    wallet_id,
                    amount,
                    type,
                    status: status || "PENDING",
                    channel,
                    teller_id,
                    metadata,
                    reference
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const updates = req.body;

            const { data: transaction, error } = await supabase
                .from("transactions")
                .update(updates)
                .eq("id", transactionId)
                .select()
                .single();

            if (error) throw error;
            if (!transaction) {
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }
            res.json({ success: true, data: transaction });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { error } = await supabase
                .from("transactions")
                .delete()
                .eq("id", transactionId);

            if (error) throw error;
            res.json({ success: true, message: "Transaction deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getEmailLogs(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const q = String(req.query.q || "").trim().toLowerCase();
            const status = String(req.query.status || "").trim().toUpperCase();
            const emailType = String(req.query.emailType || "").trim().toUpperCase();
            const userId = String(req.query.userId || "").trim();

            let query = supabase
                .from("email_logs")
                .select(
                    `id, user_id, to_email, subject, body_preview, email_type, status, message_id, error_message, metadata, created_at,
                    users ( full_name, phone_number, email )`
                )
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (userId) {
                query = query.eq("user_id", userId);
            }
            if (status === "SENT" || status === "FAILED") {
                query = query.eq("status", status);
            }
            if (emailType) {
                query = query.eq("email_type", emailType);
            }
            if (q) {
                query = query.or(
                    [
                        `to_email.ilike.%${q}%`,
                        `subject.ilike.%${q}%`,
                        `body_preview.ilike.%${q}%`
                    ].join(",")
                );
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data, limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async sendAdminEmail(req, res) {
        try {
            const messageType = String(req.body?.messageType || "individual").trim().toLowerCase();
            const recipient = String(req.body?.recipient || "").trim();
            const subject = String(req.body?.subject || "").trim();
            const body = String(req.body?.body || "").trim();

            if (!subject || !body) {
                res.status(400).json({ success: false, message: "Subject and body are required." });
                return;
            }

            if (messageType === "bulk") {
                const { data: users, error: usersError } = await supabase
                    .from("users")
                    .select("id, email, full_name")
                    .not("email", "is", null);

                if (usersError) throw usersError;
                const recipients = Array.isArray(users) ? users.filter((u) => u?.email) : [];
                const deliveries = recipients.map((user) =>
                    ReceiptService.sendNotificationEmail(user.email, subject, body, {
                        userId: user.id,
                        emailType: "ADMIN_MESSAGE",
                        metadata: { audience: "ALL_USERS" }
                    }).catch(() => null)
                );

                await Promise.all(deliveries);
                res.json({ success: true, message: `Bulk email queued for ${recipients.length} users.` });
                return;
            }

            if (!recipient) {
                res.status(400).json({ success: false, message: "Recipient is required for individual messages." });
                return;
            }

            const isEmail = recipient.includes("@");
            const lookupColumn = isEmail ? "email" : "phone_number";
            const { data: user, error: userError } = await supabase
                .from("users")
                .select("id, email, full_name, phone_number")
                .eq(lookupColumn, isEmail ? recipient.toLowerCase() : recipient)
                .maybeSingle();

            if (userError) throw userError;
            if (!user || !user.email) {
                res.status(404).json({ success: false, message: "User not found or has no email." });
                return;
            }

            await ReceiptService.sendNotificationEmail(user.email, subject, body, {
                userId: user.id,
                emailType: "ADMIN_MESSAGE",
                metadata: { recipient }
            });

            res.json({ success: true, message: "Email sent successfully." });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Manual KYC Approval (Admin Action)
     */
    static async approveKYC(req, res) {
        try {
            const { userId } = req.params;
            
            // Validate user exists
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, full_name, email, phone_number')
                .eq('id', userId)
                .single();
                
            if (fetchError || !user) throw new Error("User not found");

            // Update KYC Status
            const { error: updateError } = await supabase
                .from('users')
                .update({ kyc_status: 'APPROVED', updated_at: new Date() })
                .eq('id', userId);

            if (updateError) throw updateError;

            const smsMessage = "Susu-BG Alert: Your KYC verification has been approved. You now have full access to all features!";
            const emailSubject = "Susu-BG KYC Approved";
            const emailBody = `Hello ${String(user.full_name || "").trim() || "Customer"},\n\nYour KYC verification has been approved. You now have full access to all Susu-BG features.\n\nThank you for choosing Susu-BG.`;
            await Promise.all([
                user.phone_number ? WigalService.sendSMS(user.phone_number, smsMessage) : Promise.resolve(),
                user.email ? ReceiptService.sendNotificationEmail(user.email, emailSubject, emailBody, { userId: user.id, emailType: "KYC_APPROVED" }) : Promise.resolve()
            ]);

            res.json({ success: true, message: "KYC Approved Successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSummary(req, res) {
        try {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

            const { data: wallets, error: walletsError } = await supabase
                .from("wallets")
                .select("balance, currency");

            if (walletsError) throw walletsError;

            const walletRows = Array.isArray(wallets) ? wallets : [];
            const currency = String(walletRows.find((w) => w?.currency)?.currency || "GHS");
            const totalClientBalance = walletRows.reduce((acc, w) => acc + (Number(w?.balance) || 0), 0);

            const baseTxSelect = "amount, type, status, created_at, metadata";
            const monthStartIso = monthStart.toISOString();
            const sevenDaysIso = sevenDaysAgo.toISOString();

            const [monthTxRes, sevenDayTxRes, monthRevenueRows, revenueRows7d, recentRevenueRows] = await Promise.all([
                supabase
                    .from("transactions")
                    .select(baseTxSelect)
                    .eq("status", "SUCCESS")
                    .gte("created_at", monthStartIso),
                supabase
                    .from("transactions")
                    .select(baseTxSelect)
                    .eq("status", "SUCCESS")
                    .gte("created_at", sevenDaysIso),
                safeRevenueLedgerQuery((query) => query.gte("created_at", monthStartIso)),
                safeRevenueLedgerQuery((query) => query.gte("created_at", sevenDaysIso)),
                safeRevenueLedgerQuery((query) => query.order("created_at", { ascending: false }).limit(5))
            ]);

            if (monthTxRes.error) throw monthTxRes.error;
            if (sevenDayTxRes.error) throw sevenDayTxRes.error;

            const monthTx = Array.isArray(monthTxRes.data) ? monthTxRes.data : [];
            const tx7d = Array.isArray(sevenDayTxRes.data) ? sevenDayTxRes.data : [];

            let depositsThisMonth = 0;
            let withdrawalsThisMonth = 0;
            let feeRevenueThisMonth = 0;
            const revenueTotalsThisMonth = Object.fromEntries(REVENUE_CATEGORY_CONFIG.map((item) => [item.key, 0]));

            monthTx.forEach((tx) => {
                const t = String(tx.type || "").toUpperCase();
                const amount = Number(tx.amount) || 0;
                if (t === "DEPOSIT") depositsThisMonth += amount;
                if (t === "WITHDRAWAL") withdrawalsThisMonth += amount;

                const meta = tx.metadata && typeof tx.metadata === "object" ? tx.metadata : null;
                const fee =
                    meta && typeof meta.fee_amount !== "undefined"
                        ? Number(meta.fee_amount)
                        : meta && typeof meta.fee !== "undefined"
                            ? Number(meta.fee)
                            : 0;
                if (!Number.isNaN(fee) && fee > 0) feeRevenueThisMonth += fee;
            });

            monthRevenueRows.forEach((row) => {
                const category = String(row.category || "OTHER").toUpperCase();
                if (!(category in revenueTotalsThisMonth)) revenueTotalsThisMonth.OTHER += asAmount(row.amount);
                else revenueTotalsThisMonth[category] += asAmount(row.amount);
            });

            if (revenueTotalsThisMonth.TRANSACTION_FEE <= 0 && feeRevenueThisMonth > 0) {
                revenueTotalsThisMonth.TRANSACTION_FEE = feeRevenueThisMonth;
            }

            const revenueThisMonth = Object.values(revenueTotalsThisMonth).reduce((acc, value) => acc + asAmount(value), 0);
            const netFlowThisMonth = depositsThisMonth - withdrawalsThisMonth;

            const netByDay = new Map();
            tx7d.forEach((tx) => {
                const createdKey = new Date(tx.created_at).toISOString().slice(0, 10);
                const t = String(tx.type || "").toUpperCase();
                const amount = Number(tx.amount) || 0;
                const delta = t === "WITHDRAWAL" ? -amount : t === "DEPOSIT" ? amount : 0;
                netByDay.set(createdKey, (netByDay.get(createdKey) || 0) + delta);
            });

            const netFlow7d = Array.from({ length: 7 }).map((_, idx) => {
                const d = new Date(sevenDaysAgo);
                d.setDate(sevenDaysAgo.getDate() + idx);
                const key = d.toISOString().slice(0, 10);
                return Number(netByDay.get(key) || 0);
            });

            const revenueByDay = new Map();
            revenueRows7d.forEach((row) => {
                const key = new Date(row.created_at).toISOString().slice(0, 10);
                revenueByDay.set(key, (revenueByDay.get(key) || 0) + asAmount(row.amount));
            });

            const hasLedgerTransactionFees7d = revenueRows7d.some((row) => String(row.category || "").toUpperCase() === "TRANSACTION_FEE");
            if (!hasLedgerTransactionFees7d) {
                tx7d.forEach((tx) => {
                    const meta = tx.metadata && typeof tx.metadata === "object" ? tx.metadata : null;
                    const fee =
                        meta && typeof meta.fee_amount !== "undefined"
                            ? Number(meta.fee_amount)
                            : meta && typeof meta.fee !== "undefined"
                                ? Number(meta.fee)
                                : 0;
                    if (!Number.isNaN(fee) && fee > 0) {
                        const key = new Date(tx.created_at).toISOString().slice(0, 10);
                        revenueByDay.set(key, (revenueByDay.get(key) || 0) + fee);
                    }
                });
            }

            const revenueTrend7d = Array.from({ length: 7 }).map((_, idx) => {
                const d = new Date(sevenDaysAgo);
                d.setDate(sevenDaysAgo.getDate() + idx);
                const key = d.toISOString().slice(0, 10);
                return Number(revenueByDay.get(key) || 0);
            });

            const balanceTrend7d = new Array(7).fill(0);
            let running = totalClientBalance;
            for (let i = 6; i >= 0; i -= 1) {
                balanceTrend7d[i] = running;
                running -= netFlow7d[i] || 0;
            }

            const recentRevenue = recentRevenueRows.length > 0
                ? recentRevenueRows.map((row) =>
                    buildRevenueFeedItem({
                        id: row.id,
                        category: String(row.category || "OTHER").toUpperCase(),
                        amount: row.amount,
                        reference: row.reference,
                        note: row.note,
                        created_at: row.created_at,
                        sourceType: row.source_type,
                        source: "LEDGER"
                    })
                )
                : monthTx
                    .map((tx) => {
                        const meta = tx.metadata && typeof tx.metadata === "object" ? tx.metadata : null;
                        const fee =
                            meta && typeof meta.fee_amount !== "undefined"
                                ? Number(meta.fee_amount)
                                : meta && typeof meta.fee !== "undefined"
                                    ? Number(meta.fee)
                                    : 0;
                        if (Number.isNaN(fee) || fee <= 0) return null;
                        return buildRevenueFeedItem({
                            id: `fee-${tx.created_at}-${tx.amount}`,
                            category: "TRANSACTION_FEE",
                            amount: fee,
                            reference: meta?.reference || "",
                            note: "Derived from transaction fee metadata",
                            created_at: tx.created_at,
                            sourceType: "TRANSACTION",
                            source: "TRANSACTION_FEE"
                        });
                    })
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);

            // Staff Users Statistics
            const { data: staffRows, error: staffError } = await supabase
                .from("staff_users")
                .select("id, status, role, last_login_at, created_at");

            const staffStats = {
                total: 0,
                active: 0,
                inactive: 0,
                roles: {},
                recentlyActive: 0
            };

            if (!staffError && Array.isArray(staffRows)) {
                const sevenDaysAgoDate = new Date(sevenDaysAgo);
                staffStats.total = staffRows.length;
                staffRows.forEach((staff) => {
                    const status = String(staff.status || "").toUpperCase();
                    if (status === "ACTIVE") staffStats.active++;
                    else staffStats.inactive++;

                    const role = String(staff.role || "UNKNOWN").toUpperCase();
                    staffStats.roles[role] = (staffStats.roles[role] || 0) + 1;

                    if (staff.last_login_at) {
                        const loginDate = new Date(staff.last_login_at);
                        if (loginDate >= sevenDaysAgoDate) staffStats.recentlyActive++;
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    currency,
                    totalClientBalance,
                    depositsThisMonth,
                    withdrawalsThisMonth,
                    netFlowThisMonth,
                    feeRevenueThisMonth,
                    revenueThisMonth,
                    revenueBreakdownThisMonth: buildRevenueBreakdown(revenueTotalsThisMonth),
                    revenueTrend7d,
                    recentRevenue,
                    netFlow7d,
                    balanceTrend7d,
                    staffStats,
                    asOf: now.toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getRevenueLedger(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const category = String(req.query.category || "").trim().toUpperCase();

            let query = supabase
                .from("revenue_ledger")
                .select("id, source_type, category, amount, currency, reference, note, created_at")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (category) {
                query = query.eq("category", category);
            }

            const { data, error } = await query;
            if (error) {
                if (isMissingRelationError(error)) {
                    res.json({ success: true, data: [], limit, offset });
                    return;
                }
                throw error;
            }

            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroups(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const targetGroup = String(req.query.targetGroup || "").trim();
            const collectorId = String(req.query.collectorId || "").trim();

            let query = supabase
                .from("susu_groups")
                .select("*")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (targetGroup) query = query.eq("target_group", targetGroup);
            if (collectorId) query = query.eq("collector_id", collectorId);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroup(req, res) {
        try {
            const groupId = String(req.params.groupId || "").trim();
            if (!groupId) {
                res.status(400).json({ success: false, message: "groupId is required" });
                return;
            }

            const { data, error } = await supabase
                .from("susu_groups")
                .select("*")
                .eq("id", groupId)
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroupMembers(req, res) {
        try {
            const groupId = String(req.params.groupId || "").trim();
            if (!groupId) {
                res.status(400).json({ success: false, message: "groupId is required" });
                return;
            }

            const { data, error } = await supabase
                .from("susu_memberships")
                .select(
                    `*,
                    users ( id, full_name, phone_number, email, kyc_status ),
                    susu_groups ( id, group_name, target_group, daily_contribution )`
                )
                .eq("group_id", groupId)
                .order("joined_at", { ascending: false });

            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [] });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroupContributions(req, res) {
        try {
            const groupId = String(req.params.groupId || "").trim();
            if (!groupId) {
                res.status(400).json({ success: false, message: "groupId is required" });
                return;
            }

            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));

            let query = supabase
                .from("susu_contributions")
                .select(
                    `*,
                    susu_memberships ( id, membership_number, users ( id, full_name, phone_number ) )`
                )
                .eq("group_id", groupId)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            const date = String(req.query.date || "").trim();
            if (date) {
                query = query.eq("contribution_date", date);
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroupLoans(req, res) {
        try {
            const groupId = String(req.params.groupId || "").trim();
            if (!groupId) {
                res.status(400).json({ success: false, message: "groupId is required" });
                return;
            }

            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const status = String(req.query.status || "").trim();

            let query = supabase
                .from("susu_loans")
                .select(
                    `*,
                    susu_memberships ( id, membership_number, users ( id, full_name, phone_number ) )`
                )
                .eq("group_id", groupId)
                .order("application_date", { ascending: false })
                .range(offset, offset + limit - 1);

            if (status) query = query.eq("status", status);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSusuGroupPayouts(req, res) {
        try {
            const groupId = String(req.params.groupId || "").trim();
            if (!groupId) {
                res.status(400).json({ success: false, message: "groupId is required" });
                return;
            }

            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const payoutDate = String(req.query.date || "").trim();
            const membershipId = String(req.query.membershipId || "").trim();

            let query = supabase
                .from("susu_payouts")
                .select(
                    `*,
                    susu_memberships ( id, membership_number, users ( id, full_name, phone_number ) )`
                )
                .eq("group_id", groupId)
                .order("payout_date", { ascending: false })
                .range(offset, offset + limit - 1);

            if (payoutDate) query = query.eq("payout_date", payoutDate);
            if (membershipId) query = query.eq("membership_id", membershipId);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createSusuGroup(req, res) {
        try {
            const { group_name, group_code, target_group, daily_contribution, cycle_days, tier, monthly_maintenance_fee } = req.body;

            if (!group_name || !group_code || !daily_contribution) {
                return res.status(400).json({ success: false, message: "group_name, group_code, and daily_contribution are required" });
            }

            const { data: group, error } = await supabase
                .from("susu_groups")
                .insert({
                    group_name,
                    group_code,
                    target_group,
                    daily_contribution,
                    cycle_days: cycle_days || 30,
                    tier: tier || 'SILVER',
                    monthly_maintenance_fee,
                    vault_cash: 0,
                    loan_portfolio: 0,
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuGroup(req, res) {
        try {
            const { groupId } = req.params;
            const updates = req.body;

            const { data: group, error } = await supabase
                .from("susu_groups")
                .update(updates)
                .eq("id", groupId)
                .select()
                .single();

            if (error) throw error;
            if (!group) {
                return res.status(404).json({ success: false, message: "Susu group not found" });
            }
            res.json({ success: true, data: group });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuGroup(req, res) {
        try {
            const { groupId } = req.params;
            const { error } = await supabase
                .from("susu_groups")
                .delete()
                .eq("id", groupId);

            if (error) throw error;
            res.json({ success: true, message: "Susu group deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Membership Management Methods
    static async createSusuMembership(req, res) {
        try {
            const { user_id, group_id, daily_contribution, guarantor_1_id, guarantor_2_id } = req.body;

            if (!user_id || !group_id || !daily_contribution) {
                return res.status(400).json({ success: false, message: "user_id, group_id, and daily_contribution are required" });
            }

            const { data: membership, error } = await supabase
                .from("susu_memberships")
                .insert({
                    user_id,
                    group_id,
                    daily_contribution,
                    guarantor_1_id,
                    guarantor_2_id,
                    current_balance: 0,
                    total_contributions: 0,
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: membership });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuMembership(req, res) {
        try {
            const { membershipId } = req.params;
            const updates = req.body;

            const { data: membership, error } = await supabase
                .from("susu_memberships")
                .update(updates)
                .eq("id", membershipId)
                .select()
                .single();

            if (error) throw error;
            if (!membership) {
                return res.status(404).json({ success: false, message: "Susu membership not found" });
            }
            res.json({ success: true, data: membership });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuMembership(req, res) {
        try {
            const { membershipId } = req.params;
            const { error } = await supabase
                .from("susu_memberships")
                .delete()
                .eq("id", membershipId);

            if (error) throw error;
            res.json({ success: true, message: "Susu membership deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Contribution Management Methods
    static async createSusuContribution(req, res) {
        try {
            const { membership_id, group_id, amount, contribution_date, payment_method, collector_id, transaction_reference } = req.body;

            if (!membership_id || !group_id || !amount || !contribution_date || !collector_id) {
                return res.status(400).json({ success: false, message: "membership_id, group_id, amount, contribution_date, and collector_id are required" });
            }

            const { data: contribution, error } = await supabase
                .from("susu_contributions")
                .insert({
                    membership_id,
                    group_id,
                    amount,
                    contribution_date,
                    payment_method: payment_method || 'CASH',
                    collector_id,
                    transaction_reference,
                    sms_sent: false
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: contribution });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuContribution(req, res) {
        try {
            const { contributionId } = req.params;
            const updates = req.body;

            const { data: contribution, error } = await supabase
                .from("susu_contributions")
                .update(updates)
                .eq("id", contributionId)
                .select()
                .single();

            if (error) throw error;
            if (!contribution) {
                return res.status(404).json({ success: false, message: "Susu contribution not found" });
            }
            res.json({ success: true, data: contribution });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuContribution(req, res) {
        try {
            const { contributionId } = req.params;
            const { error } = await supabase
                .from("susu_contributions")
                .delete()
                .eq("id", contributionId);

            if (error) throw error;
            res.json({ success: true, message: "Susu contribution deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Loan Management Methods
    static async createSusuLoan(req, res) {
        try {
            const { membership_id, amount, interest_rate, repayment_period, status } = req.body;

            if (!membership_id || !amount) {
                return res.status(400).json({ success: false, message: "membership_id and amount are required" });
            }

            const { data: loan, error } = await supabase
                .from("susu_loans")
                .insert({
                    membership_id,
                    amount,
                    interest_rate: interest_rate || 10.00,
                    repayment_period: repayment_period || 30,
                    status: status || 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: loan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuLoan(req, res) {
        try {
            const { loanId } = req.params;
            const updates = req.body;

            const { data: loan, error } = await supabase
                .from("susu_loans")
                .update(updates)
                .eq("id", loanId)
                .select()
                .single();

            if (error) throw error;
            if (!loan) {
                return res.status(404).json({ success: false, message: "Susu loan not found" });
            }
            res.json({ success: true, data: loan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuLoan(req, res) {
        try {
            const { loanId } = req.params;
            const { error } = await supabase
                .from("susu_loans")
                .delete()
                .eq("id", loanId);

            if (error) throw error;
            res.json({ success: true, message: "Susu loan deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Payout Management Methods
    static async createSusuPayout(req, res) {
        try {
            const { membership_id, cycle_id, amount, payout_date, status } = req.body;

            if (!membership_id || !cycle_id || !amount || !payout_date) {
                return res.status(400).json({ success: false, message: "membership_id, cycle_id, amount, and payout_date are required" });
            }

            const { data: payout, error } = await supabase
                .from("susu_payouts")
                .insert({
                    membership_id,
                    cycle_id,
                    amount,
                    payout_date,
                    status: status || 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuPayout(req, res) {
        try {
            const { payoutId } = req.params;
            const updates = req.body;

            const { data: payout, error } = await supabase
                .from("susu_payouts")
                .update(updates)
                .eq("id", payoutId)
                .select()
                .single();

            if (error) throw error;
            if (!payout) {
                return res.status(404).json({ success: false, message: "Susu payout not found" });
            }
            res.json({ success: true, data: payout });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuPayout(req, res) {
        try {
            const { payoutId } = req.params;
            const { error } = await supabase
                .from("susu_payouts")
                .delete()
                .eq("id", payoutId);

            if (error) throw error;
            res.json({ success: true, message: "Susu payout deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Cycle Management Methods
    static async getSusuCycles(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const groupId = String(req.query.groupId || "").trim();

            let query = supabase
                .from("susu_cycles")
                .select("*")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (groupId) query = query.eq("group_id", groupId);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createSusuCycle(req, res) {
        try {
            const { group_id, cycle_number, start_date, end_date } = req.body;

            if (!group_id || !cycle_number || !start_date || !end_date) {
                return res.status(400).json({ success: false, message: "group_id, cycle_number, start_date, and end_date are required" });
            }

            const { data: cycle, error } = await supabase
                .from("susu_cycles")
                .insert({
                    group_id,
                    cycle_number,
                    start_date,
                    end_date,
                    total_contributions: 0,
                    total_payouts: 0,
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: cycle });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuCycle(req, res) {
        try {
            const { cycleId } = req.params;
            const updates = req.body;

            const { data: cycle, error } = await supabase
                .from("susu_cycles")
                .update(updates)
                .eq("id", cycleId)
                .select()
                .single();

            if (error) throw error;
            if (!cycle) {
                return res.status(404).json({ success: false, message: "Susu cycle not found" });
            }
            res.json({ success: true, data: cycle });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuCycle(req, res) {
        try {
            const { cycleId } = req.params;
            const { error } = await supabase
                .from("susu_cycles")
                .delete()
                .eq("id", cycleId);

            if (error) throw error;
            res.json({ success: true, message: "Susu cycle deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Susu Fee Management Methods
    static async getSusuFees(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const groupId = String(req.query.groupId || "").trim();

            let query = supabase
                .from("susu_fees")
                .select("*")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (groupId) query = query.eq("group_id", groupId);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createSusuFee(req, res) {
        try {
            const { group_id, fee_type, amount, description } = req.body;

            if (!fee_type || !amount) {
                return res.status(400).json({ success: false, message: "fee_type and amount are required" });
            }

            const { data: fee, error } = await supabase
                .from("susu_fees")
                .insert({
                    group_id,
                    fee_type,
                    amount,
                    description
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: fee });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSusuFee(req, res) {
        try {
            const { feeId } = req.params;
            const updates = req.body;

            const { data: fee, error } = await supabase
                .from("susu_fees")
                .update(updates)
                .eq("id", feeId)
                .select()
                .single();

            if (error) throw error;
            if (!fee) {
                return res.status(404).json({ success: false, message: "Susu fee not found" });
            }
            res.json({ success: true, data: fee });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSusuFee(req, res) {
        try {
            const { feeId } = req.params;
            const { error } = await supabase
                .from("susu_fees")
                .delete()
                .eq("id", feeId);

            if (error) throw error;
            res.json({ success: true, message: "Susu fee deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Compliance Flag Management Methods
    static async getComplianceFlags(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const flagType = String(req.query.flagType || "").trim();
            const status = String(req.query.status || "").trim();

            let query = supabase
                .from("compliance_flags")
                .select("*, users(full_name, phone_number, risk_rating)")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (flagType) query = query.eq("flag_type", flagType);
            if (status) query = query.eq("status", status);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createComplianceFlag(req, res) {
        try {
            const { user_id, flag_type, description, amount_involved } = req.body;

            if (!flag_type || !description) {
                return res.status(400).json({ success: false, message: "flag_type and description are required" });
            }

            const { data: flag, error } = await supabase
                .from("compliance_flags")
                .insert({
                    user_id,
                    flag_type,
                    description,
                    amount_involved,
                    status: 'OPEN',
                    reported_to_bog: false
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: flag });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteComplianceFlag(req, res) {
        try {
            const { flagId } = req.params;
            const { error } = await supabase
                .from("compliance_flags")
                .delete()
                .eq("id", flagId);

            if (error) throw error;
            res.json({ success: true, message: "Compliance flag deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Revenue Ledger Management Methods
    static async createRevenueEntry(req, res) {
        try {
            const { category, source_type, source_id, amount, description, metadata, teller_id, susu_group_id, branch_id } = req.body;

            if (!category || !source_type || !amount) {
                return res.status(400).json({ success: false, message: "category, source_type, and amount are required" });
            }

            const { data: entry, error } = await supabase
                .from("revenue_ledger")
                .insert({
                    category,
                    source_type,
                    source_id,
                    amount,
                    description,
                    metadata,
                    teller_id,
                    susu_group_id,
                    branch_id
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: entry });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateRevenueEntry(req, res) {
        try {
            const { entryId } = req.params;
            const updates = req.body;

            const { data: entry, error } = await supabase
                .from("revenue_ledger")
                .update(updates)
                .eq("id", entryId)
                .select()
                .single();

            if (error) throw error;
            if (!entry) {
                return res.status(404).json({ success: false, message: "Revenue entry not found" });
            }
            res.json({ success: true, data: entry });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteRevenueEntry(req, res) {
        try {
            const { entryId } = req.params;
            const { error } = await supabase
                .from("revenue_ledger")
                .delete()
                .eq("id", entryId);

            if (error) throw error;
            res.json({ success: true, message: "Revenue entry deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Receipt Management Methods
    static async getReceipts(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));

            const { data, error } = await supabase
                .from("receipts")
                .select("*")
                .order("generated_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createReceipt(req, res) {
        try {
            const { transaction_id, receipt_number, receipt_type, customer_name, amount, payment_method } = req.body;

            if (!receipt_number || !receipt_type || !amount) {
                return res.status(400).json({ success: false, message: "receipt_number, receipt_type, and amount are required" });
            }

            const { data: receipt, error } = await supabase
                .from("receipts")
                .insert({
                    transaction_id,
                    receipt_number,
                    receipt_type,
                    customer_name,
                    amount,
                    payment_method,
                    email_sent: false,
                    sms_sent: false
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: receipt });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateReceipt(req, res) {
        try {
            const { receiptId } = req.params;
            const updates = req.body;

            const { data: receipt, error } = await supabase
                .from("receipts")
                .update(updates)
                .eq("id", receiptId)
                .select()
                .single();

            if (error) throw error;
            if (!receipt) {
                return res.status(404).json({ success: false, message: "Receipt not found" });
            }
            res.json({ success: true, data: receipt });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteReceipt(req, res) {
        try {
            const { receiptId } = req.params;
            const { error } = await supabase
                .from("receipts")
                .delete()
                .eq("id", receiptId);

            if (error) throw error;
            res.json({ success: true, message: "Receipt deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Audit Log Management Methods
    static async getAuditLogs(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const userId = String(req.query.userId || "").trim();
            const action = String(req.query.action || "").trim();

            let query = supabase
                .from("audit_logs")
                .select("*, users(full_name, phone_number)")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (userId) query = query.eq("user_id", userId);
            if (action) query = query.ilike("action", `%${action}%`);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createAuditLog(req, res) {
        try {
            const { user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent } = req.body;

            const { data: log, error } = await supabase
                .from("audit_logs")
                .insert({
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    old_values,
                    new_values,
                    ip_address,
                    user_agent
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: log });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // SMS Log Management Methods
    static async getSMSLogs(req, res) {
        try {
            const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
            const offset = Math.max(0, Number(req.query.offset || 0));
            const userId = String(req.query.userId || "").trim();
            const status = String(req.query.status || "").trim();

            let query = supabase
                .from("sms_logs")
                .select("*, users(full_name, phone_number)")
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (userId) query = query.eq("user_id", userId);
            if (status) query = query.eq("status", status);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: Array.isArray(data) ? data : [], limit, offset });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createSMSLog(req, res) {
        try {
            const { user_id, phone_number, message, status } = req.body;

            if (!phone_number || !message) {
                return res.status(400).json({ success: false, message: "phone_number and message are required" });
            }

            const { data: log, error } = await supabase
                .from("sms_logs")
                .insert({
                    user_id,
                    phone_number,
                    message,
                    status: status || 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: log });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateSMSLog(req, res) {
        try {
            const { logId } = req.params;
            const updates = req.body;

            const { data: log, error } = await supabase
                .from("sms_logs")
                .update(updates)
                .eq("id", logId)
                .select()
                .single();

            if (error) throw error;
            if (!log) {
                return res.status(404).json({ success: false, message: "SMS log not found" });
            }
            res.json({ success: true, data: log });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteSMSLog(req, res) {
        try {
            const { logId } = req.params;
            const { error } = await supabase
                .from("sms_logs")
                .delete()
                .eq("id", logId);

            if (error) throw error;
            res.json({ success: true, message: "SMS log deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getAdminHealth(req, res) {
        try {
            const startedAt = Date.now();
            const supabasePing = await supabase.from("users").select("id").limit(1);
            const supabaseOk = !supabasePing.error;

            res.json({
                success: true,
                data: {
                    ok: true,
                    uptimeSeconds: process.uptime(),
                    supabaseOk,
                    latencyMs: Date.now() - startedAt,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async runReconciliation(req, res) {
        try {
            const reconciliationService = require('../services/reconciliation.service');
            const result = await reconciliationService.reconcilieAllWallets();
            res.json({
                success: true,
                data: {
                    totalWallets: result.totalWallets,
                    discrepancies: result.discrepancies,
                    status: result.discrepancies.length > 0 ? 'FAILED' : 'PASSED'
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async runLoadTest(req, res) {
        try {
            const { runLoadTest } = require('../scripts/load-test');
            const { CONCURRENT_COLLECTIONS } = process.env;
            await runLoadTest();
            res.json({
                success: true,
                data: {
                    message: 'Load test initiated',
                    collections: CONCURRENT_COLLECTIONS || 100
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Teller Management Methods
    static async getTellers(req, res) {
        try {
            let tellers = null;
            let error = null;

            // Prefer the current schema (branches).
            ({ data: tellers, error } = await supabase
                .from('tellers')
                .select('*, branches(name, branch_code, region, address)')
                .order('created_at', { ascending: false }));

            // Fallback for older schemas where the relation/table was named differently.
            if (error) {
                ({ data: tellers, error } = await supabase
                    .from('tellers')
                    .select('*, branch_accounts(branch_name, branch_code, location)')
                    .order('created_at', { ascending: false }));
            }

            // Final fallback: no join.
            if (error) {
                ({ data: tellers, error } = await supabase
                    .from('tellers')
                    .select('*')
                    .order('created_at', { ascending: false }));
            }

            if (error) throw error;

            const rows = Array.isArray(tellers) ? tellers : [];
            const normalized = rows.map((t) => {
                const branchObj = (t?.branches && typeof t.branches === "object")
                    ? t.branches
                    : (t?.branch_accounts && typeof t.branch_accounts === "object")
                        ? t.branch_accounts
                        : null;

                const branchName = branchObj ? (branchObj.name || branchObj.branch_name) : undefined;
                const branchCode = branchObj ? (branchObj.branch_code || branchObj.branchCode) : undefined;
                const location = branchObj ? (branchObj.location || branchObj.region || branchObj.address) : undefined;

                return {
                    ...t,
                    branch_name: branchName,
                    branch_code: branchCode,
                    location,
                    daily_limit: typeof t?.daily_limit !== "undefined" ? t.daily_limit : (typeof t?.dailyLimit !== "undefined" ? t.dailyLimit : 0),
                    current_cash_position:
                        typeof t?.current_cash_position !== "undefined"
                            ? t.current_cash_position
                            : typeof t?.currentCashPosition !== "undefined"
                                ? t.currentCashPosition
                                : typeof t?.cash_position !== "undefined"
                                    ? t.cash_position
                                    : 0
                };
            });

            if (normalized.length === 0) {
                const { data: staffTellers, error: staffError } = await supabase
                    .from("staff_users")
                    .select("id, staff_code, full_name, status, created_at")
                    .eq("role", "TELLER")
                    .order("created_at", { ascending: false });

                if (staffError) throw staffError;

                const staffRows = Array.isArray(staffTellers) ? staffTellers : [];
                const fallback = staffRows.map((s) => ({
                    id: s.id,
                    teller_code: s.staff_code,
                    full_name: s.full_name,
                    branch_id: "",
                    branch_name: undefined,
                    daily_limit: 0,
                    current_cash_position: 0,
                    status: s.status,
                    created_at: s.created_at,
                }));

                res.json({ success: true, data: fallback });
                return;
            }

            res.json({ success: true, data: normalized });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getTeller(req, res) {
        try {
            const { tellerId } = req.params;
            const { data: teller, error } = await supabase
                .from('tellers')
                .select('*, branch_accounts(*)')
                .eq('id', tellerId)
                .single();

            if (error) throw error;
            if (!teller) {
                return res.status(404).json({ success: false, message: 'Teller not found' });
            }
            res.json({ success: true, data: teller });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createTeller(req, res) {
        try {
            const {
                teller_code,
                full_name,
                branch_id,
                daily_limit,
                status,
                staff_email,
                staff_phone_number,
                staff_password
            } = req.body;
            const normalizedCode = String(teller_code || "").trim();
            const normalizedName = String(full_name || "").trim();
            const normalizedBranch = String(branch_id || "").trim();

            if (!normalizedCode || !normalizedName || !normalizedBranch) {
                return res.status(400).json({
                    success: false,
                    message: "teller_code, full_name and branch_id are required"
                });
            }

            const normalizedStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(String(status || "").toUpperCase())
                ? String(status).toUpperCase()
                : "ACTIVE";
            const defaultEmail = `${normalizedCode.toLowerCase().replace(/[^a-z0-9_-]/g, "")}@staff.susu-bg.local`;
            const normalizedEmail = String(staff_email || defaultEmail).trim().toLowerCase();
            const normalizedPhone = String(staff_phone_number || "").trim() || null;
            const passwordHash = await bcrypt.hash(String(staff_password || "admin123"), 10);

            const { data: staffUser, error: staffError } = await supabase
                .from("staff_users")
                .upsert(
                    {
                        staff_code: normalizedCode,
                        full_name: normalizedName,
                        email: normalizedEmail,
                        phone_number: normalizedPhone,
                        role: "TELLER",
                        status: normalizedStatus,
                        password_hash: passwordHash
                    },
                    { onConflict: "staff_code" }
                )
                .select("id, staff_code, email, role, status")
                .single();

            if (staffError) throw staffError;
            
            const { data: teller, error } = await supabase
                .from('tellers')
                .insert({
                    teller_code: normalizedCode,
                    full_name: normalizedName,
                    branch_id: normalizedBranch,
                    staff_user_id: staffUser.id,
                    daily_limit: daily_limit || 50000,
                    current_cash_position: 0,
                    status: normalizedStatus
                })
                .select()
                .single();

            if (error) throw error;
            res.json({
                success: true,
                data: teller,
                staff_user: staffUser,
                message: "Teller and staff identity created successfully"
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateTeller(req, res) {
        try {
            const { tellerId } = req.params;
            const updates = req.body;
            const tellerStatus = String(updates?.status || "").toUpperCase();
            const normalizedStatus = ["ACTIVE", "INACTIVE", "SUSPENDED"].includes(tellerStatus)
                ? tellerStatus
                : null;

            const { data: teller, error } = await supabase
                .from('tellers')
                .update(updates)
                .eq('id', tellerId)
                .select()
                .single();

            if (error) throw error;
            if (!teller) {
                return res.status(404).json({ success: false, message: 'Teller not found' });
            }

            if (teller.staff_user_id) {
                const staffUpdates = {};
                if (typeof updates.full_name === "string" && updates.full_name.trim()) {
                    staffUpdates.full_name = updates.full_name.trim();
                }
                if (typeof updates.teller_code === "string" && updates.teller_code.trim()) {
                    staffUpdates.staff_code = updates.teller_code.trim();
                }
                if (normalizedStatus) {
                    staffUpdates.status = normalizedStatus;
                }

                if (Object.keys(staffUpdates).length > 0) {
                    const { error: staffUpdateError } = await supabase
                        .from("staff_users")
                        .update(staffUpdates)
                        .eq("id", teller.staff_user_id);
                    if (staffUpdateError) throw staffUpdateError;
                }
            }
            res.json({ success: true, data: teller });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteTeller(req, res) {
        try {
            const { tellerId } = req.params;
            const { error } = await supabase
                .from('tellers')
                .delete()
                .eq('id', tellerId);

            if (error) throw error;
            res.json({ success: true, message: 'Teller deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Branch Management Methods
    static async getBranches(req, res) {
        try {
            let branches = null;
            let error = null;

            ({ data: branches, error } = await supabase
                .from('branches')
                .select('*')
                .order('created_at', { ascending: false }));

            // Fallback for older schemas.
            if (error) {
                ({ data: branches, error } = await supabase
                    .from('branch_accounts')
                    .select('*')
                    .order('created_at', { ascending: false }));
            }

            if (error) throw error;

            const rows = Array.isArray(branches) ? branches : [];
            const normalized = rows.map((b) => ({
                ...b,
                branch_name: b?.branch_name || b?.name,
                location: b?.location || b?.region || b?.address || ""
            }));

            res.json({ success: true, data: normalized });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getBranch(req, res) {
        try {
            const { branchId } = req.params;
            const { data: branch, error } = await supabase
                .from('branches')
                .select('*')
                .eq('id', branchId)
                .single();

            if (error) throw error;
            if (!branch) {
                return res.status(404).json({ success: false, message: 'Branch not found' });
            }
            res.json({ success: true, data: branch });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async createBranch(req, res) {
        try {
            const { branch_name, branch_code, location } = req.body;
            
            const { data: branch, error } = await supabase
                .from('branches')
                .insert({
                    name: branch_name,
                    branch_code,
                    status: 'ACTIVE'
                })
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data: branch });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async updateBranch(req, res) {
        try {
            const { branchId } = req.params;
            const updates = req.body;

            const { data: branch, error } = await supabase
                .from('branches')
                .update(updates)
                .eq('id', branchId)
                .select()
                .single();

            if (error) throw error;
            if (!branch) {
                return res.status(404).json({ success: false, message: 'Branch not found' });
            }
            res.json({ success: true, data: branch });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async deleteBranch(req, res) {
        try {
            const { branchId } = req.params;
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', branchId);

            if (error) throw error;
            res.json({ success: true, message: 'Branch deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Compliance Management Methods
    static async getComplianceDashboard(req, res) {
        try {
            const dashboard = await AMLService.getComplianceDashboard();
            res.json({ success: true, ...dashboard });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getComplianceFlag(req, res) {
        try {
            const { flagId } = req.params;
            const { data: flag, error } = await supabase
                .from('compliance_flags')
                .select('*, users(full_name, phone_number, risk_rating)')
                .eq('id', flagId)
                .single();

            if (error) throw error;
            if (!flag) {
                return res.status(404).json({ success: false, message: 'Compliance flag not found' });
            }
            res.json({ success: true, data: flag });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async markFlagAsReported(req, res) {
        try {
            const { flagId } = req.params;
            const result = await AMLService.markAsReportedToBoG(flagId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async resolveComplianceFlag(req, res) {
        try {
            const { flagId } = req.params;
            const { resolutionNotes } = req.body;
            const result = await AMLService.resolveFlag(flagId, resolutionNotes);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getCTRReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await AMLService.generateCTRReport(startDate, endDate);
            res.json({ success: true, data: report });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getSTRReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await AMLService.generateSTRReport(startDate, endDate);
            res.json({ success: true, data: report });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = AdminController;
