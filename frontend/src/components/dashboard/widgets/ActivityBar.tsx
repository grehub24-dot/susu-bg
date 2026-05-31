"use client";

import { motion } from "framer-motion";

interface ActivityBarProps {
  labels: string[];
  deposits: number[];
  withdrawals: number[];
  title?: string;
  partialIndices?: ReadonlySet<number> | null;
}

export function ActivityBar({
  labels,
  deposits,
  withdrawals,
  title,
  partialIndices,
}: ActivityBarProps) {
  const max = Math.max(1, ...deposits, ...withdrawals);
  const count = labels.length;

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthLabel = monthNames[currentMonth];
  const currentLabelIndex = labels.findIndex(l => l === currentMonthLabel);

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {title}
        </h3>
      )}
      <div className="flex items-center gap-4 mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Deposit
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          Withdraw
        </div>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-40">
        {labels.map((label, idx) => {
          const depositValue = deposits[idx] || 0;
          const withdrawValue = withdrawals[idx] || 0;
          const depositHeight = max > 0 ? (depositValue / max) * 100 : 0;
          const withdrawHeight = max > 0 ? (withdrawValue / max) * 100 : 0;
          const isCurrentMonth = idx === currentLabelIndex;
          const isPartial = partialIndices?.has(idx);

          return (
            <div
              key={`${label}-${idx}`}
              className={`flex flex-col items-center gap-1 flex-1 min-w-0 ${isCurrentMonth ? 'relative' : ''}`}
            >
              {isCurrentMonth && (
                <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Current</span>
              )}
              <div className="flex items-end justify-center gap-0.5 h-full w-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${depositHeight}%` }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className={`w-4 rounded-t-full ${isCurrentMonth ? 'bg-emerald-500 shadow-[0_0_14px_#059669] ring-2 ring-emerald-500/60' : 'bg-emerald-500/70'}`}
                  style={{ minHeight: 6 }}
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${withdrawHeight}%` }}
                  transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.03 }}
                  className={`w-4 rounded-t-full ${isCurrentMonth ? 'bg-red-500 shadow-[0_0_14px_#DC2626] ring-2 ring-red-500/60' : 'bg-red-500/50'}`}
                  style={{ minHeight: 6 }}
                />
              </div>
              <div className={`text-[10px] ${isCurrentMonth ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                {label}
                {isPartial && <span className="ml-0.5 text-amber-600 dark:text-amber-400">½</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Deposits</p>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            GHS {formatValue(deposits.reduce((a, b) => a + b, 0))}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Withdrawals</p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            GHS {formatValue(withdrawals.reduce((a, b) => a + b, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}