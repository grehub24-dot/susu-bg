"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Clock, DollarSign, ShieldCheck, Wallet } from "lucide-react";
import {
  applyForLoan,
  approveLoan,
  disburseLoan,
  fetchGroupLoans,
  fetchGroupMembers,
  fetchSusuGroups,
  type SusuGroup
} from "@/lib/susu-api";

type LoanRow = any;

type MemberRow = {
  id: string;
  membership_number: string;
  users?: { full_name?: string; phone_number?: string };
};

export default function SusuLoansPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [collectorId, setCollectorId] = useState<string | null>(null);
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [borrowerId, setBorrowerId] = useState<string>("");
  const [g1, setG1] = useState<string>("");
  const [g2, setG2] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [term, setTerm] = useState<string>("30");
  const [rate, setRate] = useState<string>("5");
  const [loading, setLoading] = useState(true);
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
  }, [authChecked, groupId]);
  }, []);

  const refresh = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [loanRows, memberRows] = await Promise.all([
        fetchGroupLoans(groupId),
        fetchGroupMembers(groupId)
      ]);
      setLoans(loanRows);
      setMembers(memberRows);
      if (memberRows[0]?.id && !borrowerId) setBorrowerId(memberRows[0].id);
      if (memberRows[1]?.id && !g1) setG1(memberRows[1].id);
      if (memberRows[2]?.id && !g2) setG2(memberRows[2].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [groupId]);

  const onApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectorId) {
      setMessage("Missing collector session. Please login again.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter a valid amount");
      return;
    }
    try {
      setMessage("");
      await applyForLoan({
        borrowerId,
        groupId,
        amount: parsedAmount,
        loanTermDays: Number(term),
        interestRate: Number(rate),
        guarantor1Id: g1,
        guarantor2Id: g2
      });
      setMessage("Loan application submitted.");
      setAmount("");
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || "Failed to apply");
    }
  };

  const onApprove = async (loanId: string) => {
    if (!collectorId) {
      setMessage("Missing collector session. Please login again.");
      return;
    }
    try {
      setMessage("");
      await approveLoan({ loanId, collectorId });
      setMessage("Loan approved.");
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || "Failed to approve");
    }
  };

  const onDisburse = async (loanId: string) => {
    if (!collectorId) {
      setMessage("Missing collector session. Please login again.");
      return;
    }
    try {
      setMessage("");
      await disburseLoan({ loanId, collectorId });
      setMessage("Loan disbursed.");
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || "Failed to disburse");
    }
  };

  const memberLabel = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return id;
    return `${m.users?.full_name || "Member"} • ${m.membership_number}`;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2d3436]">Loans (P2P Guarantee)</h1>
            <p className="text-sm text-zinc-600">Loans require 2 guarantors + contribution history.</p>
          </div>
          <div className="w-full md:w-[320px]">
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
        </div>
      </motion.div>

      {message ? (
        <div className={`rounded-3xl px-5 py-4 text-sm font-semibold ${message.toLowerCase().includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436]">New Loan Application</h2>
          <form onSubmit={onApply} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Borrower</label>
              <select value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.users?.full_name || "Member"} • {m.membership_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Amount (GHS)</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0.01" step="0.01" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Term (days)</label>
                <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
                  <option value="30">30</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Monthly Interest Rate (%)</label>
              <select value={rate} onChange={(e) => setRate(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
                <option value="3">3%</option>
                <option value="5">5%</option>
                <option value="7">7%</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Guarantor 1</label>
                <select value={g1} onChange={(e) => setG1(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.users?.full_name || "Member"} • {m.membership_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Guarantor 2</label>
                <select value={g2} onChange={(e) => setG2(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.users?.full_name || "Member"} • {m.membership_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full rounded-2xl bg-[#2d3436] px-4 py-3 text-sm font-extrabold text-white">
              Submit Application
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436]">Loan Applications</h2>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-50" />
            ) : loans.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">No loans yet.</div>
            ) : (
              loans.map((loan: any) => (
                <div key={loan.id} className="rounded-2xl border border-zinc-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[#2d3436]">{loan.susu_memberships?.users?.full_name || "Borrower"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{loan.status} • {loan.loan_term_days} days • {loan.interest_rate}%</div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Guarantors:
                        <div className="font-semibold text-zinc-700">{memberLabel(loan.guarantor_1_id)}</div>
                        <div className="font-semibold text-zinc-700">{memberLabel(loan.guarantor_2_id)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-[#2d3436]">GHS {Number(loan.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">Repay: GHS {Number(loan.total_repayment || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {loan.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => onApprove(loan.id)}
                        className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-extrabold text-amber-900"
                      >
                        Approve
                      </button>
                    ) : null}
                    {loan.status === "APPROVED" ? (
                      <button
                        type="button"
                        onClick={() => onDisburse(loan.id)}
                        className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-extrabold text-emerald-900"
                      >
                        Disburse
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
