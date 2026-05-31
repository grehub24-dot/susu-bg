const { z } = require("zod");
const TellerService = require("../services/teller.service");
const { createAuthCookie, clearAuthCookie } = require("../lib/cookie");

const findClientSchema = z.object({
    identifier: z.string().min(3)
});

const loginSchema = z.object({
    tellerCode: z.string().min(3),
    password: z.string().min(4)
});

const depositSchema = z.object({
    clientId: z.string().uuid(),
    amount: z.number().positive(),
    tellerId: z.string().uuid(),
    paymentMethod: z.enum(['CASH', 'BANK_DEPOSIT', 'MOBILE_MONEY']).default('CASH')
});

const withdrawalSchema = z.object({
    clientId: z.string().uuid(),
    amount: z.number().positive(),
    tellerId: z.string().uuid(),
    pin: z.string().min(4).max(6),
    paymentMethod: z.enum(['CASH', 'BANK_WITHDRAWAL', 'MOBILE_MONEY']).default('CASH')
});

const receiptSchema = z.object({
    reference: z.string().min(8)
});

const balanceSchema = z.object({
    tellerId: z.string().uuid(),
    cashPosition: z.number()
});

class TellerController {
    static async login(req, res) {
        try {
            const parsed = loginSchema.parse(req.body);
            const session = await TellerService.loginTeller(parsed.tellerCode, parsed.password);
            
            const expiryHours = Number(process.env.TELLER_SESSION_EXPIRY_HOURS) || 8;
            res.setHeader("Set-Cookie", createAuthCookie("teller_session", session.sessionId, expiryHours));
            res.json({ success: true, session });

        } catch (error) {
            res.status(401).json({ success: false, message: error.message });
        }
    }

    static async logout(req, res) {
        try {
            const sessionId = req.headers['x-session-id'];
            if (!sessionId) {
                return res.status(400).json({ success: false, message: "Session ID required" });
            }

            await TellerService.logoutTeller(sessionId);
            
            res.setHeader("Set-Cookie", clearAuthCookie("teller_session"));
            res.json({ success: true, message: "Logged out successfully" });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getSession(req, res) {
        try {
            const sessionId = req.headers['x-session-id'];
            if (!sessionId) {
                return res.status(400).json({ success: false, message: "Session ID required" });
            }

            const session = await TellerService.getSession(sessionId);
            
            res.json({ success: true, session });

        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    static async findClient(req, res) {
        try {
            const parsed = findClientSchema.parse(req.query);
            const client = await TellerService.findClient(parsed.identifier);
            
            res.json({ 
                success: true, 
                client: {
                    id: client.id,
                    full_name: client.full_name,
                    email: client.email,
                    phone_number: client.phone_number,
                    wallet: client.wallets?.[0] || null
                }
            });

        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    static async processDeposit(req, res) {
        try {
            const parsed = depositSchema.parse(req.body);
            const result = await TellerService.processDeposit(
                parsed.clientId,
                parsed.amount,
                parsed.tellerId,
                parsed.paymentMethod
            );

            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async processWithdrawal(req, res) {
        try {
            const parsed = withdrawalSchema.parse(req.body);
            const result = await TellerService.processWithdrawal(
                parsed.clientId,
                parsed.amount,
                parsed.tellerId,
                parsed.pin,
                parsed.paymentMethod
            );

            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async generateReceipt(req, res) {
        try {
            const parsed = receiptSchema.parse(req.query);
            const receipt = await TellerService.generateReceipt(parsed.reference);
            
            res.json({ success: true, receipt });

        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    static async getTransactions(req, res) {
        try {
            const tellerId = req.query.tellerId;
            const limit = parseInt(req.query.limit) || 50;
            
            if (!tellerId) {
                return res.status(400).json({ success: false, message: "Teller ID required" });
            }

            const transactions = await TellerService.getTellerTransactions(tellerId, limit);
            
            res.json({ success: true, data: transactions });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getDailySummary(req, res) {
        try {
            const tellerId = req.query.tellerId;
            
            if (!tellerId) {
                return res.status(400).json({ success: false, message: "Teller ID required" });
            }

            const summary = await TellerService.getDailyTellerSummary(tellerId);
            
            res.json({ success: true, data: summary });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async updateCashPosition(req, res) {
        try {
            const parsed = balanceSchema.parse(req.body);
            const result = await TellerService.updateCashPosition(parsed.tellerId, parsed.cashPosition);
            
            res.json({ success: true, ...result });

        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = TellerController;
