const supabase = require("../lib/supabase");

const requireAdminSession = async (req, res, next) => {
  try {
    const adminSessionToken = req.header("x-admin-session-token");

    if (!adminSessionToken) {
      res.status(401).json({ success: false, message: "Unauthorized: No session token provided" });
      return;
    }

    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("session_token", adminSessionToken)
      .single();

    if (error || !admin) {
      res.status(401).json({ success: false, message: "Unauthorized: Invalid session token" });
      return;
    }

    if (String(admin.status || "").toUpperCase() !== "ACTIVE") {
      res.status(403).json({ success: false, message: "Forbidden: Admin account is inactive" });
      return;
    }

    if (!admin.session_expires_at || new Date(admin.session_expires_at).getTime() < Date.now()) {
      res.status(401).json({ success: false, message: "Unauthorized: Session expired" });
      return;
    }

    const normalizedRole = String(admin?.role || "ADMIN").toUpperCase();

    req.adminUser = {
      id: admin.id,
      admin_code: admin.admin_code,
      full_name: admin.full_name,
      email: admin.email,
      phone_number: admin.phone_number,
      role: normalizedRole
    };

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Admin auth failed" });
  }
};

module.exports = requireAdminSession;