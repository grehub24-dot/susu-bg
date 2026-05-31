// backend/src/controllers/admin-branches.controller.js
const supabase = require("../lib/supabase");
const bcrypt = require("bcryptjs");

class AdminBranchesController {
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
}

module.exports = AdminBranchesController;
