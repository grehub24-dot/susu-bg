"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

type GroupDetails = {
  id: string;
  group_name?: string | null;
  target_group?: string | null;
  collector_id?: string | null;
  daily_contribution?: number | null;
  cycle_days?: number | null;
  created_at?: string | null;
};

type GroupMember = {
  id: string;
  membership_number?: string | null;
  status?: string | null;
  joined_at?: string | null;
  ghana_card_number?: string | null;
  ghana_card_type?: string | null;
  users?: {
    id: string;
    full_name?: string | null;
    phone_number?: string | null;
    email?: string | null;
    kyc_status?: string | null;
  } | null;
};

type ContributionRow = {
  id: string;
  amount: number;
  payment_method?: string | null;
  contribution_date?: string | null;
  created_at: string;
  susu_memberships?: {
    membership_number?: string | null;
    users?: { full_name?: string | null; phone_number?: string | null } | null;
  } | null;
};

type LoanRow = {
  id: string;
  amount: number;
  status?: string | null;
  application_date?: string | null;
  created_at?: string | null;
  susu_memberships?: {
    membership_number?: string | null;
    users?: { full_name?: string | null; phone_number?: string | null } | null;
  } | null;
};

type PayoutRow = {
  id: string;
  amount?: number | null;
  payout_date?: string | null;
  created_at?: string | null;
  susu_memberships?: {
    membership_number?: string | null;
    users?: { full_name?: string | null; phone_number?: string | null } | null;
  } | null;
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

export default function AdminGroupDetailsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = String(params?.groupId || "");

  const adminApiBase = "/api/admin-proxy";

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [contrib, setContrib] = useState<ContributionRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contributionDate, setContributionDate] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [payoutDate, setPayoutDate] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const contributionParams = new URLSearchParams({ limit: "25", offset: "0" });
        if (contributionDate.trim()) contributionParams.set("date", contributionDate.trim());
        const loanParams = new URLSearchParams({ limit: "25", offset: "0" });
        if (loanStatus.trim()) loanParams.set("status", loanStatus.trim());
        const payoutParams = new URLSearchParams({ limit: "25", offset: "0" });
        if (payoutDate.trim()) payoutParams.set("date", payoutDate.trim());

        const [gRes, mRes, cRes, lRes, pRes] = await Promise.all([
          fetch(`${adminApiBase}/susu/groups/${encodeURIComponent(groupId)}`, { cache: "no-store" }),
          fetch(`${adminApiBase}/susu/groups/${encodeURIComponent(groupId)}/members`, { cache: "no-store" }),
          fetch(`${adminApiBase}/susu/groups/${encodeURIComponent(groupId)}/contributions?${contributionParams.toString()}`, { cache: "no-store" }),
          fetch(`${adminApiBase}/susu/groups/${encodeURIComponent(groupId)}/loans?${loanParams.toString()}`, { cache: "no-store" }),
          fetch(`${adminApiBase}/susu/groups/${encodeURIComponent(groupId)}/payouts?${payoutParams.toString()}`, { cache: "no-store" })
        ]);

        const gJson = (await gRes.json()) as { success: boolean; data?: GroupDetails; message?: string };
        const mJson = (await mRes.json()) as { success: boolean; data?: GroupMember[]; message?: string };
        const cJson = (await cRes.json()) as { success: boolean; data?: ContributionRow[]; message?: string };
        const lJson = (await lRes.json()) as { success: boolean; data?: LoanRow[]; message?: string };
        const pJson = (await pRes.json()) as { success: boolean; data?: PayoutRow[]; message?: string };

        if (!gRes.ok || !gJson.success) throw new Error(gJson.message || "Failed to load group");
        if (!mRes.ok || !mJson.success) throw new Error(mJson.message || "Failed to load members");
        if (!cRes.ok || !cJson.success) throw new Error(cJson.message || "Failed to load contributions");
        if (!lRes.ok || !lJson.success) throw new Error(lJson.message || "Failed to load loans");
        if (!pRes.ok || !pJson.success) throw new Error(pJson.message || "Failed to load payouts");

        setGroup(gJson.data || null);
        setMembers(Array.isArray(mJson.data) ? mJson.data : []);
        setContrib(Array.isArray(cJson.data) ? cJson.data : []);
        setLoans(Array.isArray(lJson.data) ? lJson.data : []);
        setPayouts(Array.isArray(pJson.data) ? pJson.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load group");
        setGroup(null);
        setMembers([]);
        setContrib([]);
        setLoans([]);
        setPayouts([]);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) void load();
  }, [adminApiBase, contributionDate, groupId, loanStatus, payoutDate]);

  const compliance = useMemo(() => {
    const total = members.length;
    const compliant = members.filter((m) => Boolean(m.ghana_card_number && m.ghana_card_type)).length;
    return { total, compliant, rate: total > 0 ? Math.round((compliant / total) * 100) : 0 };
  }, [members]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Group</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Transactions, KYC/compliance, and activity.</p>
          </div>
          <Link href="/admin_dash/groups" className="text-xs font-extrabold text-indigo-600 hover:opacity-80">
            Back to Groups
          </Link>
        </div>
        {error ? <div className="mt-4 text-sm font-semibold text-rose-500">{error}</div> : null}
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
        ) : !group ? (
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">No group loaded.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{String(group.group_name || "-")}</div>
              <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">{group.id}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contribution</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                GHS {Number(group.daily_contribution || 0).toFixed(2)}
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Cycle: {group.cycle_days ? `${group.cycle_days} days` : "-"}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Compliance</div>
              <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {compliance.compliant}/{compliance.total} ({compliance.rate}%)
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Members with Ghana card on file</div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Members (KYC/Compliance)</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Member</th>
                <th className="py-4 font-medium">Membership #</th>
                <th className="py-4 font-medium">User KYC</th>
                <th className="py-4 font-medium">Group KYC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4">
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{String(m.users?.full_name || "-")}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{String(m.users?.phone_number || "-")}</div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{String(m.membership_number || "-")}</td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(m.users?.kyc_status || "-")}</td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">
                      {m.ghana_card_number && m.ghana_card_type ? "COMPLIANT" : "MISSING"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="date"
            value={contributionDate}
            onChange={(e) => setContributionDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            aria-label="Filter contributions by date"
          />
          <select
            value={loanStatus}
            onChange={(e) => setLoanStatus(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            aria-label="Filter loans by status"
          >
            <option value="">All loan statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
          <input
            type="date"
            value={payoutDate}
            onChange={(e) => setPayoutDate(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            aria-label="Filter payouts by date"
          />
        </div>
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Contributions</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Date</th>
                <th className="py-4 font-medium">Member</th>
                <th className="py-4 font-medium">Method</th>
                <th className="py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4">
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  </td>
                </tr>
              ) : contrib.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No contributions found.
                  </td>
                </tr>
              ) : (
                contrib.map((c) => (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="py-4 text-slate-500 dark:text-slate-400">
                      {c.contribution_date ? new Date(c.contribution_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{String(c.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{String(c.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(c.payment_method || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">GHS {Number(c.amount || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Loans</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Borrower</th>
                <th className="py-4 font-medium">Status</th>
                <th className="py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-4">
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No loans found.
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{String(l.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{String(l.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-semibold">{String(l.status || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">GHS {Number(l.amount || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Payouts</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Member</th>
                <th className="py-4 font-medium">Date</th>
                <th className="py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-4">
                    <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No payouts found.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{String(p.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{String(p.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400">
                      {p.payout_date ? new Date(p.payout_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
                    </td>
                    <td className="py-4 text-right font-extrabold text-slate-900 dark:text-slate-100">GHS {Number(p.amount || 0).toFixed(2)}</td>
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