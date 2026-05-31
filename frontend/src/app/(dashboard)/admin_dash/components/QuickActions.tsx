"use client";

import { motion } from "framer-motion";
import { Users, DollarSign, Activity, Shield, UsersRound } from "lucide-react";
import { QuickAction } from "@/components/dashboard/widgets";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function QuickActions() {
  return (
    <motion.div variants={itemVariants} className="space-y-2.5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Actions</h3>
      <QuickAction
        label="Staff Roles"
        description="Access other role dashboards"
        icon={UsersRound}
        href="/staff"
        variant="default"
      />
      <QuickAction
        label="Manage Users"
        description="View and manage user accounts"
        icon={Users}
        href="/admin_dash/users"
        variant="primary"
      />
      <QuickAction
        label="View Revenue"
        description="Revenue reports and breakdowns"
        icon={DollarSign}
        href="/admin_dash/revenue"
        variant="primary"
      />
      <QuickAction
        label="System Health"
        description="Monitor system performance"
        icon={Activity}
        href="/admin_dash/system-health"
        variant="default"
      />
      <QuickAction
        label="Compliance"
        description="AML and regulatory compliance"
        icon={Shield}
        href="/admin_dash/compliance"
        variant="default"
      />
    </motion.div>
  );
}