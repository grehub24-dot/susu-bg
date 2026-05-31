"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  X,
  Loader2,
  Wifi
} from "lucide-react";

type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";
type IdempotencyState = "PROCESSED" | "DUPLICATE_BLOCKED" | "RETRY_ATTEMPT" | "UNKNOWN";

interface Transaction {
  id: string;
  reference: string;
  user_name: string;
  user_phone: string;
  amount: number;
  status: TransactionStatus;
  idempotency: IdempotencyState;
  channel: string;
  created_at: string;
  message?: string;
}

export default function TransactionMonitorClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [idempotencyFilter, setIdempotencyFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<{ type: string; message: string }[]>([]);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/admin-proxy/transactions?limit=50", {
        credentials: "same-origin"
      });
      const data = await response.json();

      if (data.success) {
        const txs = Array.isArray(data.transactions) ? data.transactions : Array.isArray(data.data) ? data.data : [];
        setTransactions(txs);
        setLastUpdated(new Date());
        analyzeAlerts(txs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const analyzeAlerts = (txs: Transaction[]) => {
    const newAlerts: { type: string; message: string }[] = [];

    const duplicates = txs.filter((t) => t.idempotency === "DUPLICATE_BLOCKED").length;
    if (duplicates > 0) newAlerts.push({ type: "warning", message: `${duplicates} duplicate webhook(s) blocked` });

    const failed = txs.filter((t) => t.status === "FAILED").length;
    if (failed > 0) newAlerts.push({ type: "error", message: `${failed} transaction(s) failed` });

    setAlerts(newAlerts);
  };

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.reference.toLowerCase().includes(q) ||
      (t.user_name || "").toLowerCase().includes(q) ||
      String(t.user_phone || "").includes(search);

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesIdempotency = idempotencyFilter === "all" || t.idempotency === idempotencyFilter;

    return matchesSearch && matchesStatus && matchesIdempotency;
  });

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "PENDING").length,
    success: transactions.filter((t) => t.status === "SUCCESS").length,
    failed: transactions.filter((t) => t.status === "FAILED").length,
    duplicates: transactions.filter((t) => t.idempotency === "DUPLICATE_BLOCKED").length
  };

  const openDetails = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowDrawer(true);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS"
    }).format((amount || 0) / 100);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wifi className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Transaction Monitor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {lastUpdated ? `Last updated ${formatTime(lastUpdated.toISOString())}` : "Loading..."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </motion.div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                alert.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
              }`}
            >
              {alert.type === "error" ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Success</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.success}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Failed</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Duplicates</p>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.duplicates}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, name, phone..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/30 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={idempotencyFilter}
            onChange={(e) => setIdempotencyFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="all">All Idempotency</option>
            <option value="PROCESSED">Processed</option>
            <option value="DUPLICATE_BLOCKED">Duplicate Blocked</option>
            <option value="RETRY_ATTEMPT">Retry Attempt</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Reference</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">User</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Idempotency</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Channel</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Time</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm text-slate-900 dark:text-slate-100">{tx.reference}</td>
                    <td className="py-3 px-4">
                      <p className="text-slate-900 dark:text-slate-100">{tx.user_name || "—"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{tx.user_phone || "—"}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-slate-100">{formatAmount(tx.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === "SUCCESS"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : tx.status === "FAILED"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {tx.status === "SUCCESS" && <CheckCircle className="w-3 h-3" />}
                        {tx.status === "FAILED" && <XCircle className="w-3 h-3" />}
                        {tx.status === "PENDING" && <Clock className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.idempotency === "PROCESSED"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : tx.idempotency === "DUPLICATE_BLOCKED"
                              ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300"
                              : tx.idempotency === "RETRY_ATTEMPT"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {tx.idempotency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{tx.channel}</td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{formatTime(tx.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDetails(tx)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center py-12 text-slate-500 dark:text-slate-400">No transactions found</p>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDrawer && selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDrawer(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Transaction Details</h2>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Reference</p>
                    <p className="font-mono text-slate-900 dark:text-slate-100">{selectedTx.reference}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatAmount(selectedTx.amount)}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Channel</p>
                    <p className="text-slate-900 dark:text-slate-100">{selectedTx.channel}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Created</p>
                    <p className="text-slate-900 dark:text-slate-100">{formatDate(selectedTx.created_at)}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{formatTime(selectedTx.created_at)}</p>
                  </div>

                  {selectedTx.message && (
                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Message</p>
                      <p className="text-slate-900 dark:text-slate-100">{selectedTx.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
