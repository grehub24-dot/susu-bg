"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TransactionsClient from "./TransactionsClient";
import TransactionMonitorClient from "./TransactionMonitorClient";

type StatusFilter = "" | "PENDING" | "SUCCESS" | "FAILED";

const asString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

type ViewMode = "history" | "monitor";

function TransactionsFallback() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl">
        <div className="h-7 w-40 rounded-xl bg-white/15" />
        <div className="mt-3 h-4 w-72 rounded-xl bg-white/10" />
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="h-12 rounded-2xl bg-white/10" />
          <div className="h-12 rounded-2xl bg-white/10" />
          <div className="h-12 rounded-2xl bg-white/10" />
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((x) => (
            <div key={x} className="h-12 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminTransactionsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Wrapper searchParams={searchParams} />
  );
}

function Wrapper({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const router = useRouter();
  const params = use(searchParams);
  const q = asString(params?.q);
  const rawStatus = asString(params?.status).toUpperCase();
  const status: StatusFilter = rawStatus === "PENDING" || rawStatus === "SUCCESS" || rawStatus === "FAILED" ? (rawStatus as StatusFilter) : "";

  const viewParam = asString(params?.view).toLowerCase();
  const view: ViewMode = viewParam === "monitor" ? "monitor" : "history";

  const [currentRole, setCurrentRole] = useState<string>("");
  const canAccessMonitor = useMemo(
    () => ["ADMIN", "MANAGER"].includes(String(currentRole || "").toUpperCase()),
    [currentRole]
  );

  useEffect(() => {
    const fetchCurrentRole = async () => {
      try {
        const response = await fetch("/api/admin-auth/verify-session", {
          method: "GET",
          credentials: "same-origin"
        });

        if (!response.ok) {
          setCurrentRole("");
          return;
        }

        const data = await response.json();
        setCurrentRole(String(data?.user?.role || ""));
      } catch {
        setCurrentRole("");
      }
    };

    fetchCurrentRole();
  }, []);

  useEffect(() => {
    if (view === "monitor" && !canAccessMonitor) {
      router.replace(`/admin_dash/transactions${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    }
  }, [view, canAccessMonitor, router, q]);

  const goHistory = () => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    router.push(`/admin_dash/transactions${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  const goMonitor = () => {
    router.push("/admin_dash/transactions?view=monitor");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goHistory}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
            view === "history"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
          }`}
        >
          History
        </button>

        {canAccessMonitor && (
          <button
            onClick={goMonitor}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
              view === "monitor"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            Monitor
          </button>
        )}
      </div>

      <Suspense fallback={<TransactionsFallback />}>
        {view === "monitor" && canAccessMonitor ? (
          <TransactionMonitorClient />
        ) : (
          <TransactionsClient initialQuery={q} initialStatus={status} />
        )}
      </Suspense>
    </div>
  );
}
