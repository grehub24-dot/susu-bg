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
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <Link href="/admin_dash" className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} className="text-[color:var(--color-foreground)]" />
          </Link>
          <div className="rounded-2xl bg-white/15 p-3 text-[color:var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">KYC Management</h1>
            <p className="mt-0.5 text-sm font-medium text-[color:var(--color-muted)]">
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
            className={`rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl transition-all hover:scale-[1.02] ${
              activeTab === tab.key ? "ring-2 ring-[color:var(--color-sage-green)]" : ""
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">{tab.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-[color:var(--color-foreground)]">{tab.count}</div>
          </button>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, email, or ID number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            />
          </div>
          <button
            onClick={() => void loadUsers()}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)] hover:bg-white/20 transition-colors"
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
            <AlertTriangle className="text-[color:var(--color-muted)]" size={48} />
            <p className="mt-3 text-sm font-medium text-[color:var(--color-muted)]">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 transition-colors hover:border-[color:var(--color-sage-green)]/50"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center text-[color:var(--color-foreground)] font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-[color:var(--color-foreground)]">{user.full_name}</div>
                    <div className="text-xs text-[color:var(--color-muted)]">
                      {user.phone_number} {user.email && `• ${user.email}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={user.kyc_status} />
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="rounded-lg bg-white/10 p-2 text-[color:var(--color-foreground)] hover:bg-white/20 transition-colors"
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
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[color:var(--color-foreground)]">KYC Details</h2>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
                <XCircle size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Personal Info</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--color-muted)]">Name</span>
                    <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--color-muted)]">Phone</span>
                    <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.phone_number}</span>
                  </div>
                  {selectedUser.email && (
                    <div className="flex justify-between">
                      <span className="text-[color:var(--color-muted)]">Email</span>
                      <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.email}</span>
                    </div>
                  )}
                  {selectedUser.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-[color:var(--color-muted)]">DOB</span>
                      <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.date_of_birth}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">ID Verification</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--color-muted)]">ID Type</span>
                    <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.id_type || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--color-muted)]">ID Number</span>
                    <span className="font-medium text-[color:var(--color-foreground)]">{selectedUser.id_number || "—"}</span>
                  </div>
                </div>
              </div>

              {selectedUser.house_address && (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Address</div>
                  <p className="mt-1 text-sm text-[color:var(--color-foreground)]">{selectedUser.house_address}</p>
                </div>
              )}

              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Current Status</div>
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
                  className="flex-1 rounded-xl bg-[color:var(--color-sage-green)] px-4 py-3 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] disabled:opacity-50"
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