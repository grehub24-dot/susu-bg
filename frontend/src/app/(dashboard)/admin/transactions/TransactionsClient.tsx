"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Edit, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";
import { DataTable, type Column, type SortDirection } from "@/components/admin/DataTable";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

type AdminTx = {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | string;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  created_at: string;
  wallets?: {
    users?: { full_name?: string | null; phone_number?: string | null } | Array<{ full_name?: string | null; phone_number?: string | null }> | null;
  } | Array<{
    users?: { full_name?: string | null; phone_number?: string | null } | Array<{ full_name?: string | null; phone_number?: string | null }> | null;
  }> | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const extractUser = (tx: AdminTx) => {
  const wallets = tx.wallets;
  const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
  const users = wallet?.users;
  const user = Array.isArray(users) ? users[0] : users;
  return {
    fullName: String(user?.full_name || "Unknown"),
    phone: String(user?.phone_number || "")
  };
};

type StatusFilter = "" | "PENDING" | "SUCCESS" | "FAILED";

export default function TransactionsClient({
  initialQuery,
  initialStatus
}: {
  initialQuery: string;
  initialStatus: StatusFilter;
}) {
  const { showSuccess, showError } = useToast();
  const [rows, setRows] = useState<AdminTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTx | null>(null);
  const [formData, setFormData] = useState({
    wallet_id: "",
    amount: "",
    type: "DEPOSIT",
    status: "PENDING",
    channel: "",
    teller_id: "",
    reference: "",
  });

  useEffect(() => {
    setSearch(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        const data = await adminAPI.transactions.list() as { success: boolean; data?: AdminTx[]; message?: string };
        setRows(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [limit, offset]);

  const handleCreate = async () => {
    setError("");
    try {
      await adminAPI.transactions.create({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      showSuccess("Transaction created successfully");
      setShowCreateModal(false);
      setFormData({
        wallet_id: "",
        amount: "",
        type: "DEPOSIT",
        status: "PENDING",
        channel: "",
        teller_id: "",
        reference: "",
      });
      const data = await adminAPI.transactions.list() as { success: boolean; data?: AdminTx[]; message?: string };
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create transaction");
    }
  };

  const handleUpdate = async () => {
    if (!selectedTransaction) return;
    setError("");
    try {
      await adminAPI.transactions.update(selectedTransaction.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      showSuccess("Transaction updated successfully");
      setShowEditModal(false);
      setSelectedTransaction(null);
      setFormData({
        wallet_id: "",
        amount: "",
        type: "DEPOSIT",
        status: "PENDING",
        channel: "",
        teller_id: "",
        reference: "",
      });
      const data = await adminAPI.transactions.list() as { success: boolean; data?: AdminTx[]; message?: string };
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update transaction");
    }
  };

  const handleDelete = async (transactionId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;
    setError("");
    try {
      await adminAPI.transactions.delete(transactionId);
      showSuccess("Transaction deleted successfully");
      setRows((prev) => prev.filter((t) => t.id !== transactionId));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete transaction");
    }
  };

  const openEditModal = (transaction: AdminTx) => {
    setSelectedTransaction(transaction);
    setFormData({
      wallet_id: "",
      amount: String(transaction.amount),
      type: transaction.type as string,
      status: transaction.status as string,
      channel: "",
      teller_id: "",
      reference: transaction.reference,
    });
    setShowEditModal(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((tx) => {
      if (statusFilter && String(tx.status).toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      const u = extractUser(tx);
      return (
        String(tx.reference || "").toLowerCase().includes(q) ||
        String(tx.type || "").toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const statusPill = (statusRaw: string) => {
    const status = String(statusRaw || "").toUpperCase();
    if (status === "SUCCESS") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
    if (status === "FAILED") return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20";
    return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20";
  };

  const typePill = (typeRaw: string) => {
    const type = String(typeRaw || "").toUpperCase();
    if (type === "DEPOSIT") return "bg-[color:var(--color-sage-green)]/20 text-[color:var(--color-foreground)] ring-1 ring-[color:var(--color-sage-green)]/25";
    if (type === "WITHDRAWAL") return "bg-[color:var(--color-soft-pink)]/20 text-[color:var(--color-foreground)] ring-1 ring-[color:var(--color-soft-pink)]/25";
    return "bg-white/15 text-[color:var(--color-foreground)] ring-1 ring-white/15";
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Transactions</h1>
        <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Global transaction logs across all users.</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, user, phone, type"
                className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              value={limit}
              onChange={(e) => {
                setOffset(0);
                setLimit(Number(e.target.value));
              }}
              className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="text-sm">{error && <ErrorBanner message={error} onRetry={() => window.location.reload()} />}</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Date</th>
                <th className="py-4 font-medium">User</th>
                <th className="py-4 font-medium">Reference</th>
                <th className="py-4 font-medium">Type</th>
                <th className="py-4 font-medium text-right">Amount</th>
                <th className="py-4 font-medium text-center">Status</th>
                <th className="py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {loading ? (
                [1, 2, 3, 4, 5].map((x) => (
                  <tr key={x} className="border-b border-white/10">
                    <td className="py-4" colSpan={7}>
                      <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[color:var(--color-muted)]">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const user = extractUser(tx);
                  return (
                    <motion.tr
                      key={tx.id}
                      variants={itemVariants}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                      className="border-b border-white/10 transition-colors"
                    >
                      <td className="py-4 text-[color:var(--color-muted)]">
                        {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="py-4">
                        <div className="font-semibold text-[color:var(--color-foreground)]">{user.fullName}</div>
                        <div className="text-xs text-[color:var(--color-muted)]">{user.phone || "-"}</div>
                      </td>
                      <td className="py-4 text-[color:var(--color-muted)] font-mono text-xs">{tx.reference}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${typePill(tx.type)}`}>
                          {String(tx.type || "").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">
                        GHS {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill(tx.status)}`}>
                          {String(tx.status || "").toLowerCase()}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(tx)}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-[color:var(--color-foreground)] hover:bg-white/20 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(tx.id)}
                            className="rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={offset <= 0}
            onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
            className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)]/80 disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            Prev
          </button>
          <div className="text-xs text-[color:var(--color-muted)]">Showing {offset + 1}–{offset + Math.max(0, rows.length)}</div>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => setOffset((prev) => prev + limit)}
            className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)]/80 disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            Next
          </button>
        </div>
      </motion.div>

      {/* Create Transaction Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)]">
            <h2 className="text-xl font-extrabold text-[color:var(--color-foreground)]">Create Transaction</h2>
            <div className="mt-4 space-y-4">
              <input
                value={formData.wallet_id}
                onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
                placeholder="Wallet ID"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
              <input
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Amount"
                type="number"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              >
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              >
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Reference"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
              <input
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                placeholder="Channel"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-[color:var(--color-foreground)] hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-[color:var(--color-sage-green)] px-4 py-3 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)]">
            <h2 className="text-xl font-extrabold text-[color:var(--color-foreground)]">Edit Transaction</h2>
            <div className="mt-4 space-y-4">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              >
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="TRANSFER">Transfer</option>
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              >
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Reference"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTransaction(null);
                }}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-[color:var(--color-foreground)] hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded-xl bg-[color:var(--color-sage-green)] px-4 py-3 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
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
