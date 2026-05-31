"use client";

import { Suspense, use } from "react";
import TransactionsClient from "./TransactionsClient";

type StatusFilter = "" | "PENDING" | "SUCCESS" | "FAILED";

const asString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function TransactionsFallback() {
  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl">
        <div className="h-7 w-40 rounded-xl bg-white/15" />
        <div className="mt-3 h-4 w-72 rounded-xl bg-white/10" />
      </div>
      <div className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl">
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
  const params = use(searchParams);
  const q = asString(params?.q);
  const rawStatus = asString(params?.status).toUpperCase();
  const status: StatusFilter = rawStatus === "PENDING" || rawStatus === "SUCCESS" || rawStatus === "FAILED" ? (rawStatus as StatusFilter) : "";

  return (
    <Suspense fallback={<TransactionsFallback />}>
      <TransactionsClient initialQuery={q} initialStatus={status} />
    </Suspense>
  );
}
