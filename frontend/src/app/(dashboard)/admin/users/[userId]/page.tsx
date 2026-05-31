"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

type UserDetails = {
  id: string;
  full_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  created_at?: string | null;
  kyc_status?: string | null;
  date_of_birth?: string | null;
  momo_number?: string | null;
  bank_account_number?: string | null;
  bank_sort_code?: string | null;
  bank_name?: string | null;
  card_number?: string | null;
  house_address?: string | null;
  gps_address?: string | null;
  region?: string | null;
  hometown?: string | null;
  passport_picture_url?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  wallets?: { balance?: number | null; currency?: string | null } | Array<{ balance?: number | null; currency?: string | null }> | null;
};

type UserTx = {
  id: string;
  reference: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

const asWallet = (wallets: UserDetails["wallets"]) => {
  if (!wallets) return null;
  if (Array.isArray(wallets)) return wallets[0] || null;
  return wallets;
};

export default function AdminUserDetailsPage() {
  const params = useParams<{ userId: string }>();
  const userId = String(params?.userId || "");

  const adminApiBase = "/api/admin-proxy";

  const [user, setUser] = useState<UserDetails | null>(null);
  const [tx, setTx] = useState<UserTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kycSaving, setKycSaving] = useState(false);
  const [kycMessage, setKycMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setKycMessage("");
      try {
        const [userRes, txRes] = await Promise.all([
          fetch(`${adminApiBase}/users/${encodeURIComponent(userId)}`, { cache: "no-store" }),
          fetch(`${adminApiBase}/users/${encodeURIComponent(userId)}/transactions?limit=50&offset=0`, { cache: "no-store" })
        ]);

        const userJson = (await userRes.json()) as { success: boolean; data?: UserDetails; message?: string };
        const txJson = (await txRes.json()) as { success: boolean; data?: UserTx[]; message?: string };

        if (!userRes.ok || !userJson.success) throw new Error(userJson.message || "Failed to load user");
        if (!txRes.ok || !txJson.success) throw new Error(txJson.message || "Failed to load transactions");

        setUser(userJson.data || null);
        setTx(Array.isArray(txJson.data) ? txJson.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
        setUser(null);
        setTx([]);
      } finally {
        setLoading(false);
      }
    };

    if (userId) void load();
  }, [adminApiBase, userId]);

  const approveKyc = async () => {
    if (!userId) return;
    const confirmed = window.confirm("Approve KYC for this user?");
    if (!confirmed) return;

    setKycSaving(true);
    setError("");
    setKycMessage("");
    try {
      const response = await fetch(`${adminApiBase}/kyc/${encodeURIComponent(userId)}/approve`, {
        method: "PATCH"
      });
      const data = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !data.success) {
        setError(data.message || "KYC approval failed");
        return;
      }
      setUser((prev) => (prev ? { ...prev, kyc_status: "APPROVED" } : prev));
      setKycMessage(data.message || "KYC approved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC approval failed");
    } finally {
      setKycSaving(false);
    }
  };

  const wallet = useMemo(() => asWallet(user?.wallets || null), [user]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">User</h1>
            <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">View KYC and recent transactions.</p>
          </div>
          <Link href="/admin/users" className="text-xs font-extrabold text-[color:var(--color-sage-green)] hover:opacity-80">
            Back to Users
          </Link>
        </div>

        {error ? <div className="mt-4 text-sm font-semibold text-rose-500">{error}</div> : null}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
        ) : !user ? (
          <div className="text-sm font-semibold text-[color:var(--color-muted)]">No user loaded.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Name</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{String(user.full_name || "-")}</div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">{String(user.phone_number || "-")}</div>
              <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">{String(user.email || "-")}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">KYC</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{String(user.kyc_status || "PENDING")}</div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">ID Type: {String(user.id_type || "-")}</div>
              <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">ID Number: {String(user.id_number || "-")}</div>
              {String(user.kyc_status || "").toUpperCase() !== "APPROVED" ? (
                <button
                  type="button"
                  disabled={kycSaving}
                  onClick={() => void approveKyc()}
                  className="mt-3 rounded-xl bg-[color:var(--color-sage-green)] px-3 py-2 text-xs font-extrabold text-[#2d3436] shadow-[0_12px_26px_rgba(0,0,0,0.14)] disabled:opacity-50 active:scale-[0.99] transition-transform"
                >
                  {kycSaving ? "Approving..." : "Approve KYC"}
                </button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Wallet</div>
              <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">
                {wallet ? `${String(wallet.currency || "GHS")} ${Number(wallet.balance || 0).toFixed(2)}` : "-"}
              </div>
              <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">User ID: {user.id}</div>
            </div>
          </div>
        )}
      </motion.div>
      {kycMessage ? (
        <motion.div variants={itemVariants} className="rounded-2xl bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-600">
          {kycMessage}
        </motion.div>
      ) : null}

      <motion.div
        variants={itemVariants}
        className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl"
      >
        <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Recent Transactions</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
                <th className="py-4 font-medium">Date</th>
                <th className="py-4 font-medium">Reference</th>
                <th className="py-4 font-medium">Type</th>
                <th className="py-4 font-medium text-right">Amount</th>
                <th className="py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map((x) => (
                  <tr key={x} className="border-b border-white/10">
                    <td className="py-4" colSpan={5}>
                      <div className="h-12 animate-pulse rounded-xl bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : tx.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[color:var(--color-muted)]">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                tx.map((row) => (
                  <tr key={row.id} className="border-b border-white/10">
                    <td className="py-4 text-[color:var(--color-muted)]">
                      {new Date(row.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-4 text-[color:var(--color-muted)] font-mono text-xs">{row.reference}</td>
                    <td className="py-4 text-[color:var(--color-foreground)]/85 font-semibold">{String(row.type || "").toUpperCase()}</td>
                    <td className="py-4 text-right font-extrabold text-[color:var(--color-foreground)]">GHS {Number(row.amount || 0).toFixed(2)}</td>
                    <td className="py-4 text-center text-[color:var(--color-muted)]">{String(row.status || "").toLowerCase()}</td>
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
