"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, RefreshCw, AlertTriangle, CheckCircle, 
  XCircle, Clock, Eye, Download, MoreHorizontal, 
  ChevronDown, X, Loader2, Wifi, WifiOff
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

const STATUS_COLORS = {
  PENDING: { bg: "bg-warning-bg", text: "text-warning", border: "border-warning" },
  SUCCESS: { bg: "bg-success-bg", text: "text-success", border: "border-success" },
  FAILED: { bg: "bg-danger-bg", text: "text-danger", border: "border-danger" },
};

const IDEMPOTENCY_COLORS = {
  PROCESSED: { bg: "bg-success-bg", text: "text-success" },
  DUPLICATE_BLOCKED: { bg: "bg-surface", text: "text-muted" },
  RETRY_ATTEMPT: { bg: "bg-warning-bg", text: "text-warning" },
  UNKNOWN: { bg: "bg-danger-bg", text: "text-danger" },
};

export default function TransactionMonitorPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [idempotencyFilter, setIdempotencyFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<{type: string; message: string}[]>([]);

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
        setTransactions(data.transactions || []);
        setLastUpdated(new Date());
        analyzeAlerts(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAlerts = (txs: Transaction[]) => {
    const newAlerts: {type: string; message: string}[] = [];
    
    const duplicates = txs.filter(t => t.idempotency === "DUPLICATE_BLOCKED").length;
    if (duplicates > 0) {
      newAlerts.push({ type: "warning", message: `${duplicates} duplicate webhook(s) blocked` });
    }
    
    const failed = txs.filter(t => t.status === "FAILED").length;
    if (failed > 0) {
      newAlerts.push({ type: "error", message: `${failed} transaction(s) failed` });
    }
    
    setAlerts(newAlerts);
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = !search || 
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      t.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_phone?.includes(search);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesIdempotency = idempotencyFilter === "all" || t.idempotency === idempotencyFilter;
    return matchesSearch && matchesStatus && matchesIdempotency;
  });

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === "PENDING").length,
    success: transactions.filter(t => t.status === "SUCCESS").length,
    failed: transactions.filter(t => t.status === "FAILED").length,
    duplicates: transactions.filter(t => t.idempotency === "DUPLICATE_BLOCKED").length,
  };

  const openDetails = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowDrawer(true);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-GH", { 
      style: "currency", 
      currency: "GHS" 
    }).format(amount / 100);
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
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wifi className="w-8 h-8 text-primary" />
              Transaction Monitor
            </h1>
            <p className="text-muted mt-1">
              {lastUpdated ? `Last updated ${formatTime(lastUpdated.toISOString())}` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransactions}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-foreground hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-foreground hover:bg-surface-elevated transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </motion.div>

        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 space-y-2"
          >
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
                  alert.type === "error" 
                    ? "bg-danger-bg border-danger text-danger" 
                    : "bg-warning-bg border-warning text-warning"
                }`}
              >
                {alert.type === "error" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                {alert.message}
              </div>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
        >
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-sm">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-sm">Pending</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-sm">Success</p>
            <p className="text-2xl font-bold text-success">{stats.success}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-sm">Failed</p>
            <p className="text-2xl font-bold text-danger">{stats.failed}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-muted text-sm">Duplicates</p>
            <p className="text-2xl font-bold text-muted">{stats.duplicates}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface border border-border rounded-2xl p-4 mb-4"
        >
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by reference, name, phone..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              value={idempotencyFilter}
              onChange={(e) => setIdempotencyFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Idempotency</option>
              <option value="PROCESSED">Processed</option>
              <option value="DUPLICATE_BLOCKED">Duplicate Blocked</option>
              <option value="RETRY_ATTEMPT">Retry Attempt</option>
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Reference</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">User</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted">Amount</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted">Idempotency</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted">Channel</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted">Time</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-border hover:bg-background transition-colors">
                      <td className="py-3 px-4 font-mono text-sm text-foreground">{tx.reference}</td>
                      <td className="py-3 px-4">
                        <p className="text-foreground">{tx.user_name || "—"}</p>
                        <p className="text-sm text-muted">{tx.user_phone || "—"}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{formatAmount(tx.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === "SUCCESS" ? "bg-success-bg text-success" :
                          tx.status === "FAILED" ? "bg-danger-bg text-danger" :
                          "bg-warning-bg text-warning"
                        }`}>
                          {tx.status === "SUCCESS" && <CheckCircle className="w-3 h-3" />}
                          {tx.status === "FAILED" && <XCircle className="w-3 h-3" />}
                          {tx.status === "PENDING" && <Clock className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tx.idempotency === "PROCESSED" ? "bg-success-bg text-success" :
                          tx.idempotency === "DUPLICATE_BLOCKED" ? "bg-surface text-muted" :
                          tx.idempotency === "RETRY_ATTEMPT" ? "bg-warning-bg text-warning" :
                          "bg-danger-bg text-danger"
                        }`}>
                          {tx.idempotency === "DUPLICATE_BLOCKED" && "⚫ "}
                          {tx.idempotency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{tx.channel}</td>
                      <td className="py-3 px-4 text-right text-muted">{formatTime(tx.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openDetails(tx)}
                          className="p-2 text-muted hover:text-foreground transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center py-12 text-muted">No transactions found</p>
              )}
            </div>
          )}
        </motion.div>
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
              className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-surface border-l border-border overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Transaction Details</h2>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-2 text-muted hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-muted mb-1">Reference</p>
                    <p className="font-mono text-foreground">{selectedTx.reference}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-xl p-4">
                      <p className="text-sm text-muted mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                        selectedTx.status === "SUCCESS" ? "bg-success-bg text-success" :
                        selectedTx.status === "FAILED" ? "bg-danger-bg text-danger" :
                        "bg-warning-bg text-warning"
                      }`}>
                        {selectedTx.status}
                      </span>
                    </div>
                    <div className="bg-background rounded-xl p-4">
                      <p className="text-sm text-muted mb-1">Idempotency</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                        selectedTx.idempotency === "PROCESSED" ? "bg-success-bg text-success" :
                        selectedTx.idempotency === "DUPLICATE_BLOCKED" ? "bg-surface text-muted" :
                        "bg-warning-bg text-warning"
                      }`}>
                        {selectedTx.idempotency}
                      </span>
                    </div>
                  </div>

                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-muted mb-1">Amount</p>
                    <p className="text-2xl font-bold text-foreground">{formatAmount(selectedTx.amount)}</p>
                  </div>

                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-muted mb-1">Channel</p>
                    <p className="text-foreground">{selectedTx.channel}</p>
                  </div>

                  <div className="bg-background rounded-xl p-4">
                    <p className="text-sm text-muted mb-1">Created</p>
                    <p className="text-foreground">{formatDate(selectedTx.created_at)}</p>
                    <p className="text-muted text-sm">{formatTime(selectedTx.created_at)}</p>
                  </div>

                  {selectedTx.message && (
                    <div className="bg-background rounded-xl p-4">
                      <p className="text-sm text-muted mb-1">Message</p>
                      <p className="text-foreground">{selectedTx.message}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <h3 className="font-semibold text-foreground mb-4">Actions</h3>
                    <div className="space-y-2">
                      {selectedTx.status === "FAILED" && (
                        <button className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors">
                          Retry Transaction
                        </button>
                      )}
                      <button className="w-full py-3 bg-background border border-border text-foreground rounded-xl font-medium hover:bg-surface-elevated transition-colors">
                        View Raw Payload
                      </button>
                      <button className="w-full py-3 bg-background border border-border text-foreground rounded-xl font-medium hover:bg-surface-elevated transition-colors">
                        Export JSON
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}