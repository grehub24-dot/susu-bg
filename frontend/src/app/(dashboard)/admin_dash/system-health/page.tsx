"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl";

export default function AdminSystemHealthPage() {
  const router = useRouter();
  const adminApiBase = "/api/admin-proxy";

  const [data, setData] = useState<HealthData | null>(null);
  const [publicHealthOk, setPublicHealthOk] = useState<boolean | null>(null);
  const [refreshSeconds, setRefreshSeconds] = useState<number>(() => readAdminUiSettings().healthRefreshSeconds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

        // Safely parse public health response
        let publicJson: { ok?: boolean; message?: string } = {};
        if (publicRes.ok) {
          try { publicJson = (await publicRes.json()) as typeof publicJson; } catch { /* non-JSON */ }
        }

        // Safely parse admin health response
        if (!adminRes.ok) {
          let msg = `Health check failed (status ${adminRes.status})`;
          try {
            const errText = await adminRes.text();
            try { msg = JSON.parse(errText).message || msg; } catch { if (errText.trim()) msg = errText.trim(); }
          } catch { /* ignore */ }
          if (adminRes.status === 429) msg = "Too many requests. Please wait and try again.";
          throw new Error(msg);
        }
        const adminJson = (await adminRes.json()) as { success: boolean; data?: HealthData; message?: string };

        if (cancelled) return;
        setPublicHealthOk(Boolean(publicRes.ok && publicJson?.ok));
        if (!adminJson.success) throw new Error(adminJson.message || "Health check failed");
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
            <ArrowLeft size={18} className="text-slate-900 dark:text-slate-100" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">System Health</h1>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Service uptime and connectivity checks.</p>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Auto refresh every {Math.max(10, refreshSeconds)}s (set in Admin Settings)
          </div>
          <button
            type="button"
            onClick={() => setRefreshSeconds(readAdminUiSettings().healthRefreshSeconds)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-slate-100"
          >
            Sync Settings
          </button>
        </div>
        {error ? <div className="text-sm font-semibold text-rose-500">{error}</div> : null}

        {loading ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-white/10" />
        ) : !data ? (
          <div className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">No data.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Public /health</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {typeof publicHealthOk === "boolean" ? (publicHealthOk ? "OK" : "FAIL") : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{data.ok ? "OK" : "ERROR"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Uptime</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {typeof data.uptimeSeconds === "number" ? `${Math.floor(data.uptimeSeconds)}s` : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Supabase</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {typeof data.supabaseOk === "boolean" ? (data.supabaseOk ? "OK" : "FAIL") : "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Latency</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {typeof data.latencyMs === "number" ? `${data.latencyMs}ms` : "-"}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
