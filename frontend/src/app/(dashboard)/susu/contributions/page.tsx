"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Coins, PlusCircle } from "lucide-react";
import {
  fetchDailyContributions,
  fetchGroupMembers,
  fetchSusuGroups,
  recordContribution,
  type SusuGroup
} from "@/lib/susu-api";

type ContributionRow = any;

type MemberRow = {
  id: string;
  membership_number: string;
  users?: { full_name?: string; phone_number?: string };
  daily_contribution: number;
};

export default function SusuContributionsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MOBILE_MONEY" | "BANK_TRANSFER">("CASH");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.success || !data.user) {
          router.push("/login");
          return;
        }
        setCollectorId(data.user.id as string);
      } catch {
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchSusuGroups();
        setGroups(list);
        if (!groupId && list[0]?.id) setGroupId(list[0].id);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [authChecked]);

  const loadRows = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await fetchDailyContributions(groupId, date);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      setLoading(true);
      try {
        const m = await fetchGroupMembers(groupId);
        setMembers(m);
        if (m[0]?.id) setSelectedMember(m[0].id);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [groupId]);

  useEffect(() => {
    void loadRows();
  }, [groupId, date]);

  const selected = useMemo(() => members.find((m) => m.id === selectedMember) || null, [members, selectedMember]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectorId) {
      setMessage("Missing collector session. Please login again.");
      return;
    }
    if (!selectedMember) {
      setMessage("Select a member");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await recordContribution({
        membershipId: selectedMember,
        amount: parsedAmount,
        paymentMethod,
        collectorId
      });
      setMessage("Contribution recorded.");
      setAmount("");
      await loadRows();
    } catch (e: any) {
      setMessage(e?.message || "Failed to record contribution");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2d3436]">Daily Contributions</h1>
            <p className="text-sm text-zinc-600">Record collections and send electronic receipts.</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-[#A8D5BA]/20 flex items-center justify-center">
            <Coins size={18} className="text-[#2d3436]" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
            >
              <option value="" disabled>
                Select group
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
            >
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436]">Record Contribution</h2>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Member</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.users?.full_name || "Unnamed"} • {m.membership_number}
                  </option>
                ))}
              </select>
              {selected ? (
                <div className="mt-2 text-xs text-zinc-500">Suggested daily: GHS {Number(selected.daily_contribution || 0).toFixed(2)}</div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Amount (GHS)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
                placeholder="10.00"
                required
              />
            </div>

            {message ? (
              <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${message.includes("recorded") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#2d3436] px-4 py-3 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <PlusCircle size={16} />
                {submitting ? "Saving..." : "Record"}
              </span>
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436]">Contributions ({date})</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-50" />
            ) : rows.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">No collections recorded.</div>
            ) : (
              rows.map((row: any) => (
                <div key={row.id} className="rounded-2xl border border-zinc-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#2d3436]">{row.susu_memberships?.users?.full_name || "Member"}</div>
                      <div className="text-xs font-semibold text-zinc-500">{row.transaction_reference || ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-700">GHS {Number(row.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">{row.payment_method}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
