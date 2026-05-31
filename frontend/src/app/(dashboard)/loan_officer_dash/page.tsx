"use client";

import { motion } from "framer-motion";
import { Briefcase, DollarSign, TrendingUp, Clock, UserCheck, AlertCircle } from "lucide-react";
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

export default function LoanOfficerDashPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeLoans: 0,
    pendingApplications: 0,
    loanPortfolio: 0,
    defaultRate: 0,
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

        const [loansRes, pendingRes] = await Promise.all([
          fetch(`${backendUrl}/api/susu/loans`, { headers }),
          fetch(`${backendUrl}/api/susu/loans?status=PENDING`, { headers }),
        ]);

        const [loansData, pendingData] = await Promise.all([
          loansRes.json(),
          pendingRes.json(),
        ]);

        const loans = loansData.data || [];
        const activeLoans = loans.filter((l: { status: string }) => l.status === 'ACTIVE' || l.status === 'APPROVED').length;
        const pendingApplications = pendingData.data?.length || 0;
        
        const portfolio = loans.reduce((sum: number, l: { amount?: number; principal?: number }) => {
          return sum + (l.amount || l.principal || 0);
        }, 0);

        const defaulted = loans.filter((l: { status: string }) => l.status === 'DEFAULTED').length;
        const defaultRate = loans.length > 0 ? (defaulted / loans.length) * 100 : 0;

        setMetrics({
          activeLoans,
          pendingApplications,
          loanPortfolio: portfolio,
          defaultRate: Math.round(defaultRate * 10) / 10,
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
  const sampleDisbursements = [15000, 22000, 18000, 25000, 12000, 0, 0];
  const sampleCollections = [8500, 9200, 7800, 11000, 6500, 0, 0];

  return (
    <DashboardLayout title="Loan Officer Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Overview Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Active Loans"
            value={metrics.activeLoans}
            icon={Briefcase}
            tone="positive"
            loading={loading}
            href="/susu/loans"
          />
          <MetricCard
            label="Pending Applications"
            value={metrics.pendingApplications}
            icon={Clock}
            tone="warning"
            loading={loading}
            href="/susu/loans"
          />
          <MetricCard
            label="Loan Portfolio"
            value={formatMoney(metrics.loanPortfolio)}
            icon={DollarSign}
            tone="default"
            loading={loading}
          />
          <MetricCard
            label="Default Rate"
            value={`${metrics.defaultRate}%`}
            icon={TrendingUp}
            tone="danger"
            loading={loading}
          />
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={itemVariants}>
          <ActivityBar
            title="Loan Disbursement & Collection"
            labels={weekLabels}
            deposits={sampleDisbursements}
            withdrawals={sampleCollections}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickAction
            label="New Application"
            description="Process new loan request"
            icon={Briefcase}
            href="/susu/loans"
            variant="primary"
          />
          <QuickAction
            label="Pending Review"
            description="Applications awaiting review"
            icon={Clock}
            href="/susu/loans"
            variant="default"
          />
          <QuickAction
            label="Active Loans"
            description="Manage active loans"
            icon={UserCheck}
            href="/susu/loans"
            variant="default"
          />
          <QuickAction
            label="Default Tracking"
            description="Monitor loan defaults"
            icon={AlertCircle}
            href="/susu/loans"
            variant="default"
          />
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Avg Loan Amount" value={formatMoney(8500)} icon={DollarSign} />
          <StatTile label="Interest Collected" value={formatMoney(12500)} icon={TrendingUp} tone="positive" />
          <StatTile label="Defaulted Loans" value={2} icon={AlertCircle} tone="danger" />
          <StatTile label="Approval Rate" value="87%" icon={UserCheck} tone="positive" />
        </motion.div>

        {/* Loan Stats */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Loan Portfolio Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--success)]/10">
              <p className="text-xs text-[var(--muted)]">Active</p>
              <p className="text-2xl font-bold text-[var(--success)]">24</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--warning)]/10">
              <p className="text-xs text-[var(--muted)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--warning)]">8</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--danger)]/10">
              <p className="text-xs text-[var(--muted)]">Defaulted</p>
              <p className="text-2xl font-bold text-[var(--danger)]">2</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--primary)]/10">
              <p className="text-xs text-[var(--muted)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--primary)]">156</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}