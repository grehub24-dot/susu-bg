// backend/src/controllers/admin-system.controller.js
const supabase = require("../lib/supabase");

class AdminSystemController {
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
}

module.exports = AdminSystemController;
