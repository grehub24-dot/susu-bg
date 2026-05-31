"use client";

import { motion } from "framer-motion";
import { formatMoney } from "../hooks/useAdminData";

interface RevenueDonutProps {
  segments: Array<{ label: string; value: number; color: string }>;
  currency?: string;
}

export function RevenueDonut({ segments, currency = "GHS" }: RevenueDonutProps) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const hasValue = segments.some((s) => s.value > 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashes = segments.map((s) => (s.value / total) * circumference);
  const offsets = dashes.map((_, idx) => dashes.slice(0, idx).reduce((acc, v) => acc + v + 2, 0));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Revenue Mix</h3>
      <div className="flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} stroke="rgba(0,0,0,0.06)" strokeWidth="14" fill="none" />
          {hasValue ? (
            segments.map((s, idx) => {
              const dash = dashes[idx] ?? 0;
              return (
                <circle
                  key={s.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke={s.color}
                  strokeWidth="14"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-(offsets[idx] ?? 0)}
                  transform="rotate(-90 60 60)"
                />
              );
            })
          ) : (
            <circle cx="60" cy="60" r={radius} stroke="#E2E8F0" strokeWidth="14" fill="none" strokeDasharray={`${circumference * 0.25} ${circumference}`} transform="rotate(-90 60 60)" />
          )}
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {hasValue ? (
          segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{Math.round((s.value / total) * 100)}%</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{formatMoney(s.value, currency)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center py-4">No revenue recorded yet.</div>
        )}
      </div>
    </div>
  );
}