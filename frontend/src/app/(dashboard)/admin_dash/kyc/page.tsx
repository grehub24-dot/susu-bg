"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Search, Eye, FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/admin/LoadingSpinner";

type KYCUser = {
  id: string;
  full_name: string;
  email?: string;
  phone_number: string;
  created_at: string;
  kyc_status: "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED" | string;
  id_type?: string;
  id_number?: string;
  date_of_birth?: string;
  house_address?: string;
  passport_picture_url?: string;
  id_card_front_url?: string;
  id_card_back_url?: string;
  wallets?: { balance: number; currency: string } | null;
};

type TabType = "all" | "pending" | "verified" | "approved" | "rejected";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  PENDING: { icon: <Clock size={14} />, color: "text-amber-300", bg: "bg-amber-500/15", label: "Pending" },
  VERIFIED: { icon: <CheckCircle2 size={14} />, color: "text-blue-300", bg: "bg-blue-500/15", label: "Verified" },
  APPROVED: { icon: <CheckCircle2 size={14} />, color: "text-emerald-300", bg: "bg-emerald-500/15", label: "Approved" },
  REJECTED: { icon: <XCircle size={14} />, color: "text-rose-300", bg: "bg-rose-500/15", label: "Rejected" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status.toUpperCase()] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function AdminKYCPage() {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<KYCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>("");

  const canManageKyc = useMemo(
    () => ["ADMIN", "MANAGER"].includes(String(currentRole || "").toUpperCase()),
    [currentRole]
  );

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminAPI.users.list() as { success: boolean; data?: KYCUser[]; message?: string };
      setUsers(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch("/api/admin-auth/verify-session", {
          method: "GET",
          credentials: "same-origin"
        });
        if (!response.ok) {
          setCurrentRole("");
          return;
        }
        const data = await response.json();
        setCurrentRole(String(data?.user?.role || ""));
      } catch {
        setCurrentRole("");
      }
    };

    fetchRole();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.kyc_status === "PENDING").length;
    const verified = users.filter((u) => u.kyc_status === "VERIFIED").length;
    const approved = users.filter((u) => u.kyc_status === "APPROVED").length;
    const rejected = users.filter((u) => u.kyc_status === "REJECTED").length;
    return { total, pending, verified, approved, rejected };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (activeTab !== "all") {
      filtered = filtered.filter((u) => u.kyc_status === activeTab.toUpperCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.phone_number.includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.id_number?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [users, activeTab, search]);

  const handleApprove = async (userId: string, newStatus: "VERIFIED" | "APPROVED") => {
    if (!canManageKyc) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    const confirmed = window.confirm(`Approve KYC as ${newStatus}?`);
    if (!confirmed) return;
    setActionLoading(userId);
    try {
      await adminAPI.summary.approveKYC(userId) as { success: boolean; message?: string };
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, kyc_status: newStatus } : u)));
      showSuccess(`KYC ${newStatus === "VERIFIED" ? "Verified" : "Approved"}`);
      setSelectedUser(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!canManageKyc) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    const confirmed = window.confirm("Reject this KYC application?");
    if (!confirmed) return;
    setActionLoading(userId);
    try {
      await adminAPI.users.update(userId, { kyc_status: "REJECTED" });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, kyc_status: "REJECTED" } : u)));
      showSuccess("KYC Rejected");
      setSelectedUser(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "verified", label: "Verified", count: stats.verified },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "rejected", label: "Rejected", count: stats.rejected },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin_dash" className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} className="text-slate-900 dark:text-slate-100" />
          </Link>
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">KYC Management</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
              Review and approve customer identity verification
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 text-left shadow-lg backdrop-blur-xl transition-all hover:scale-[1.02] ${
              activeTab === tab.key ? "ring-2 ring-indigo-600" : ""
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tab.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{tab.count}</div>
          </button>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, email, or ID number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            />
          </div>
          <button
            onClick={() => void loadUsers()}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-white/20 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="text-slate-500 dark:text-slate-400" size={48} />
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4 transition-colors hover:border-indigo-600/50"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{user.full_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.phone_number} {user.email && `• ${user.email}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={user.kyc_status} />
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="rounded-lg bg-white/10 p-2 text-slate-900 dark:text-slate-100 hover:bg-white/20 transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">KYC Details</h2>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
                <XCircle size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Personal Info</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Name</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Phone</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.phone_number}</span>
                  </div>
                  {selectedUser.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Email</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.email}</span>
                    </div>
                  )}
                  {selectedUser.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">DOB</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.date_of_birth}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID Verification</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ID Type</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.id_type || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ID Number</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{selectedUser.id_number || "—"}</span>
                  </div>
                </div>
              </div>

              {selectedUser.house_address && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Address</div>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{selectedUser.house_address}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Status</div>
                <div className="mt-2">
                  <StatusBadge status={selectedUser.kyc_status} />
                </div>
              </div>
            </div>

            {selectedUser.kyc_status === "PENDING" && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => void handleReject(selectedUser.id)}
                  disabled={actionLoading === selectedUser.id}
                  className="flex-1 rounded-xl bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => void handleApprove(selectedUser.id, "VERIFIED")}
                  disabled={actionLoading === selectedUser.id}
                  className="flex-1 rounded-xl bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  onClick={() => void handleApprove(selectedUser.id, "APPROVED")}
                  disabled={actionLoading === selectedUser.id}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}