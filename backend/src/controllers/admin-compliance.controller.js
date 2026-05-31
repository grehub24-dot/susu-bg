// backend/src/controllers/admin-compliance.controller.js
const supabase = require("../lib/supabase");

class AdminComplianceController {
    static async getComplianceDashboard(req, res) {
        try {
            const dashboard = await AMLService.getComplianceDashboard();
            res.json({ success: true, ...dashboard });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

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

module.exports = AdminComplianceController;
