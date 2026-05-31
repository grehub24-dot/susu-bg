"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ActivityBar } from "@/components/dashboard/widgets";
import { useAdminData } from "./hooks/useAdminData";
import { AdminOverview, RevenueDonut, ClientBalances, RecentRevenue, QuickActions, StaffOverview } from "./components";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function AdminDashPage() {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(true);
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

  useEffect(() => {
    const validateAdminSession = async () => {
      try {
        const response = await fetch('/api/admin-auth/verify-session', {
          method: 'GET',
          credentials: 'same-origin'
        });

        if (!response.ok) {
          router.replace('/admin-login');
          return;
        }
      } catch {
        router.replace('/admin-login');
      } finally {
        setIsValidating(false);
      }
    };

    validateAdminSession();
  }, [router]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Validating session...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Error Banner */}
        {error && (
          <motion.div variants={itemVariants} className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={refresh} className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline">
              Retry
            </button>
          </motion.div>
        )}

        {/* Overview Cards */}
        <AdminOverview kyc={kyc} summary={summary} loading={loading} />

        {/* Staff Overview */}
        <StaffOverview staffStats={summary?.staffStats} loading={loading} />

        {/* Activity + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activityView === "monthly" ? "Monthly Activity" : "Weekly Activity"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activityView === "monthly"
                      ? `${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
                      : "Last 7 days"}
                  </p>
                </div>

                {/* View Toggle */}
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-1">
                  <button
                    type="button"
                    onClick={() => setActivityView("weekly")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activityView === "weekly"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityView("monthly")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      activityView === "monthly"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
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

        {/* Revenue Donut */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <RevenueDonut
              segments={revenueSegments}
              currency={summary?.currency || "GHS"}
            />
          </motion.div>

          {/* Average Client Balance */}
          <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Average Client Balance</h3>
            <div className="text-center">
              {loading ? (
                <div className="h-12 w-32 mx-auto animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {summary?.currency || "GHS"} {(averageClientBalance).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Based on {kyc.total} active clients
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* Summary Stats */}
          <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Net Flow Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Deposits</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +{summary?.currency || "GHS"} {(summary?.depositsThisMonth || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Withdrawals</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  -{summary?.currency || "GHS"} {(summary?.withdrawalsThisMonth || 0).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Net</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {summary?.currency || "GHS"} {(summary?.netFlowThisMonth || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
}