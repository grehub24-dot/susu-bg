"use client";

import { motion } from "framer-motion";
import { Building2, Users, DollarSign, TrendingUp, Activity, BarChart3 } from "lucide-react";
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

export default function ManagerDashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeStaff: 0,
    totalUsers: 0,
    branchPerformance: 0,
  });
  const backendUrl = "/api/backend";

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

        const [txRes, revenueRes, staffRes, usersRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/transactions?limit=10&offset=0`, { headers }),
          fetch(`${backendUrl}/api/admin/revenue/ledger`, { headers }),
          fetch(`${backendUrl}/api/admin/staff-management/staff`, { headers }),
          fetch(`${backendUrl}/api/admin/users`, { headers }),
        ]);

        const [txData, revenueData, staffData, usersData] = await Promise.all([
          txRes.json(),
          revenueRes.json(),
          staffRes.json(),
          usersRes.json(),
        ]);

        if (txData.success) setTransactions(txData.data || []);
        
        let totalRevenue = 0;
        if (revenueData.success && revenueData.data) {
          totalRevenue = revenueData.data.reduce((sum: number, entry: { amount: number }) => sum + (entry.amount || 0), 0);
        }

        const activeStaff = staffData.success ? staffData.staff?.filter((s: { status: string }) => s.status === 'ACTIVE').length || 0 : 0;
        const totalUsers = usersData.success ? usersData.data?.length || 0 : 0;

        setMetrics({
          totalRevenue,
          activeStaff,
          totalUsers,
          branchPerformance: 98.5,
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
  const sampleDeposits = [25000, 32000, 28000, 35000, 22000, 8000, 0];
  const sampleWithdrawals = [18000, 22000, 15000, 25000, 12000, 3000, 0];

  return (
    <DashboardLayout title="Manager Dashboard">
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
            label="Active Staff"
            value={metrics.activeStaff}
            icon={Users}
            tone="default"
            loading={loading}
            href="/admin/staff"
          />
          <MetricCard
            label="Total Users"
            value={metrics.totalUsers}
            icon={Building2}
            tone="default"
            loading={loading}
            href="/admin/users"
          />
          <MetricCard
            label="Branch Performance"
            value={`${metrics.branchPerformance}%`}
            icon={TrendingUp}
            tone="positive"
            loading={loading}
          />
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={itemVariants}>
          <ActivityBar
            title="Branch Weekly Activity"
            labels={weekLabels}
            deposits={sampleDeposits}
            withdrawals={sampleWithdrawals}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickAction
            label="Staff Management"
            description="Manage branch staff"
            icon={Users}
            href="/admin/staff"
            variant="primary"
          />
          <QuickAction
            label="Revenue Reports"
            description="View revenue breakdowns"
            icon={BarChart3}
            href="/admin/revenue"
            variant="primary"
          />
          <QuickAction
            label="Teller Oversight"
            description="Monitor teller activities"
            icon={Activity}
            href="/admin/tellers"
            variant="default"
          />
          <QuickAction
            label="System Health"
            description="Check system status"
            icon={TrendingUp}
            href="/admin/system-health"
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

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Active Tellers" value={5} icon={Activity} tone="positive" />
          <StatTile label="Pending Approvals" value={3} icon={Users} tone="warning" />
          <StatTile label="KYC Pending" value={12} icon={Users} tone="warning" />
          <StatTile label="System Uptime" value="99.9%" icon={TrendingUp} tone="positive" />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}