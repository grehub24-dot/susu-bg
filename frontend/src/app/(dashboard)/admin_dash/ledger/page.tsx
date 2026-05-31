"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Wallet, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, RefreshCw, Download, Eye, ArrowUpRight, 
  ArrowDownRight, DollarSign, Clock, Shield
} from "lucide-react";

interface LedgerEntry {
  id: string;
  transaction_ref: string;
  account_type: "ASSET" | "LIABILITY" | "REVENUE" | "EXPENSE";
  debit: number;
  credit: number;
  balance_after: number;
  created_at: string;
  status: "VALID" | "MISMATCH";
}

interface LedgerSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalRevenue: number;
  totalExpenses: number;
  netDifference: number;
  isBalanced: boolean;
}

export default function LedgerDashboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalAssets: 0,
    totalLiabilities: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netDifference: 0,
    isBalanced: true,
  });
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    const checkRoleThenLoad = async () => {
      try {
        const response = await fetch("/api/admin-auth/verify-session", {
          method: "GET",
          credentials: "same-origin"
        });

        if (!response.ok) {
          router.replace("/admin-login");
          return;
        }

        const data = await response.json();
        const role = String(data?.user?.role || "").toUpperCase();
        const allowed = role === "ADMIN" || role === "MANAGER";

        if (!allowed) {
          router.replace("/admin_dash");
          return;
        }

        fetchLedgerData();
      } catch {
        router.replace("/admin_dash");
      }
    };

    checkRoleThenLoad();
  }, []);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/admin-proxy/ledger", {
        credentials: "same-origin"
      });
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries || []);
        calculateSummary(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setEntries(mockEntries);
      calculateSummary(mockEntries);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: LedgerEntry[]) => {
    const totalDebits = data.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = data.reduce((sum, e) => sum + (e.credit || 0), 0);

    const assets = data.filter(e => e.account_type === "ASSET").reduce((sum, e) => sum + e.balance_after, 0);
    const liabilities = data.filter(e => e.account_type === "LIABILITY").reduce((sum, e) => sum + e.balance_after, 0);
    const revenue = data.filter(e => e.account_type === "REVENUE").reduce((sum, e) => sum + e.credit, 0);
    const expenses = data.filter(e => e.account_type === "EXPENSE").reduce((sum, e) => sum + e.debit, 0);

    setSummary({
      totalAssets: assets,
      totalLiabilities: liabilities,
      totalRevenue: revenue,
      totalExpenses: expenses,
      netDifference: totalDebits - totalCredits,
      isBalanced: totalDebits === totalCredits,
    });
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

  const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

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
              <Shield className="w-8 h-8 text-primary" />
              Ledger Dashboard
            </h1>
            <p className="text-muted mt-1">Double-entry journal - Real-time balance verification</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLedgerData}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-foreground hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconcile
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-foreground hover:bg-surface-elevated transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-2xl border-2 ${
            summary.isBalanced 
              ? "bg-success-bg border-success text-success" 
              : "bg-danger-bg border-danger text-danger"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {summary.isBalanced ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
              <span className="font-semibold text-lg">
                {summary.isBalanced ? "SYSTEM BALANCED" : `IMBALANCE DETECTED: ${formatAmount(Math.abs(summary.netDifference))}`}
              </span>
            </div>
            <div className="text-sm opacity-80">
              {entries.length} entries
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Total Assets</span>
            </div>
            <p className="text-xl font-bold text-success">{formatAmount(summary.totalAssets)}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Total Liabilities</span>
            </div>
            <p className="text-xl font-bold text-danger">{formatAmount(summary.totalLiabilities)}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Revenue</span>
            </div>
            <p className="text-xl font-bold text-credit">{formatAmount(summary.totalRevenue)}</p>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-muted mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Expenses</span>
            </div>
            <p className="text-xl font-bold text-warning">{formatAmount(summary.totalExpenses)}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface border border-border rounded-2xl mb-6"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Debit vs Credit Flow</h3>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-success font-medium">Debits</span>
                  <span className="font-mono text-foreground">{formatAmount(totalDebits)}</span>
                </div>
                <div className="h-4 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalDebits / (totalDebits + totalCredits || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-muted">vs</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-credit font-medium">Credits</span>
                  <span className="font-mono text-foreground">{formatAmount(totalCredits)}</span>
                </div>
                <div className="h-4 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-credit transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalCredits / (totalDebits + totalCredits || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Ledger Entries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Entry ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Transaction</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted">Account</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-success">Debit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-credit">Credit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted">Balance After</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted">Time</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    className={`border-b border-border hover:bg-background transition-colors ${
                      entry.status === "MISMATCH" ? "border-l-4 border-l-danger" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-sm text-foreground">JRN_{entry.id.slice(0, 6)}</td>
                    <td className="py-3 px-4 font-mono text-sm text-muted">{entry.transaction_ref}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        entry.account_type === "ASSET" ? "bg-success-bg text-success" :
                        entry.account_type === "LIABILITY" ? "bg-danger-bg text-danger" :
                        entry.account_type === "REVENUE" ? "bg-ledger-credit text-credit" :
                        "bg-warning-bg text-warning"
                      }`}>
                        {entry.account_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-success">
                      {entry.debit ? formatAmount(entry.debit) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-credit">
                      {entry.credit ? formatAmount(entry.credit) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">
                      {formatAmount(entry.balance_after)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted">{formatTime(entry.created_at)}</td>
                    <td className="py-3 px-4 text-center">
                      {entry.status === "VALID" ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-danger" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && !loading && (
              <p className="text-center py-12 text-muted">No ledger entries yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const mockEntries: LedgerEntry[] = [
  {
    id: "1",
    transaction_ref: "TXN_001",
    account_type: "LIABILITY",
    debit: 0,
    credit: 10000,
    balance_after: 10000,
    created_at: new Date().toISOString(),
    status: "VALID",
  },
  {
    id: "2",
    transaction_ref: "TXN_001",
    account_type: "ASSET",
    debit: 10000,
    credit: 0,
    balance_after: 10000,
    created_at: new Date().toISOString(),
    status: "VALID",
  },
  {
    id: "3",
    transaction_ref: "TXN_002",
    account_type: "REVENUE",
    debit: 0,
    credit: 100,
    balance_after: 100,
    created_at: new Date().toISOString(),
    status: "VALID",
  },
  {
    id: "4",
    transaction_ref: "TXN_002",
    account_type: "ASSET",
    debit: 100,
    credit: 0,
    balance_after: 100,
    created_at: new Date().toISOString(),
    status: "VALID",
  },
];