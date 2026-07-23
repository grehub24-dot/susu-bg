"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

type SusuGroupRow = {
  id: string;
  group_name: string;
  target_group: string;
  collector_id?: string | null;
  max_members?: number | null;
  daily_contribution?: number | null;
  cycle_days?: number | null;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function AdminGroupsPage() {
  const router = useRouter();
  const adminApiBase = "/api/admin-proxy";

  const [rows, setRows] = useState<SusuGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${adminApiBase}/susu/groups?limit=100&offset=0`, { cache: "no-store" });
        if (!res.ok) {
          let msg = `Failed to load groups (status ${res.status})`;
          try {
            const errText = await res.text();
            try { msg = JSON.parse(errText).message || msg; } catch { if (errText.trim()) msg = errText.trim(); }
          } catch { /* ignore */ }
          if (res.status === 429) msg = "Too many requests. Please wait and try again.";
          throw new Error(msg);
        }
        const json = (await res.json()) as { success: boolean; data?: SusuGroupRow[]; message?: string };
        if (!json.success) throw new Error(json.message || "Failed to load groups");
        setRows(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load groups");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [adminApiBase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((g) => {
      return (
        String(g.group_name || "").toLowerCase().includes(q) ||
        String(g.target_group || "").toLowerCase().includes(q) ||
        String(g.id || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Groups</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Susu groups overview and drilldowns.</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, target group, or ID"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600/30"
            />
          </div>
          <div className="text-sm">{error ? <ErrorBanner message={error} onRetry={() => window.location.reload()} /> : null}</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Group</th>
                <th className="py-4 font-medium">Target</th>
                <th className="py-4 font-medium text-right">Daily</th>
                <th className="py-4 font-medium text-right">Cycle</th>
                <th className="py-4 font-medium">Created</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {loading ? (
                [1, 2, 3, 4].map((x) => (
                  <tr key={x} className="border-b border-white/10">
                    <td colSpan={5} className="py-4">
                      <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No groups found.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <motion.tr
                    key={g.id}
                    variants={itemVariants}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                    className="border-b border-white/10 transition-colors"
                  >
                    <td className="py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        <Link href={`/admin_dash/groups/${encodeURIComponent(g.id)}`} className="hover:opacity-80">
                          {g.group_name}
                        </Link>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{g.id}</div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(g.target_group || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">GHS {Number(g.daily_contribution || 0).toFixed(2)}</td>
                    <td className="py-4 text-right text-slate-500 dark:text-slate-400 font-semibold">{g.cycle_days ? `${g.cycle_days}d` : "-"}</td>
                    <td className="py-4 text-slate-500 dark:text-slate-400">
                      {new Date(g.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </td>
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
