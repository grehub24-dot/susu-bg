"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Filter, ArrowLeft, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/components/ui/toast";

type StatusFilter = "" | "PENDING" | "SUCCESS" | "FAILED";

interface Transaction {
  id: string;
  user_id: string;
  reference: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  created_at: string;
  updated_at: string;
  users?: { full_name: string; phone_number: string };
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  SUCCESS: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Success" },
  PENDING: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", label: "Pending" },
  FAILED: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", label: "Failed" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function TransactionsClient({ initialQuery, initialStatus }: { initialQuery?: string; initialStatus?: StatusFilter }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialQuery || "");
  const [status, setStatus] = useState<StatusFilter>(initialStatus || "");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTransactions = async (pageNum: number = 1) => {
    setLoading(true);
    setError("");
    try {
      const limit = 20;
      const offset = (pageNum - 1) * limit;
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (search) params.set("q", search);
      if (status) params.set("status", status);

      const response = await fetch(`/api/admin-proxy/transactions?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(Array.isArray(data.data) ? data.data : []);
        setTotalPages(Math.ceil((data.count || 0) / limit) || 1);
      } else {
        setError(data.message || "Failed to load transactions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(page);
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions(1);
  };

  const updateParams = (newSearch: string, newStatus: StatusFilter) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("q", newSearch);
    if (newStatus) params.set("status", newStatus);
    router.push(`/admin_dash/transactions${params.toString() ? "?" + params.toString() : ""}`);
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "", label: "All" },
    { key: "SUCCESS", label: "Success" },
    { key: "PENDING", label: "Pending" },
    { key: "FAILED", label: "Failed" },
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
          <div className="rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 p-3 text-indigo-600 dark:text-indigo-400">
            <Eye size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Transactions</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
              Track and manage all transactions
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatus(tab.key);
              setPage(1);
            }}
            className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-4 text-left shadow-lg backdrop-blur-xl transition-all hover:scale-[1.02] ${
              status === tab.key ? "ring-2 ring-indigo-600" : ""
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tab.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {tab.key === "" ? transactions.length : tab.key === "SUCCESS" ? "—" : tab.key === "PENDING" ? "—" : "—"}
            </div>
          </button>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl"
      >
        <form onSubmit={handleSearch} className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by reference or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPage(1);
            }}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Clear
          </button>
        </form>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => loadTransactions(page)}
              className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reference</th>
                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                    <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                    <th className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-4 font-mono text-sm text-slate-900 dark:text-slate-100">{tx.reference}</td>
                      <td className="py-4 text-slate-900 dark:text-slate-100">
                        <div className="font-medium">{tx.users?.full_name || "Unknown"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{tx.users?.phone_number || "—"}</div>
                      </td>
                      <td className="py-4 text-slate-900 dark:text-slate-100 uppercase">{tx.type}</td>
                      <td className="py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                        GHS {Number(tx.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}