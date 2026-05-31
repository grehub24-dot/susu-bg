"use client";

import { motion } from "framer-motion";
import { LucideIcon, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

export interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  status: "SUCCESS" | "FAILED" | "PENDING";
  created_at: string;
  user?: {
    full_name?: string;
    phone_number?: string;
  };
}

interface TransactionTableProps {
  transactions: Transaction[];
  title?: string;
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  loading?: boolean;
}

const TypeIcon: Record<string, LucideIcon> = {
  DEPOSIT: ArrowDownRight,
  WITHDRAWAL: ArrowUpRight,
  TRANSFER: ArrowRightLeft,
};

export function TransactionTable({
  transactions,
  title = "Recent Transactions",
  limit = 5,
  showViewAll = true,
  viewAllHref = "/admin/transactions",
  loading = false,
}: TransactionTableProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const displayTx = transactions.slice(0, limit);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {showViewAll && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            View all →
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--border)]" />
          ))
        ) : displayTx.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            No transactions yet
          </div>
        ) : (
          displayTx.map((tx, idx) => {
            const Icon = TypeIcon[tx.type] || ArrowRightLeft;
            const isDeposit = tx.type === "DEPOSIT";
            const iconBg = isDeposit ? "bg-[var(--success)]/15" : "bg-[var(--danger)]/15";
            const amountColor = isDeposit ? "text-[var(--success)]" : "text-[var(--danger)]";

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${iconBg}`}>
                    <Icon size={16} className="text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {tx.user?.full_name || tx.reference} • {formatDateTime(tx.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${amountColor}`}>
                    {isDeposit ? "+" : "-"}GHS {Number(tx.amount).toFixed(2)}
                  </p>
                  <StatusBadge status={tx.status} size="sm" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}