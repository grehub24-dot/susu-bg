"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  roles: Record<string, number>;
  recentlyActive: number;
}

interface StaffOverviewProps {
  staffStats: StaffStats | null | undefined;
  loading: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function StatBox({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "text-slate-900 dark:text-slate-100",
    positive: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mb-2">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <p className={`text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export function StaffOverview({ staffStats, loading }: StaffOverviewProps) {
  const roles = staffStats?.roles || {};
  const roleEntries = Object.entries(roles).sort((a, b) => b[1] - a[1]);

  return (
    <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Staff Overview</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </>
        ) : (
          <>
            <StatBox icon={Users} label="Total Staff" value={staffStats?.total || 0} tone="default" />
            <StatBox
              icon={UserCheck}
              label="Active"
              value={staffStats?.active || 0}
              tone="positive"
            />
            <StatBox icon={UserX} label="Inactive" value={staffStats?.inactive || 0} tone="danger" />
            <StatBox
              icon={Clock}
              label="Active (7d)"
              value={staffStats?.recentlyActive || 0}
              tone="warning"
            />
          </>
        )}
      </div>

      {!loading && roleEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 block">Roles:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {roleEntries.map(([role, count]) => (
              <div
                key={role}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50"
              >
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">{role.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}