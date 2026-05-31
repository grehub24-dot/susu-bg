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
  "rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl";

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
            <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Group</h1>
            <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Transactions, KYC/compliance, and activity.</p>
          </div>
          <Link href="/admin/groups" className="text-xs font-extrabold text-[color:var(--color-sage-green)] hover:opacity-80">
            Back to Groups
          </Link>
        </div>
        {error ? <div className="mt-4 text-sm font-semibold text-rose-500">{error}</div> : null}
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
        ) : !group ? (
          <div className="text-sm font-semibold text-[color:var(--color-muted)]">No group loaded.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Name</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{String(group.group_name || "-")}</div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)] font-mono">{group.id}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Contribution</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                GHS {Number(group.daily_contribution || 0).toFixed(2)}
              </div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">Cycle: {group.cycle_days ? `${group.cycle_days} days` : "-"}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Compliance</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {compliance.compliant}/{compliance.total} ({compliance.rate}%)
              </div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">Members with Ghana card on file</div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Members (KYC/Compliance)</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
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
                  <td colSpan={4} className="py-8 text-center text-[color:var(--color-muted)]">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--color-foreground)]">{String(m.users?.full_name || "-")}</div>
                      <div className="text-xs text-[color:var(--color-muted)]">{String(m.users?.phone_number || "-")}</div>
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)] font-mono text-xs">{String(m.membership_number || "-")}</td>
                    <td className="py-4 text-[color:var(--color-muted)] font-semibold">{String(m.users?.kyc_status || "-")}</td>
                    <td className="py-4 text-[color:var(--color-muted)] font-semibold">
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
            className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            aria-label="Filter contributions by date"
          />
          <select
            value={loanStatus}
            onChange={(e) => setLoanStatus(e.target.value)}
            className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
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
            className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            aria-label="Filter payouts by date"
          />
        </div>
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Contributions</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
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
                  <td colSpan={4} className="py-8 text-center text-[color:var(--color-muted)]">
                    No contributions found.
                  </td>
                </tr>
              ) : (
                contrib.map((c) => (
                  <tr key={c.id} className="border-b border-white/10">
                    <td className="py-4 text-[color:var(--color-muted)]">
                      {c.contribution_date ? new Date(c.contribution_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--color-foreground)]">{String(c.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-[color:var(--color-muted)] font-mono">{String(c.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)] font-semibold">{String(c.payment_method || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">GHS {Number(c.amount || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Loans</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
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
                  <td colSpan={3} className="py-8 text-center text-[color:var(--color-muted)]">
                    No loans found.
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--color-foreground)]">{String(l.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-[color:var(--color-muted)] font-mono">{String(l.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)] font-semibold">{String(l.status || "-")}</td>
                    <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">GHS {Number(l.amount || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Payouts</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
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
                  <td colSpan={3} className="py-8 text-center text-[color:var(--color-muted)]">
                    No payouts found.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-b border-white/10">
                    <td className="py-4">
                      <div className="font-semibold text-[color:var(--color-foreground)]">{String(p.susu_memberships?.users?.full_name || "-")}</div>
                      <div className="text-xs text-[color:var(--color-muted)] font-mono">{String(p.susu_memberships?.membership_number || "-")}</div>
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)]">
                      {p.payout_date ? new Date(p.payout_date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
                    </td>
                    <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">GHS {Number(p.amount || 0).toFixed(2)}</td>
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
