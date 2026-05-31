"use client";

import { formatMoney } from "../hooks/useAdminData";

interface ClientBalancesProps {
  totalBalance: number;
  balanceTrend: number[];
  deposits: number;
  withdrawals: number;
  netFlow: number;
  loading?: boolean;
}

export function ClientBalances({
  totalBalance,
  balanceTrend,
  deposits,
  withdrawals,
  netFlow,
  loading = false,
}: ClientBalancesProps) {
  const w = 360;
  const h = 120;
  const values = balanceTrend.length > 0 ? balanceTrend : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const norm = (v: number) => {
    if (max === min) return h / 2;
    return h - ((v - min) / (max - min)) * (h - 16) - 8;
  };
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${Math.round(i * step)},${Math.round(norm(v))}`).join(" ");

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Client Balances</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">7-day trend</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">All Client Balances</p>
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatMoney(totalBalance)}</p>
          )}
        </div>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">Live</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl bg-slate-50 dark:bg-zinc-800/50 p-4">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="balanceStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={points} fill="none" stroke="url(#balanceStroke)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polygon points={`${points} ${w},${h} 0,${h}`} fill="url(#balanceFill)" />
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Deposits</p>
          {loading ? (
            <div className="h-5 w-full animate-pulse rounded bg-emerald-200 dark:bg-emerald-800 mt-1" />
          ) : (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(deposits)}</p>
          )}
        </div>
        <div className="rounded-xl bg-red-100 dark:bg-red-900/30 p-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Withdrawals</p>
          {loading ? (
            <div className="h-5 w-full animate-pulse rounded bg-red-200 dark:bg-red-800 mt-1" />
          ) : (
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatMoney(withdrawals)}</p>
          )}
        </div>
        <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/30 p-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Net Flow</p>
          {loading ? (
            <div className="h-5 w-full animate-pulse rounded bg-indigo-200 dark:bg-indigo-800 mt-1" />
          ) : (
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatMoney(netFlow)}</p>
          )}
        </div>
      </div>
    </div>
  );
}