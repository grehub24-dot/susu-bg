"use client";

import { motion } from "framer-motion";
import { UserCheck, Wallet, Clock, Activity, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricCard, StatTile, ActivityBar, QuickAction } from "@/components/dashboard/widgets";
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

export default function SupervisorDashPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeSessions: 0,
    cashPosition: 0,
    avgTime: 0,
    flaggedCount: 0,
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

        const [tellersRes, transactionsRes, flagsRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/tellers`, { headers }),
          fetch(`${backendUrl}/api/admin/transactions?limit=100`, { headers }),
          fetch(`${backendUrl}/api/admin/compliance/flags?status=PENDING`, { headers }),
        ]);

        const [tellersData, transactionsData, flagsData] = await Promise.all([
          tellersRes.json(),
          transactionsRes.json(),
          flagsRes.json(),
        ]);

        const activeTellers = tellersData.success ? tellersData.data?.filter((t: { status: string }) => t.status === 'ACTIVE').length || 0 : 0;
        
        let cashPosition = 0;
        if (transactionsData.success && transactionsData.data) {
          cashPosition = transactionsData.data
            .filter((t: { type: string; status: string }) => t.type === 'DEPOSIT' && t.status === 'SUCCESS')
            .reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0);
        }

        const flaggedCount = flagsData.success ? flagsData.data?.length || 0 : 0;

        setMetrics({
          activeSessions: activeTellers,
          cashPosition,
          avgTime: 2.5,
          flaggedCount,
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
  const sampleDeposits = [45000, 52000, 48000, 55000, 42000, 12000, 0];
  const sampleWithdrawals = [32000, 38000, 28000, 42000, 25000, 5000, 0];

  return (
    <DashboardLayout title="Supervisor Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Overview Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Active Teller Sessions"
            value={5}
            icon={Activity}
            tone="positive"
            loading={loading}
          />
          <MetricCard
            label="Total Cash Position"
            value={formatMoney(125000)}
            icon={Wallet}
            tone="default"
            loading={loading}
          />
          <MetricCard
            label="Avg Transaction Time"
            value="2.5 min"
            icon={Clock}
            tone="default"
            loading={loading}
          />
          <MetricCard
            label="Flagged Transactions"
            value={3}
            icon={AlertTriangle}
            tone="warning"
            loading={loading}
          />
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={itemVariants}>
          <ActivityBar
            title="Teller Activity Overview"
            labels={weekLabels}
            deposits={sampleDeposits}
            withdrawals={sampleWithdrawals}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            label="View Teller Sessions"
            description="Monitor active teller sessions"
            icon={Activity}
            href="/admin/tellers"
            variant="primary"
          />
          <QuickAction
            label="Transaction Monitor"
            description="Real-time transaction monitoring"
            icon={Clock}
            href="/admin/transactions/monitor"
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

        {/* Teller Status Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatTile label="TLR-001" value="Active" icon={UserCheck} tone="positive" size="sm" />
          <StatTile label="TLR-002" value="Active" icon={UserCheck} tone="positive" size="sm" />
          <StatTile label="TLR-003" value="Break" icon={Clock} tone="warning" size="sm" />
          <StatTile label="TLR-004" value="Active" icon={UserCheck} tone="positive" size="sm" />
          <StatTile label="TLR-005" value="Offline" icon={Activity} size="sm" />
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Daily Transactions" value={127} icon={Activity} />
          <StatTile label="Avg Cash Position" value={formatMoney(25000)} icon={Wallet} />
          <StatTile label="Pending Approvals" value={2} icon={UserCheck} tone="warning" />
          <StatTile label="System Uptime" value="99.9%" icon={Activity} tone="positive" />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}