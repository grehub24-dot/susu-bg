const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const supabase = require("../lib/supabase");

const generateToken = () => crypto.randomUUID();
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const ROLES = ["MANAGER", "SUPERVISOR", "TELLER", "LOAN_OFFICER", "SUSU_COLLECTOR", "AUDITOR"];

const staffRolesSchema = z.object({
  role: z.enum(ROLES)
});

const createStaffSchema = z.object({
  staff_code: z.string().min(2).max(20),
  full_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().min(10).max(20),
  role: z.enum(ROLES),
  password: z.string().min(6).max(128)
});

const updateStaffSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().min(10).max(20).optional(),
  role: z.enum(ROLES).optional()
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6).max(128)
});

const lockReasonSchema = z.object({
  reason: z.string().min(1).max(255).optional()
});

class StaffAdminController {
  static async getAllStaff(req, res) {
    try {
      const { data: staff, error } = await supabase
        .from("staff_users")
        .select(`
          id,
          staff_code,
          full_name,
          email,
          phone_number,
          role,
          status,
          failed_login_attempts,
          locked_until,
          last_login_at,
          mfa_enabled,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        staff: staff || []
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getStaffStats(req, res) {
    try {
      const { data: staff, error } = await supabase
        .from("staff_users")
        .select("id, status, role, last_login_at, created_at");

      if (error) throw new Error(error.message);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        roles: {},
        recentlyActive: 0
      };

      if (Array.isArray(staff)) {
        stats.total = staff.length;
        staff.forEach((s) => {
          const status = String(s.status || "").toUpperCase();
          if (status === "ACTIVE") stats.active++;
          else stats.inactive++;

          const role = String(s.role || "UNKNOWN").toUpperCase();
          stats.roles[role] = (stats.roles[role] || 0) + 1;

          if (s.last_login_at) {
            const loginDate = new Date(s.last_login_at);
            if (loginDate >= sevenDaysAgo) stats.recentlyActive++;
          }
        });
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
        res.status(400).json({ success: false, message: "Invalid status" });
        return;
      }

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, status")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const { error: updateError } = await supabase
        .from("staff_users")
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: `Staff status updated to ${status}`
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async changeRole(req, res) {
    try {
      const { id } = req.params;
      const parsed = staffRolesSchema.parse(req.body);

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, role")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const { error: updateError } = await supabase
        .from("staff_users")
        .update({
          role: parsed.role,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const previousRole = String(staff.role || "").toUpperCase();
      const nextRole = String(parsed.role || "").toUpperCase();

      if (previousRole === "TELLER" && nextRole !== "TELLER") {
        try {
          const { error: tellerUpdateError } = await supabase
            .from("tellers")
            .update({
              status: "INACTIVE"
            })
            .eq("staff_user_id", id);

          if (tellerUpdateError) {
            console.warn("Failed to deactivate teller profile for staff role change:", tellerUpdateError);
          }
        } catch (e) {
          console.warn("Failed to deactivate teller profile for staff role change:", e);
        }
      }

      res.json({
        success: true,
        message: `Role changed to ${parsed.role}`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid role",
          issues: error.issues
        });
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async lockAccount(req, res) {
    try {
      const { id } = req.params;
      const parsed = lockReasonSchema.optional().parse(req.body || {});

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, status, locked_until")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const lockUntil = addMinutes(60 * 24);

      const { error: updateError } = await supabase
        .from("staff_users")
        .update({
          locked_until: lockUntil,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: "Account locked for 24 hours"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async unlockAccount(req, res) {
    try {
      const { id } = req.params;

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, locked_until")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const { error: updateError } = await supabase
        .from("staff_users")
        .update({
          locked_until: null,
          failed_login_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: "Account unlocked successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getSessionTokens(req, res) {
    try {
      const { id } = req.params;

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, staff_code, admin_session_token, admin_session_expires_at")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const sessions = [];
      if (staff.admin_session_token) {
        sessions.push({
          token_type: "admin_session",
          token: staff.admin_session_token,
          expires_at: staff.admin_session_expires_at,
          is_active: staff.admin_session_expires_at && new Date(staff.admin_session_expires_at).getTime() > Date.now()
        });
      }

      const { data: jwtSessions } = await supabase
        .from("staff_sessions")
        .select("*")
        .eq("staff_user_id", id)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString());

      if (jwtSessions) {
        sessions.push(...jwtSessions.map(s => ({
          token_type: "jwt_session",
          token: s.id,
          expires_at: s.expires_at,
          ip_address: s.ip_address,
          user_agent: s.user_agent
        })));
      }

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async viewFailedAttempts(req, res) {
    try {
      const { data: staff, error } = await supabase
        .from("staff_users")
        .select(`
          id,
          staff_code,
          full_name,
          email,
          failed_login_attempts,
          locked_until,
          last_login_at
        `)
        .gt("failed_login_attempts", 0)
        .order("failed_login_attempts", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        staff: staff || []
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getActiveSessions(req, res) {
    try {
      const { data: sessions, error } = await supabase
        .from("staff_sessions")
        .select(`
          id,
          staff_user_id,
          ip_address,
          user_agent,
          expires_at,
          created_at
        `)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const sessionsWithStaff = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: staff } = await supabase
            .from("staff_users")
            .select("staff_code, full_name, email")
            .eq("id", session.staff_user_id)
            .single();
          return {
            ...session,
            staff_code: staff?.staff_code,
            full_name: staff?.full_name,
            email: staff?.email
          };
        })
      );

      const { data: adminSessions } = await supabase
        .from("staff_users")
        .select("id, admin_session_token, admin_session_expires_at, staff_code, full_name, email")
        .not("admin_session_token", "is", null)
        .gt("admin_session_expires_at", new Date().toISOString());

      const adminSessionList = (adminSessions || []).map(s => ({
        id: s.id,
        token_type: "admin_session",
        staff_code: s.staff_code,
        full_name: s.full_name,
        email: s.email,
        token: s.admin_session_token,
        expires_at: s.admin_session_expires_at
      }));

      res.json({
        success: true,
        sessions: [...adminSessionList, ...sessionsWithStaff]
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async forceLogout(req, res) {
    try {
      const { id } = req.params;

      const { data: session, error: fetchError } = await supabase
        .from("staff_sessions")
        .select("id, staff_user_id")
        .eq("id", id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        const { data: adminSession } = await supabase
          .from("staff_users")
          .select("id")
          .eq("id", id)
          .single();

        if (adminSession) {
          await supabase
            .from("staff_users")
            .update({
              admin_session_token: null,
              admin_session_expires_at: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);

          res.json({ success: true, message: "Admin session revoked" });
          return;
        }

        res.status(404).json({ success: false, message: "Session not found" });
        return;
      }

      if (!session) {
        res.status(404).json({ success: false, message: "Session not found" });
        return;
      }

      const { error: updateError } = await supabase
        .from("staff_sessions")
        .update({
          revoked_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: "Session revoked successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const parsed = resetPasswordSchema.parse(req.body);

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, email, full_name")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const passwordHash = await bcrypt.hash(parsed.newPassword, 12);

      const { error: updateError } = await supabase
        .from("staff_users")
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: "Password reset successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues
        });
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async createStaff(req, res) {
    try {
      const parsed = createStaffSchema.parse(req.body);

      const { data: existing, error: existingError } = await supabase
        .from("staff_users")
        .select("id")
        .or(`email.eq.${parsed.email},staff_code.eq.${parsed.staff_code}`)
        .single();

      if (existing) {
        res.status(400).json({ success: false, message: "Staff code or email already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(parsed.password, 12);

      const { data: staff, error: insertError } = await supabase
        .from("staff_users")
        .insert({
          staff_code: parsed.staff_code,
          full_name: parsed.full_name,
          email: parsed.email,
          phone_number: parsed.phone_number,
          role: parsed.role,
          password_hash: passwordHash,
          status: "ACTIVE"
        })
        .select("id, staff_code, full_name, email, role, status")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      res.status(201).json({
        success: true,
        message: "Staff created successfully",
        staff
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues
        });
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateStaff(req, res) {
    try {
      const { id } = req.params;
      const parsed = updateStaffSchema.parse(req.body);

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      const updateData = {
        ...parsed,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("staff_users")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      res.json({
        success: true,
        message: "Staff updated successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          issues: error.issues
        });
        return;
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteStaff(req, res) {
    try {
      const { id } = req.params;

      const { data: staff, error: fetchError } = await supabase
        .from("staff_users")
        .select("id, role")
        .eq("id", id)
        .single();

      if (fetchError || !staff) {
        res.status(404).json({ success: false, message: "Staff not found" });
        return;
      }

      if (staff.role === "ADMIN") {
        res.status(400).json({ success: false, message: "Cannot delete admin accounts" });
        return;
      }

      const { error: deleteError } = await supabase
        .from("staff_users")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      res.json({
        success: true,
        message: "Staff deleted successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      const { data: staff } = await supabase
        .from("staff_users")
        .select("staff_code, full_name, email")
        .eq("id", id)
        .single();

      res.json({
        success: true,
        staff: staff ? {
          staff_code: staff.staff_code,
          full_name: staff.full_name,
          email: staff.email
        } : null,
        logs: logs || [],
        total: logs?.length || 0
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = StaffAdminController;