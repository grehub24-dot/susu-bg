"use client";

import Link from "next/link";
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
  const adminApiBase = "/api/admin-proxy";

  const [rows, setRows] = useState<SusuGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${adminApiBase}/susu/groups?limit=100&offset=0`, { cache: "no-store" });
        const json = (await res.json()) as { success: boolean; data?: SusuGroupRow[]; message?: string };
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load groups");
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
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Groups</h1>
        <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Susu groups overview and drilldowns.</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, target group, or ID"
              className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            />
          </div>
          <div className="text-sm">{error ? <ErrorBanner message={error} onRetry={() => window.location.reload()} /> : null}</div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
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
                  <td colSpan={5} className="py-8 text-center text-[color:var(--color-muted)]">
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
                      <div className="font-semibold text-[color:var(--color-foreground)]">
                        <Link href={`/admin/groups/${encodeURIComponent(g.id)}`} className="hover:opacity-80">
                          {g.group_name}
                        </Link>
                      </div>
                      <div className="text-xs text-[color:var(--color-muted)] font-mono">{g.id}</div>
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)] font-semibold">{String(g.target_group || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">GHS {Number(g.daily_contribution || 0).toFixed(2)}</td>
                    <td className="py-4 text-right text-[color:var(--color-muted)] font-semibold">{g.cycle_days ? `${g.cycle_days}d` : "-"}</td>
                    <td className="py-4 text-[color:var(--color-muted)]">
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
