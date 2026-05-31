"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { readAdminUiSettings } from "@/lib/admin-settings";

type HealthData = {
  ok: boolean;
  uptimeSeconds?: number;
  supabaseOk?: boolean;
  latencyMs?: number;
  timestamp?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

const card =
  "rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl";

export default function AdminSystemHealthPage() {
  const adminApiBase = "/api/admin-proxy";

  const [data, setData] = useState<HealthData | null>(null);
  const [publicHealthOk, setPublicHealthOk] = useState<boolean | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(() => readAdminUiSettings().healthRefreshSeconds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      setLoading(true);
      setError("");
      try {
        const [publicRes, adminRes] = await Promise.all([
          fetch("/api/backend-health", { cache: "no-store" }),
          fetch(`${adminApiBase}/health`, { cache: "no-store" })
        ]);
        const publicJson = (await publicRes.json()) as { ok?: boolean; message?: string };
        const adminJson = (await adminRes.json()) as { success: boolean; data?: HealthData; message?: string };
        if (cancelled) return;
        setPublicHealthOk(Boolean(publicRes.ok && publicJson?.ok));
        if (!adminRes.ok || !adminJson.success) throw new Error(adminJson.message || "Health check failed");
        setData(adminJson.data || null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Health check failed");
        setData(null);
        setPublicHealthOk(null);
      } finally {
        if (!cancelled) setLoading(false);
        inFlight = false;
      }
    };

    const onSettingsUpdate = () => {
      const latest = readAdminUiSettings().healthRefreshSeconds;
      setRefreshSeconds(latest);
    };

    window.addEventListener("susu-admin-ui-settings", onSettingsUpdate);
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, Math.max(10, refreshSeconds) * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("susu-admin-ui-settings", onSettingsUpdate);
      window.clearInterval(interval);
    };
  }, [adminApiBase, refreshSeconds]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className={card}>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin_dash" className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} className="text-[color:var(--color-foreground)]" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">System Health</h1>
        </div>
        <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Service uptime and connectivity checks.</p>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-[color:var(--color-muted)]">
            Auto refresh every {Math.max(10, refreshSeconds)}s (set in Admin Settings)
          </div>
          <button
            type="button"
            onClick={() => setRefreshSeconds(readAdminUiSettings().healthRefreshSeconds)}
            className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-extrabold text-[color:var(--color-foreground)]"
          >
            Sync Settings
          </button>
        </div>
        {error ? <div className="text-sm font-semibold text-rose-500">{error}</div> : null}

        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-white/10" />
        ) : !data ? (
          <div className="mt-4 text-sm font-semibold text-[color:var(--color-muted)]">No data.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Public /health</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {typeof publicHealthOk === "boolean" ? (publicHealthOk ? "OK" : "FAIL") : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Status</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{data.ok ? "OK" : "ERROR"}</div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Uptime</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {typeof data.uptimeSeconds === "number" ? `${Math.floor(data.uptimeSeconds)}s` : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Supabase</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {typeof data.supabaseOk === "boolean" ? (data.supabaseOk ? "OK" : "FAIL") : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Latency</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {typeof data.latencyMs === "number" ? `${data.latencyMs}ms` : "-"}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
