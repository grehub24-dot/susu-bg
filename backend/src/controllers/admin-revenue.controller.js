// backend/src/controllers/admin-revenue.controller.js
const supabase = require("../lib/supabase");

const isMissingRelationError = (error) => String(error?.code || "") === "42P01";

class AdminRevenueController {
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
}

module.exports = AdminRevenueController;
