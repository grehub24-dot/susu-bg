"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Receipt, Users, Calendar, Clock, CheckCircle2, Download, Printer, Share2 } from "lucide-react";
import { Skeleton } from "@/components/admin/LoadingSpinner";

type PayoutData = {
  id: string;
  amount: number;
  payout_date: string;
  status: string;
  membership: {
    membership_number: string;
    users: {
      full_name: string;
      phone_number: string;
    };
  };
  group: {
    group_name: string;
    group_code: string;
    target_group: string;
  };
  cycle: {
    cycle_number: number;
    start_date: string;
    end_date: string;
  };
  contributions: number;
  contributions_count: number;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function PayoutReceiptContent() {
  const searchParams = useSearchParams();
  const payoutId = searchParams.get("payoutId");
  const membershipId = searchParams.get("membershipId");
  const [payout, setPayout] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (payoutId || membershipId) {
      void loadPayout();
    }
  }, [payoutId, membershipId]);

  const loadPayout = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (payoutId) params.set("payoutId", payoutId);
      if (membershipId) params.set("membershipId", membershipId);

      const res = await fetch(`/api/admin-proxy/susu-payouts?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data?.length > 0) {
        setPayout(data.data[0]);
      } else {
        setError("Payout not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!payout) return;
    const content = generateReceiptText();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `susu-payout-${payoutId || "receipt"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    if (!payout) return "";
    return `
=====================================
         SUSU-BG PAYOUT RECEIPT
=====================================

Receipt No: ${payoutId || payout.id}
Date: ${new Date(payout.payout_date).toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

MEMBER INFORMATION
------------------
Name: ${payout.membership.users.full_name}
Phone: ${payout.membership.users.phone_number}
Membership No: ${payout.membership.membership_number}

GROUP DETAILS
-------------
Group Name: ${payout.group.group_name}
Group Code: ${payout.group.group_code}
Cycle: ${payout.cycle.cycle_number}
Period: ${new Date(payout.cycle.start_date).toLocaleDateString()} - ${new Date(payout.cycle.end_date).toLocaleDateString()}

PAYOUT SUMMARY
--------------
Total Contributions: GHS ${payout.contributions.toFixed(2)}
No. of Contributions: ${payout.contributions_count}
Net Payout Amount: GHS ${payout.amount.toFixed(2)}

=====================================
    Thank you for saving with us!
=====================================
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-lg">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !payout) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-rose-600 dark:text-rose-400">{error || "Payout not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-lg p-6">
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-lg dark:shadow-slate-900/50 print:shadow-none print:border-none"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Receipt size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Payout Receipt</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Susu-BG Rotating Savings</p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Payment Successful</span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Receipt Number
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {payoutId || payout.id}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-600 dark:text-emerald-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Member
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {payout.membership.users.full_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {payout.membership.users.phone_number} • {payout.membership.membership_number}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Group
                  </div>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    {payout.group.group_name}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cycle
                  </div>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    #{payout.cycle.cycle_number}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Calendar size={12} />
                    Payout Date
                  </div>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    {new Date(payout.payout_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Clock size={12} />
                    Contributions
                  </div>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    {payout.contributions_count} days
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Total Contributions</span>
                    <span className="text-slate-900 dark:text-slate-100">
                      GHS {payout.contributions.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Service Fee</span>
                    <span className="text-slate-900 dark:text-slate-100">GHS 0.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">E-Levy</span>
                    <span className="text-slate-900 dark:text-slate-100">GHS 0.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Net Payout</span>
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      GHS {payout.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cycle Period
                </div>
                <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {new Date(payout.cycle.start_date).toLocaleDateString()} —{" "}
                  {new Date(payout.cycle.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Download size={16} />
                Save
              </button>
              <button
                onClick={() => navigator.share?.({ title: "Payout Receipt", url: window.location.href })}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thank you for saving with Susu-BG
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                questions@susu-bg.com • www.susu-bg.com
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PayoutReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-lg">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    }>
      <PayoutReceiptContent />
    </Suspense>
  );
}