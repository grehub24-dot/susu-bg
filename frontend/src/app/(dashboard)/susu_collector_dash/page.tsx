"use client";

import { motion } from "framer-motion";
import { Users, DollarSign, Target, TrendingUp, PiggyBank, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricCard, StatTile, ActivityBar, TransactionTable, QuickAction } from "@/components/dashboard/widgets";
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

interface SusuGroup {
  id: string;
  group_name: string;
  group_code: string;
  target_group: string;
  max_members: number;
  current_members: number;
  daily_contribution: number;
  status: string;
}

export default function SusuCollectorDashPage() {
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const backendUrl = "/api/backend";

  useEffect(() => {
    const loadGroups = async () => {
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

        const response = await fetch(`${backendUrl}/api/susu/groups`, { headers });
        const data = await response.json();
        if (data.success) {
          setGroups(data.data || []);
          if (data.data?.length > 0 && !selectedGroup) {
            setSelectedGroup(data.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load groups");
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [backendUrl, selectedGroup]);

  const totalMembers = groups.reduce((acc, g) => acc + (g.current_members || 0), 0);
  const totalDailyTarget = groups.reduce((acc, g) => acc + (g.daily_contribution * g.max_members || 0), 0);
  const totalDailyCollected = groups.reduce((acc, g) => acc + (g.daily_contribution * g.current_members || 0), 0);

  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sampleCollections = [8500, 7200, 9100, 6800, 8800, 3200, 0];
  const sampleWithdrawals = [2000, 1500, 3000, 1000, 2500, 500, 0];

  return (
    <DashboardLayout title="Susu Collector Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Overview Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Groups Managed"
            value={groups.length}
            icon={Users}
            tone="default"
            loading={loading}
            href="/susu"
          />
          <MetricCard
            label="Total Members"
            value={totalMembers}
            icon={Users}
            tone="positive"
            loading={loading}
            href="/susu/members"
          />
          <MetricCard
            label="Daily Collection"
            value={formatMoney(totalDailyCollected)}
            icon={DollarSign}
            tone="positive"
            loading={loading}
          />
          <MetricCard
            label="Collection Target"
            value={formatMoney(totalDailyTarget)}
            icon={Target}
            tone="default"
            loading={loading}
          />
        </motion.div>

        {/* Activity Chart */}
        <motion.div variants={itemVariants}>
          <ActivityBar
            title="Weekly Collection Activity"
            labels={weekLabels}
            deposits={sampleCollections}
            withdrawals={sampleWithdrawals}
          />
        </motion.div>

        {/* Group Selection */}
        {groups.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedGroup === group.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank size={16} className="text-[var(--primary)]" />
                  <span className="text-xs font-medium text-[var(--muted)]">{group.group_code}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{group.group_name}</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {group.current_members}/{group.max_members} members
                </p>
              </button>
            ))}
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            label="View Groups"
            description="Manage susu groups"
            icon={Users}
            href="/susu"
            variant="primary"
          />
          <QuickAction
            label="View Members"
            description="Member management"
            icon={Users}
            href="/susu/members"
            variant="default"
          />
          <QuickAction
            label="Loan Applications"
            description="Process loan requests"
            icon={DollarSign}
            href="/susu/loans"
            variant="default"
          />
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Active Groups" value={groups.filter((g) => g.status === "ACTIVE").length} icon={TrendingUp} tone="positive" />
          <StatTile label="Avg Collection" value={formatMoney(totalDailyCollected / (groups.length || 1))} icon={DollarSign} />
          <StatTile label="Members Today" value={totalMembers} icon={Users} />
          <StatTile label="Collection Rate" value={`${Math.round((totalDailyCollected / (totalDailyTarget || 1)) * 100)}%`} icon={Target} tone="positive" />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}