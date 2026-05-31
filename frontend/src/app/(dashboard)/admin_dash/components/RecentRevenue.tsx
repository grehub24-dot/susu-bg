"use client";

import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { StatTile } from "@/components/dashboard/widgets";
import { formatMoney, formatDateTime } from "../hooks/useAdminData";

interface RecentRevenueItem {
  id: string;
  category: string;
  label: string;
  amount: number;
  reference: string;
  note: string;
  created_at: string;
  sourceType: string;
  source: string;
}

interface RecentRevenueProps {
  items: RecentRevenueItem[];
  loading?: boolean;
}

export function RecentRevenue({ items, loading = false }: RecentRevenueProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Revenue</h3>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))
        ) : items.length > 0 ? (
          items.slice(0, 5).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800/50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2">
                  <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.note || item.sourceType?.toLowerCase() || item.category?.replaceAll("_", " ")} • {formatDateTime(item.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(item.amount)}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">{item.reference || item.category?.replaceAll("_", " ")}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No revenue entries recorded yet.</div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 p-3 text-xs text-slate-500 dark:text-slate-400">
        Track loans, investment returns, commissions, penalties, and maintenance income.
      </div>
    </div>
  );
}