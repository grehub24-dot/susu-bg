"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ActivityBar } from "@/components/dashboard/widgets";
import { useAdminData } from "@/app/(dashboard)/admin_dash/hooks/useAdminData";
import { AdminOverview, RevenueDonut, ClientBalances, RecentRevenue, QuickActions } from "@/app/(dashboard)/admin_dash/components";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function AdminDashPage() {
  const {
    kyc,
    summary,
    loading,
    error,
    refresh,
    weeklyActivity,
    monthlyActivity,
    revenueSegments,
    averageClientBalance,
  } = useAdminData();

  const [activityView, setActivityView] = useState<"weekly" | "monthly">("weekly");
  const currentActivity = activityView === "weekly" ? weeklyActivity : monthlyActivity;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Error Banner */}
      {error && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <button onClick={refresh} className="mt-2 text-xs font-medium text-[var(--danger)] underline">
            Retry
          </button>
        </motion.div>
      )}

      {/* Overview Cards */}
      <AdminOverview kyc={kyc} summary={summary} loading={loading} />

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {activityView === "monthly" ? "Monthly Activity" : "Weekly Activity"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {activityView === "monthly"
                    ? `${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
                    : "Last 7 days"}
                </p>
              </div>

              {/* View Toggle */}
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1">
                <button
                  type="button"
                  onClick={() => setActivityView("weekly")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activityView === "weekly"
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setActivityView("monthly")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activityView === "monthly"
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <ActivityBar
              title=""
              labels={currentActivity.labels}
              deposits={currentActivity.deposits}
              withdrawals={currentActivity.withdrawals}
            />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <QuickActions />
        </motion.div>
      </div>

      {/* Revenue + Client Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Revenue */}
        <motion.div variants={itemVariants}>
          <RecentRevenue
            items={summary?.recentRevenue || []}
            loading={loading}
          />
        </motion.div>

        {/* Client Balances */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <ClientBalances
            totalBalance={summary?.totalClientBalance || 0}
            balanceTrend={summary?.balanceTrend7d || []}
            deposits={summary?.depositsThisMonth || 0}
            withdrawals={summary?.withdrawalsThisMonth || 0}
            netFlow={summary?.netFlowThisMonth || 0}
            loading={loading}
          />
        </motion.div>
      </div>

      {/* Revenue Donut + Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants}>
          <RevenueDonut
            segments={revenueSegments}
            currency={summary?.currency || "GHS"}
          />
        </motion.div>

        {/* Average Client Balance */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Average Client Balance</h3>
          <div className="text-center">
            {loading ? (
              <div className="h-12 w-32 mx-auto animate-pulse rounded-xl bg-[var(--border)]" />
            ) : (
              <>
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {summary?.currency || "GHS"} {(averageClientBalance).toFixed(2)}
                </p>
                <p className="text-xs text-[var(--muted)] mt-2">
                  Based on {kyc.total} active clients
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Net Flow Summary */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Net Flow Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Deposits</span>
              <span className="text-sm font-semibold text-[var(--success)]">
                +{summary?.currency || "GHS"} {(summary?.depositsThisMonth || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Withdrawals</span>
              <span className="text-sm font-semibold text-[var(--danger)]">
                -{summary?.currency || "GHS"} {(summary?.withdrawalsThisMonth || 0).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">Net</span>
              <span className="text-sm font-bold text-[var(--foreground)]">
                {summary?.currency || "GHS"} {(summary?.netFlowThisMonth || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}