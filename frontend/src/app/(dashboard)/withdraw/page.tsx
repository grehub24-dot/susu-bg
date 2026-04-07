"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Banknote } from "lucide-react";

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(
    () => Number(amount) > 0 && recipientCode.trim().length > 2,
    [amount, recipientCode]
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMessage("");

    try {
      const userRaw = localStorage.getItem("susu_user");
      if (!userRaw) {
        setMessage("Please login first");
        setLoading(false);
        return;
      }
      const user = JSON.parse(userRaw) as { id: string };
      const walletRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/wallet/balance?userId=${user.id}`
      );
      const walletJson = (await walletRes.json()) as {
        success: boolean;
        wallet?: { id: string };
        message?: string;
      };
      if (!walletJson.success || !walletJson.wallet?.id) {
        setMessage(walletJson.message || "Wallet not found");
        setLoading(false);
        return;
      }

      const reference = `WDL-${Date.now()}`;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: walletJson.wallet.id,
            amount: Number(amount),
            recipientCode,
            reference
          })
        }
      );
      const data = (await response.json()) as { success: boolean; message?: string };
      setMessage(data.success ? "Withdrawal initiated successfully" : data.message || "Failed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <motion.form
        variants={itemVariants}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="relative overflow-hidden w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8B4B8]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="relative z-10 mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#2d3436] flex items-center gap-2">
            <Banknote size={20} className="text-[#E8B4B8]" />
            Withdraw Funds
          </h1>
          <Link href="/dashboard">
            <motion.div whileHover={{ x: -2 }} className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
              <ArrowLeft size={16} /> Back
            </motion.div>
          </Link>
        </div>
        
        <div className="relative z-10 grid gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recipient Code</label>
              <span className="rounded-full bg-[#E8B4B8]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b86d74]">
                Required
              </span>
            </div>
            <input
              required
              minLength={3}
              value={recipientCode}
              onChange={(e) => setRecipientCode(e.target.value)}
              placeholder="e.g. RCP_xyz123"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
            />
            <p className="mt-2 text-xs text-zinc-500">Use a valid recipient code with at least 3 characters.</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount (GHS)</label>
              <span className="rounded-full bg-[#E8B4B8]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b86d74]">
                Min GHS 1.00
              </span>
            </div>
            <input
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              min={1}
              step="0.01"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all text-xl font-semibold bg-zinc-50 focus:bg-white"
            />
            <p className="mt-2 text-xs text-zinc-500">Enter an amount from GHS 1.00 and above.</p>
          </div>
        </div>
        
        {message && (
          <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 text-sm font-medium px-4 py-2 rounded-xl border ${message.includes("success") ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}>
            {message}
          </motion.p>
        )}
        
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={!canSubmit || loading}
          className="relative z-10 mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
        >
          {loading ? "Processing..." : "Submit Withdrawal"}
          {!loading && <ArrowUpRight size={18} />}
        </motion.button>
      </motion.form>
    </div>
  );
}
