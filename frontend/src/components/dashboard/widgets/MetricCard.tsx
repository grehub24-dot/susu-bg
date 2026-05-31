"use client";

import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  tone?: "default" | "positive" | "warning" | "danger";
  icon?: LucideIcon;
  loading?: boolean;
  href?: string;
  caption?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  tone = "default",
  icon: Icon,
  loading = false,
  href,
  caption,
}: MetricCardProps) {
  const toneClasses = {
    default: "text-slate-700 dark:text-slate-200",
    positive: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  const iconBgClasses = {
    default: "bg-slate-100 dark:bg-slate-800",
    positive: "bg-emerald-100 dark:bg-emerald-900/30",
    warning: "bg-amber-100 dark:bg-amber-900/30",
    danger: "bg-red-100 dark:bg-red-900/30",
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-24 mt-2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : (
            <p className={`mt-2 text-2xl font-bold ${toneClasses[tone]}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          )}
          {trend !== undefined && !loading && (
            <div className="mt-1 flex items-center gap-1">
              {trend >= 0 ? (
                <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight size={14} className="text-red-600 dark:text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
            </div>
          )}
          {caption && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{caption}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`rounded-xl p-3 ${iconBgClasses[tone]}`}
          >
            <Icon
              size={20}
              className={toneClasses[tone]}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}