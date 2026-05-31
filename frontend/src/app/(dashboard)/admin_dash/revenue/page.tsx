"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

type RevenueRow = {
  id: string;
  source_type?: string | null;
  category?: string | null;
  amount: number;
  currency?: string | null;
  reference?: string | null;
  note?: string | null;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

export default function AdminRevenuePage() {
  const router = useRouter();
  const adminApiBase = "/api/admin-proxy";

  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin-auth/verify-session", { 
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!res.ok) {
          router.push("/admin-login");
          return;
        }
        const data = await res.json();
        if (!data.success || !data.user) {
          router.push("/admin-login");
          return;
        }
        setRole(data.user.role as string || "ADMIN");
      } catch {
        router.push("/admin-login");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (role && !["ADMIN", "MANAGER"].includes(role)) {
      router.replace("/admin_dash");
    }
  }, [role, router]);

  const canManage = ["ADMIN", "MANAGER"].includes(role);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.category || "").toUpperCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        params.set("offset", "0");
        if (category.trim()) params.set("category", category.trim());

        const res = await fetch(`${adminApiBase}/revenue/ledger?${params.toString()}`, { cache: "no-store" });

        const json = (await res.json()) as { success: boolean; data?: RevenueRow[]; message?: string };
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load revenue ledger");
        setRows(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load revenue ledger");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [adminApiBase, category]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin_dash" className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} className="text-slate-900 dark:text-slate-100" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Audit Revenue</h1>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Revenue ledger feed (if enabled in DB).</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:max-w-xl md:grid-cols-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm">{error ? <div className="font-medium text-rose-500">{error}</div> : null}</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Date</th>
                <th className="py-4 font-medium">Category</th>
                <th className="py-4 font-medium">Reference</th>
                <th className="py-4 font-medium">Source</th>
                <th className="py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map((x) => (
                  <tr key={x} className="border-b border-white/10">
                    <td colSpan={5} className="py-4">
                      <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No revenue rows.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/10">
                    <td className="py-4 text-slate-500 dark:text-slate-400">
                      {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(r.category || "-")}</td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{String(r.reference || "-")}</td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(r.source_type || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">
                      {String(r.currency || "GHS")} {Number(r.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
