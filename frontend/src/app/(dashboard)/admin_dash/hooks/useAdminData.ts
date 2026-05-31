"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface UserRow {
  id: string;
  kyc_status: "PENDING" | "APPROVED" | "REJECTED" | string;
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | string;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  created_at: string;
  wallets?: {
    users?: { full_name?: string | null; phone_number?: string | null } | Array<{ full_name?: string | null; phone_number?: string | null }> | null;
  } | Array<{
    users?: { full_name?: string | null; phone_number?: string | null } | Array<{ full_name?: string | null; phone_number?: string | null }> | null;
  }> | null;
}

interface RevenueBreakdownItem {
  key: string;
  label: string;
  amount: number;
  color: string;
}

interface RecentRevenueItem {
  id: string;
  category: string;
  label: string;
  amount: number;
  reference: string;
  note: string;
  created_at: string;
  sourceType: string;
  source: string;
}

interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  roles: Record<string, number>;
  recentlyActive: number;
}

interface AdminSummary {
  currency: string;
  totalClientBalance: number;
  depositsThisMonth: number;
  withdrawalsThisMonth: number;
  netFlowThisMonth: number;
  feeRevenueThisMonth: number;
  revenueThisMonth: number;
  revenueBreakdownThisMonth: RevenueBreakdownItem[];
  revenueTrend7d: number[];
  recentRevenue: RecentRevenueItem[];
  netFlow7d: number[];
  balanceTrend7d: number[];
  staffStats: StaffStats;
  asOf: string;
}

interface KycStats {
  total: number;
  pending: number;
  approved: number;
}

interface AdminData {
  users: UserRow[];
  transactions: Transaction[];
  summary: AdminSummary | null;
  kyc: KycStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  weeklyActivity: {
    labels: string[];
    deposits: number[];
    withdrawals: number[];
  };
  monthlyActivity: {
    labels: string[];
    deposits: number[];
    withdrawals: number[];
  };
  revenueSegments: Array<{ label: string; value: number; color: string }>;
  averageClientBalance: number;
  staffStats: StaffStats;
}

export function useAdminData(): AdminData {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [staffStats, setStaffStats] = useState<StaffStats>({ total: 0, active: 0, inactive: 0, roles: {}, recentlyActive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Cookie-based auth: the admin-proxy route reads admin_session_token from cookies
    // No need to manually attach the token here
    return headers;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const [usersRes, txRes, summaryRes, staffRes] = await Promise.all([
        fetch(`/api/admin-proxy/users`, { headers, credentials: "same-origin" }),
        fetch(`/api/admin-proxy/transactions?limit=10&offset=0`, { headers, credentials: "same-origin" }),
        fetch(`/api/admin-proxy/summary`, { headers, credentials: "same-origin" }).catch(() => null),
        fetch(`/api/admin-proxy/staff-admin/stats`, { headers, credentials: "same-origin" }).catch(() => null),
      ]);

      const errors: string[] = [];

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(Array.isArray(usersData.data) ? usersData.data : []);
        } else {
          errors.push(usersData.message || "Failed to load users");
        }
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success) {
          const txList = Array.isArray(txData.data) ? txData.data : [];
          const sorted = [...txList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setTransactions(sorted);
        } else {
          errors.push(txData.message || "Failed to load transactions");
        }
      }

      if (summaryRes?.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success) {
          setSummary(summaryData.data || null);
        }
      }

      if (staffRes?.ok) {
        const staffData = await staffRes.json();
        if (staffData.success) {
          setStaffStats(staffData.data || { total: 0, active: 0, inactive: 0, roles: {}, recentlyActive: 0 });
        }
      }

      if (errors.length > 0) {
        setError(errors.join("; "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      setUsers([]);
      setTransactions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kyc = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => String(u.kyc_status).toUpperCase() === "PENDING").length;
    const approved = users.filter((u) => String(u.kyc_status).toUpperCase() === "APPROVED").length;
    return { total, pending, approved };
  }, [users]);

  const weeklyActivity = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dep = new Array(7).fill(0);
    const wit = new Array(7).fill(0);

    const now = new Date();
    const dayIndex = now.getDay();
    const diff = (dayIndex - 1 + 7) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.created_at);
      if (txDate >= weekStart && txDate < weekEnd) {
        const deltaDays = Math.floor((txDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
        if (deltaDays >= 0 && deltaDays < 7) {
          const amount = Number(tx.amount) || 0;
          const t = String(tx.type || "").toUpperCase();
          if (t === "WITHDRAWAL") wit[deltaDays] += amount;
          if (t === "DEPOSIT") dep[deltaDays] += amount;
        }
      }
    });

    return { labels, deposits: dep, withdrawals: wit };
  }, [transactions]);

  const monthlyActivity = useMemo(() => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }).map((_, idx) =>
      new Date(year, idx, 1).toLocaleDateString(undefined, { month: "short" })
    );
    const dep = new Array(12).fill(0);
    const wit = new Array(12).fill(0);

    transactions.forEach((tx) => {
      const d = new Date(tx.created_at);
      if (d.getFullYear() === year) {
        const m = d.getMonth();
        const amount = Number(tx.amount) || 0;
        const t = String(tx.type || "").toUpperCase();
        if (t === "WITHDRAWAL") wit[m] += amount;
        if (t === "DEPOSIT") dep[m] += amount;
      }
    });

    return { labels: months, deposits: dep, withdrawals: wit };
  }, [transactions]);

  const revenueSegments = useMemo(
    () => (summary?.revenueBreakdownThisMonth || []).filter((item) => item.amount > 0).map((item) => ({ label: item.label, value: item.amount, color: item.color })),
    [summary]
  );

  const averageClientBalance = useMemo(() => {
    const totalUsers = kyc.total || 0;
    if (totalUsers <= 0) return 0;
    return (summary?.totalClientBalance || 0) / totalUsers;
  }, [kyc.total, summary]);

  return {
    users,
    transactions,
    summary,
    kyc,
    loading,
    error,
    refresh: fetchData,
    weeklyActivity,
    monthlyActivity,
    revenueSegments,
    averageClientBalance,
    staffStats,
  };
}

export function formatMoney(value: number, currency = "GHS") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function extractUser(tx: Transaction) {
  const wallets = tx.wallets;
  const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
  const users = wallet?.users;
  const user = Array.isArray(users) ? users[0] : users;
  return {
    fullName: String(user?.full_name || "Unknown"),
    phone: String(user?.phone_number || ""),
  };
}