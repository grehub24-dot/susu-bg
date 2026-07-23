"use client";

import { motion } from "framer-motion";
import { Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, Search, LogOut } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MetricCard, StatTile, TransactionTable, QuickAction } from "@/components/dashboard/widgets";
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

interface TellerSession {
  id: string;
  tellerId: string;
  tellerCode: string;
  fullName: string;
  branchId: string;
  branchName: string;
  dailyLimit: number;
  currentCashPosition: number;
  expiresAt: string;
}

export default function TellerDashPage() {
  const [session, setSession] = useState<TellerSession | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [todayStats, setTodayStats] = useState({ deposits: 0, withdrawals: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const backendUrl = "/api/backend";

  useEffect(() => {
    const loadTellerData = async () => {
      try {
        const sessionRes = await fetch("/api/teller-session", {
          credentials: "same-origin"
        });
        if (!sessionRes.ok) {
          setLoading(false);
          return;
        }
        const sessionData = await sessionRes.json();
        if (sessionData.success && sessionData.session) {
          setSession(sessionData.session);

          const txRes = await fetch(`${backendUrl}/api/teller/transactions?tellerId=${sessionData.session.tellerId}&limit=10`, {
            credentials: "same-origin"
          });
          if (txRes.ok) {
            const txData = await txRes.json();
            if (txData.success) {
              setTransactions(txData.data || []);
              const deps = txData.data?.filter((t: Transaction) => t.type === "DEPOSIT").reduce((a: number, t: Transaction) => a + t.amount, 0) || 0;
              const withs = txData.data?.filter((t: Transaction) => t.type === "WITHDRAWAL").reduce((a: number, t: Transaction) => a + t.amount, 0) || 0;
              setTodayStats({ deposits: deps, withdrawals: withs, count: txData.data?.length || 0 });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load teller data");
      } finally {
        setLoading(false);
      }
    };

    loadTellerData();
  }, [backendUrl]);

  return (
    <DashboardLayout title="Teller Dashboard">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Cash Position */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Cash Position"
            value={formatMoney(session?.currentCashPosition || 0)}
            icon={Wallet}
            tone="positive"
            loading={loading}
          />
          <MetricCard
            label="Daily Limit"
            value={formatMoney(session?.dailyLimit || 0)}
            icon={TrendingUp}
            tone="default"
            loading={loading}
          />
          <MetricCard
            label="Today Deposits"
            value={formatMoney(todayStats.deposits)}
            icon={ArrowDownRight}
            tone="positive"
            loading={loading}
          />
          <MetricCard
            label="Today Withdrawals"
            value={formatMoney(todayStats.withdrawals)}
            icon={ArrowUpRight}
            tone="danger"
            loading={loading}
          />
        </motion.div>

        {/* Session Info */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Session Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Teller Code" value={session?.tellerCode || "—"} />
            <StatTile label="Branch" value={session?.branchName || "—"} />
            <StatTile label="Transactions" value={todayStats.count} />
            <StatTile label="Session Expires" value={session?.expiresAt ? new Date(session.expiresAt).toLocaleTimeString() : "—"} />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            label="Process Deposit"
            description="Record cash deposit"
            icon={ArrowDownRight}
            href="/teller"
            variant="success"
          />
          <QuickAction
            label="Process Withdrawal"
            description="Record cash withdrawal"
            icon={ArrowUpRight}
            href="/teller"
            variant="default"
          />
          <QuickAction
            label="Search Client"
            description="Find client by phone or ID"
            icon={Search}
            href="/teller"
            variant="default"
          />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <TransactionTable
            transactions={transactions}
            title="Recent Transactions"
            limit={5}
            viewAllHref="/teller"
            loading={loading}
          />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}