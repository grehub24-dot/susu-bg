"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/widgets";
import { formatMoney } from "../hooks/useAdminData";

interface AdminOverviewProps {
  kyc: {
    total: number;
    pending: number;
    approved: number;
  };
  summary: {
    currency: string;
    totalClientBalance: number;
    depositsThisMonth: number;
    withdrawalsThisMonth: number;
    feeRevenueThisMonth: number;
    revenueThisMonth: number;
    netFlowThisMonth: number;
  } | null;
  loading: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function AdminOverview({ kyc, summary, loading }: AdminOverviewProps) {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Users"
        value={kyc.total}
        icon={Users}
        tone="default"
        loading={loading}
        href="/admin_dash/users"
        caption="Registered clients"
      />
      <MetricCard
        label="KYC Pending"
        value={kyc.pending}
        icon={UserCheck}
        tone={kyc.pending > 0 ? "warning" : "positive"}
        loading={loading}
        href="/admin_dash/users"
        caption={`${kyc.approved} approved`}
      />
      <MetricCard
        label="Total Revenue"
        value={formatMoney(summary?.revenueThisMonth || 0, summary?.currency)}
        icon={DollarSign}
        tone="positive"
        loading={loading}
        href="/admin_dash/revenue"
        caption="This month"
      />
      <MetricCard
        label="Fee Revenue"
        value={formatMoney(summary?.feeRevenueThisMonth || 0, summary?.currency)}
        icon={TrendingUp}
        tone="default"
        loading={loading}
        href="/admin_dash/revenue"
        caption="Transaction fees"
      />
    </motion.div>
  );
}