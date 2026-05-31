// backend/src/controllers/admin-susu.controller.js
const supabase = require("../lib/supabase");

class AdminSusuController {
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
}

module.exports = AdminSusuController;
