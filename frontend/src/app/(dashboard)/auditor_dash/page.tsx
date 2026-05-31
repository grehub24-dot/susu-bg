"use client";

import { motion } from "framer-motion";
import { BarChart3, DollarSign, FileText, AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricCard, StatTile, ActivityBar, QuickAction, TransactionTable } from "@/components/dashboard/widgets";
import { useState, useEffect } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const formatMoney = (value: number) => `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  status: "SUCCESS" | "FAILED" | "PENDING";
  created_at: string;
  user?: { full_name?: string; phone_number?: string };
}

export default function AuditorDashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    flaggedItems: 0,
  });
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const loadData = async () => {
      try {
        const sessionRes = await fetch("/api/staff-session", { 
          credentials: "same-origin",
          method: "GET" 
        });
        
        if (!sessionRes.ok) {
          window.location.href = "/staff-login";
          return;
        }

        const sessionData = await sessionRes.json();
        const token = sessionData.user?.id ? "valid" : null;
        const headers = token ? { "x-admin-session-token": token } : {};

        const [txRes, revenueRes, flagsRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/transactions?limit=10&offset=0`, { headers }),
          fetch(`${backendUrl}/api/admin/revenue/ledger`, { headers }),
          fetch(`${backendUrl}/api/admin/compliance/flags?status=PENDING`, { headers }),
        ]);

        const [txData, revenueData, flagsData] = await Promise.all([
          txRes.json(),
          revenueRes.json(),
          flagsRes.json(),
        ]);

        if (txData.success) setTransactions(txData.data || []);

        let totalRevenue = 0;
        if (revenueData.success && revenueData.data) {
          revenueData.data.forEach((entry: { amount: number; type?: string }) => {
            if (entry.type === 'REVENUE' || !entry.type) {
              totalRevenue += entry.amount || 0;
            }
          });
        }

        const totalExpenses = revenueData.success && revenueData.data 
          ? revenueData.data.filter((e: { type: string }) => e.type === 'EXPENSE').reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0)
          : 0;

        const flaggedItems = flagsData.success ? flagsData.data?.length || 0 : 0;

        setMetrics({
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          flaggedItems,
        });
      } catch (err) {
        console.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [backendUrl]);

  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sampleRevenue = [15000, 18000, 22000, 25000, 19000, 8000, 0];
  const sampleExpenses = [8000, 9200, 7800, 11000, 6500, 2000, 0];

  return (
    <DashboardLayout title="Auditor Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Overview Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Revenue"
            value={formatMoney(metrics.totalRevenue)}
            icon={DollarSign}
            tone="positive"
            loading={loading}
            href="/admin/revenue"
          />
          <MetricCard
            label="Total Expenses"
            value={formatMoney(metrics.totalExpenses)}
            icon={FileText}
            tone="danger"
            loading={loading}
            href="/admin/revenue"
          />
          <MetricCard
            label="Net Profit"
            value={formatMoney(metrics.netProfit)}
            icon={TrendingUp}
            tone="positive"
            loading={loading}
            href="/admin/revenue"
          />
          <MetricCard
            label="Flagged Items"
            value={metrics.flaggedItems}
            icon={AlertTriangle}
            tone="warning"
            loading={loading}
            href="/admin/compliance"
          />
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={itemVariants}>
          <ActivityBar
            title="Revenue vs Expenses"
            labels={weekLabels}
            deposits={sampleRevenue}
            withdrawals={sampleExpenses}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickAction
            label="Revenue Report"
            description="Detailed revenue breakdown"
            icon={BarChart3}
            href="/admin/revenue"
            variant="primary"
          />
          <QuickAction
            label="Audit Logs"
            description="View system audit logs"
            icon={FileText}
            href="/admin/revenue"
            variant="default"
          />
          <QuickAction
            label="Compliance"
            description="AML & regulatory reports"
            icon={Shield}
            href="/admin/compliance"
            variant="default"
          />
          <QuickAction
            label="Flagged Items"
            description="Review flagged transactions"
            icon={AlertTriangle}
            href="/admin/compliance"
            variant="default"
          />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <TransactionTable
            transactions={transactions}
            title="Recent Transactions"
            limit={5}
            viewAllHref="/admin/transactions"
            loading={loading}
          />
        </motion.div>

        {/* Audit Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Transactions Audited" value={1247} icon={FileText} />
          <StatTile label="Discrepancies" value={0} icon={AlertTriangle} tone="positive" />
          <StatTile label="Compliance Score" value="98.5%" icon={Shield} tone="positive" />
          <StatTile label="Last Audit" value="Today" icon={TrendingUp} />
        </motion.div>

        {/* Compliance Status */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Compliance Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--success)]/10">
              <p className="text-xs text-[var(--muted)]">AML Checks</p>
              <p className="text-lg font-bold text-[var(--success)]">Passing</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--success)]/10">
              <p className="text-xs text-[var(--muted)]">KYC Verification</p>
              <p className="text-lg font-bold text-[var(--success)]">Passing</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--warning)]/10">
              <p className="text-xs text-[var(--muted)]">E-Levy</p>
              <p className="text-lg font-bold text-[var(--warning)]">Review</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--success)]/10">
              <p className="text-xs text-[var(--muted)]">BoG Compliance</p>
              <p className="text-lg font-bold text-[var(--success)]">Passing</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}