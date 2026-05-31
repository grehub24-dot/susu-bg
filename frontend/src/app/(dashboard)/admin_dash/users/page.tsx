"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Search, ShieldCheck, Plus, Edit, Trash2 } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { DataTable, type Column, type SortDirection } from "@/components/admin/DataTable";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { Skeleton } from "@/components/admin/LoadingSpinner";

type WalletRow = { balance: number; currency: string };
type UserRow = {
  id: string;
  full_name: string;
  email?: string;
  phone_number: string;
  created_at: string;
  kyc_status: "PENDING" | "APPROVED" | "REJECTED" | string;
  wallets?: WalletRow | WalletRow[] | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const asWallet = (wallets: UserRow["wallets"]) => {
  if (!wallets) return null;
  if (Array.isArray(wallets)) return wallets[0] || null;
  return wallets;
};

const kycPill = (statusRaw: string) => {
  const status = String(statusRaw || "").toUpperCase();
  if (status === "APPROVED") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
  if (status === "REJECTED") return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20";
  return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20";
};

const userColumns: Column<UserRow>[] = [
  {
    key: "full_name",
    header: "User",
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/15 p-2.5 text-slate-900 dark:text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <ShieldCheck size={16} />
        </div>
        <div>
          <Link
            href={`/admin_dash/users/${encodeURIComponent(row.id)}`}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:opacity-80"
          >
            {row.full_name}
          </Link>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Joined {new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "phone_number",
    header: "Phone",
    sortable: true,
    render: (row) => (
      <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{row.phone_number}</span>
    ),
  },
  {
    key: "wallet",
    header: "Wallet",
    render: (row) => {
      const wallet = asWallet(row.wallets);
      if (!wallet) return <span className="text-slate-500 dark:text-slate-400">-</span>;
      return (
        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          GHS {Number(wallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: "kyc_status",
    header: "KYC",
    sortable: true,
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${kycPill(row.kyc_status)}`}>
        {String(row.kyc_status || "").toUpperCase()}
      </span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (row) => null,
  },
];

export default function AdminUsersPage() {
  const { showSuccess, showError } = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({ key: "", direction: null });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [currentRole, setCurrentRole] = useState<string>("");

  const canManageUsers = useMemo(
    () => ["ADMIN", "MANAGER"].includes(String(currentRole || "").toUpperCase()),
    [currentRole]
  );
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    pin_hash: "",
    risk_rating: "LOW",
    pep_status: false,
    ghana_card_number: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      const name = String(u.full_name || "").toLowerCase();
      const phone = String(u.phone_number || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || String(u.kyc_status || "").toLowerCase().includes(q);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((u) => String(u.kyc_status).toUpperCase() === "PENDING").length;
    const approved = rows.filter((u) => String(u.kyc_status).toUpperCase() === "APPROVED").length;
    return { total, pending, approved };
  }, [rows]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminAPI.users.list() as { success: boolean; data?: UserRow[]; message?: string };
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    void load();
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

  const handleSort = (key: string) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  const approveKyc = async (userId: string) => {
    if (!canManageUsers) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    const confirmed = window.confirm("Approve KYC for this user?");
    if (!confirmed) return;
    setActionLoadingId(userId);
    setError("");
    try {
      const data = await adminAPI.summary.approveKYC(userId) as { success: boolean; message?: string };
      setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, kyc_status: "APPROVED" } : u)));
      showSuccess(data.message || "KYC approved");
    } catch (err) {
      showError(err instanceof Error ? err.message : "KYC approval failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!canManageUsers) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    setError("");
    try {
      await adminAPI.users.create(formData);
      showSuccess("User created successfully");
      setShowCreateModal(false);
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        pin_hash: "",
        risk_rating: "LOW",
        pep_status: false,
        ghana_card_number: "",
      });
      const data = await adminAPI.users.list() as { success: boolean; data?: UserRow[]; message?: string };
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    if (!canManageUsers) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    setError("");
    try {
      await adminAPI.users.update(selectedUser.id, formData);
      showSuccess("User updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        pin_hash: "",
        risk_rating: "LOW",
        pep_status: false,
        ghana_card_number: "",
      });
      const data = await adminAPI.users.list() as { success: boolean; data?: UserRow[]; message?: string };
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!canManageUsers) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;
    setError("");
    try {
      await adminAPI.users.delete(userId);
      showSuccess("User deleted successfully");
      setRows((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const openEditModal = (user: UserRow) => {
    if (!canManageUsers) {
      showError("Forbidden: Requires ADMIN or MANAGER role");
      return;
    }
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email || "",
      phone_number: user.phone_number,
      pin_hash: "",
      risk_rating: "LOW",
      pep_status: false,
      ghana_card_number: "",
    });
    setShowEditModal(true);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Users</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Search users, review KYC, and approve instantly.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Users</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">KYC Pending</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.pending}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">KYC Approved</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.approved}</div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onRetry={() => window.location.reload()} />
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <DataTable
            data={filtered}
            columns={userColumns}
            keyField="id"
            loading={loading}
            searchable
            searchPlaceholder="Search by name, phone, or status"
            searchKeys={["full_name", "phone_number", "kyc_status"]}
            sort={sort.key ? { key: sort.key, direction: sort.direction, onSort: handleSort } : undefined}
            emptyMessage="No users found"
          />
        </div>
      </motion.div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Create User</h2>
            <div className="mt-4 space-y-4">
              <input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Full Name"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Phone Number"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.pin_hash}
                onChange={(e) => setFormData({ ...formData, pin_hash: e.target.value })}
                placeholder="PIN Hash"
                type="password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.ghana_card_number}
                onChange={(e) => setFormData({ ...formData, ghana_card_number: e.target.value })}
                placeholder="Ghana Card Number"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Edit User</h2>
            <div className="mt-4 space-y-4">
              <input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Full Name"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Phone Number"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <select
                value={formData.risk_rating}
                onChange={(e) => setFormData({ ...formData, risk_rating: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
              >
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pep"
                  checked={formData.pep_status}
                  onChange={(e) => setFormData({ ...formData, pep_status: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="pep" className="text-sm text-slate-900 dark:text-slate-100">PEP Status</label>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
