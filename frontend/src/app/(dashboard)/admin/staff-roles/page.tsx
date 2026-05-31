"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Search, Users, Activity, Key, Lock, Unlock, 
  RefreshCw, Trash2, X, Eye, EyeOff, Clock, AlertTriangle,
  CheckCircle, XCircle, ChevronDown, LogOut, FileText,
  Loader2, Plus, Edit2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

const ROLES = [
  { id: "MANAGER", name: "Manager", color: "bg-blue-500" },
  { id: "SUPERVISOR", name: "Supervisor", color: "bg-cyan-500" },
  { id: "TELLER", name: "Teller", color: "bg-green-500" },
  { id: "LOAN_OFFICER", name: "Loan Officer", color: "bg-amber-500" },
  { id: "SUSU_COLLECTOR", name: "Susu Collector", color: "bg-pink-500" },
  { id: "AUDITOR", name: "Auditor", color: "bg-slate-500" },
];

type StaffMember = {
  id: string;
  staff_code: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  status: string;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  mfa_enabled: boolean;
  created_at: string;
};

type Session = {
  id: string;
  staff_user_id: string;
  staff_code: string;
  full_name: string;
  email: string;
  token_type: string;
  token: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
};

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  created_at: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
};

type Tab = "security" | "maintenance";

export default function StaffRolesPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isValidating, setIsValidating] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("security");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [staffSessions, setStaffSessions] = useState<Session[]>([]);

  useEffect(() => {
    const validateAdminSession = async () => {
      try {
        const response = await fetch('/api/admin-auth/verify-session', {
          method: 'GET',
          credentials: 'same-origin'
        });

        if (!response.ok) {
          router.replace('/admin-login');
          return;
        }
      } catch {
        router.replace('/admin-login');
      } finally {
        setIsValidating(false);
      }
    };

    validateAdminSession();
  }, [router]);

  useEffect(() => {
    if (!isValidating) {
      fetchStaff();
      if (activeTab === "maintenance") {
        fetchSessions();
      }
    }
  }, [isValidating, activeTab]);

const getAdminToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('admin_session='))
      ?.split('=')[1] || "";
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/staff-admin/staff", {
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff);
      }
    } catch {
      showError("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/staff-admin/sessions", {
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch {
      showError("Failed to load sessions");
    }
  };

  const fetchStaffSessions = async (staffId: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffId}/sessions`, {
        headers: { 'x-admin-session-token': token }
      });
      const data = await response.json();
      if (data.success) {
        setStaffSessions(data.sessions);
      }
    } catch {
      showError("Failed to load sessions");
    }
  };

  const fetchAuditLogs = async (staffId: string) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffId}/audit-logs`, {
        headers: { 'x-admin-session-token': token }
      });
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch {
      showError("Failed to load audit logs");
    }
  };

  const handleToggleStatus = async (staffMember: StaffMember) => {
    const newStatus = staffMember.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setActionLoading(staffMember.id);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffMember.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Staff ${newStatus.toLowerCase()}`);
        fetchStaff();
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (staffMember: StaffMember, newRole: string) => {
    setActionLoading(staffMember.id);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffMember.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Role changed to ${newRole}`);
        fetchStaff();
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to change role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockAccount = async (staffMember: StaffMember) => {
    setActionLoading(staffMember.id);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffMember.id}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        }
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Account locked for 24 hours");
        fetchStaff();
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to lock account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlockAccount = async (staffMember: StaffMember) => {
    setActionLoading(staffMember.id);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${staffMember.id}/unlock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        }
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Account unlocked");
        fetchStaff();
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to unlock account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceLogout = async (sessionId: string) => {
    if (!confirm("Force logout this session?")) return;
    setActionLoading(sessionId);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        }
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Session revoked");
        fetchSessions();
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to revoke session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff || !resetPassword) return;
    setActionLoading("reset-password");
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/staff-admin/staff/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session-token': token
        },
        body: JSON.stringify({ newPassword: resetPassword })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Password reset successfully");
        setShowResetPasswordModal(false);
        setResetPassword("");
        setSelectedStaff(null);
      } else {
        showError(data.message);
      }
    } catch {
      showError("Failed to reset password");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewSessions = async (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    await fetchStaffSessions(staffMember.id);
    setShowSessionsModal(true);
  };

  const handleViewAuditLogs = async (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    await fetchAuditLogs(staffMember.id);
    setShowAuditModal(true);
  };

  const handleOpenResetPassword = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setShowResetPasswordModal(true);
  };

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.staff_code.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted)]">Validating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5] p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-[#2d3436] flex items-center gap-2">
            <Shield className="w-8 h-8 text-[#A8D5BA]" />
            Staff Role Management
          </h1>
          <p className="text-zinc-500 mt-1">Security, Test & Maintenance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        >
          <div className="border-b border-zinc-100">
            <div className="flex">
              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === "security"
                    ? "text-[#2d3436] border-b-2 border-[#A8D5BA]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Shield size={18} />
                Security
              </button>
              <button
                onClick={() => setActiveTab("maintenance")}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === "maintenance"
                    ? "text-[#2d3436] border-b-2 border-[#A8D5BA]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Activity size={18} />
                Maintenance
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "security" ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search staff..."
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 outline-none"
                    />
                  </div>
                  <div className="text-sm text-zinc-500">
                    {filteredStaff.length} staff members
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Staff Code</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Name</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Role</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Status</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Failed</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map((item) => (
                          <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                            <td className="py-3 px-2 font-mono text-sm">{item.staff_code}</td>
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-medium text-[#2d3436]">{item.full_name}</p>
                                <p className="text-xs text-zinc-500">{item.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={item.role}
                                onChange={(e) => handleChangeRole(item, e.target.value)}
                                disabled={actionLoading === item.id}
                                className={`text-xs px-2 py-1 rounded-full text-white ${ROLES.find(r => r.id === item.role)?.color || "bg-zinc-500"} cursor-pointer`}
                              >
                                {ROLES.map((role) => (
                                  <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`flex items-center gap-1 text-xs ${
                                item.status === "ACTIVE" ? "text-green-600" :
                                item.status === "LOCKED" ? "text-red-600" : "text-zinc-500"
                              }`}>
                                {item.status === "ACTIVE" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {item.failed_login_attempts > 0 ? (
                                <span className="flex items-center gap-1 text-xs text-red-500">
                                  <AlertTriangle size={14} />
                                  {item.failed_login_attempts}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => item.status === "ACTIVE" || item.locked_until ? handleLockAccount(item) : handleUnlockAccount(item)}
                                  disabled={actionLoading === item.id}
                                  className={`p-2 rounded-lg transition-colors ${
                                    item.locked_until ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"
                                  }`}
                                  title={item.locked_until ? "Unlock Account" : "Lock Account"}
                                >
                                  {item.locked_until ? <Unlock size={16} /> : <Lock size={16} />}
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(item)}
                                  disabled={actionLoading === item.id}
                                  className="p-2 text-zinc-400 hover:text-[#2d3436] hover:bg-zinc-100 rounded-lg"
                                  title={item.status === "ACTIVE" ? "Disable" : "Enable"}
                                >
                                  {item.status === "ACTIVE" ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </button>
                                <button
                                  onClick={() => handleViewSessions(item)}
                                  className="p-2 text-zinc-400 hover:text-[#2d3436] hover:bg-zinc-100 rounded-lg"
                                  title="View Sessions"
                                >
                                  <Key size={16} />
                                </button>
                                <button
                                  onClick={() => handleViewAuditLogs(item)}
                                  className="p-2 text-zinc-400 hover:text-[#2d3436] hover:bg-zinc-100 rounded-lg"
                                  title="View Audit Logs"
                                >
                                  <FileText size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredStaff.length === 0 && (
                      <p className="text-center py-8 text-zinc-400">No staff found</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#2d3436]">Active Sessions</h3>
                  <button
                    onClick={fetchSessions}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-[#2d3436]"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Staff</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Token Type</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Expires At</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">IP Address</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium text-[#2d3436]">{session.full_name}</p>
                              <p className="text-xs text-zinc-500">{session.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              session.token_type === "admin_session" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {session.token_type}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm text-zinc-500">
                            {session.expires_at ? new Date(session.expires_at).toLocaleString() : "N/A"}
                          </td>
                          <td className="py-3 px-2 text-sm text-zinc-500">
                            {session.ip_address || "N/A"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleForceLogout(session.id)}
                              disabled={actionLoading === session.id}
                              className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                            >
                              <LogOut size={14} />
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sessions.length === 0 && (
                    <p className="text-center py-8 text-zinc-400">No active sessions</p>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-[#2d3436] mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => selectedStaff && handleOpenResetPassword(selectedStaff)}
                      disabled={!selectedStaff}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 hover:border-[#A8D5BA] hover:bg-[#A8D5BA]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={24} className="text-zinc-400" />
                      <span className="text-sm text-[#2d3436]">Reset Password</span>
                    </button>
                    <button
                      onClick={() => alert("Audit log feature - select a staff member first")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 hover:border-[#A8D5BA] hover:bg-[#A8D5BA]/5 transition-colors"
                    >
                      <FileText size={24} className="text-zinc-400" />
                      <span className="text-sm text-[#2d3436]">View Audit Logs</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Select a staff member from the Security tab to use quick actions</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSessionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSessionsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2d3436]">
                  Sessions for {selectedStaff?.full_name}
                </h2>
                <button onClick={() => setShowSessionsModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {staffSessions.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No active sessions</p>
                ) : (
                  staffSessions.map((session, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-zinc-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          session.token_type === "admin_session" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {session.token_type}
                        </span>
                        <button
                          onClick={() => handleForceLogout(session.token)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Revoke
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono truncate">{session.token}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Expires: {session.expires_at ? new Date(session.expires_at).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAuditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2d3436]">
                  Audit Logs for {selectedStaff?.full_name}
                </h2>
                <button onClick={() => setShowAuditModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-center py-8 text-zinc-400">No audit logs found</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl border border-zinc-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[#2d3436]">{log.action}</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">IP: {log.ip_address || "N/A"}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowResetPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2d3436]">Reset Password</h2>
                <button onClick={() => setShowResetPasswordModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-zinc-500 mb-4">
                Reset password for: <strong>{selectedStaff?.full_name}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={!resetPassword || actionLoading === "reset-password"}
                  className="w-full py-3 bg-[#2d3436] text-white rounded-xl font-medium hover:bg-[#1a1f24] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "reset-password" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  Reset Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}