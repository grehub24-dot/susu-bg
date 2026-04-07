"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Landmark, QrCode, Smartphone } from "lucide-react";

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => Number(amount) > 0 && email.length > 3, [amount, email]);

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

      const reference = `DEP-${Date.now()}`;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: walletJson.wallet.id,
            email,
            amount: Number(amount),
            reference
          })
        }
      );
      const data = (await response.json()) as {
        success: boolean;
        authorization_url?: string;
        message?: string;
      };
      if (!response.ok || !data.success || !data.authorization_url) {
        setMessage(data.message || "Deposit initialization failed");
        setLoading(false);
        return;
      }
      window.location.href = data.authorization_url;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md space-y-6"
      >
        <motion.form
          variants={itemVariants}
          onSubmit={onSubmit}
          className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#A8D5BA]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="relative z-10 mb-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#2d3436] flex items-center gap-2">
              <CreditCard size={20} className="text-[#A8D5BA]" />
              Deposit via Paystack
            </h1>
            <Link href="/dashboard">
              <motion.div whileHover={{ x: -2 }} className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
                <ArrowLeft size={16} /> Back
              </motion.div>
            </Link>
          </div>
          
          <div className="relative z-10 grid gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email for receipt"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Amount (GHS)</label>
              <input
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                min={1}
                step="0.01"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all text-xl font-semibold bg-zinc-50 focus:bg-white"
              />
            </div>
          </div>
          
          {message && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
              {message}
            </motion.p>
          )}
          
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={!canSubmit || loading}
            className="relative z-10 mt-8 w-full rounded-2xl bg-[#A8D5BA] px-4 py-4 font-semibold text-[#2d3436] disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
          >
            {loading ? "Initializing..." : "Proceed to Paystack"}
          </motion.button>
        </motion.form>

        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-50">
          <h2 className="text-sm font-semibold mb-4 text-zinc-400 uppercase tracking-wider">Other Payment Options</h2>
          <div className="space-y-3 text-sm">
            <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3 hover:border-[#E8B4B8]/30 hover:bg-[#FFF5F5] transition-all cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-zinc-700"><Smartphone size={16} className="text-[#E8B4B8]" /> MoMo Link</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Placeholder</span>
            </motion.div>
            <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3 hover:border-[#E8B4B8]/30 hover:bg-[#FFF5F5] transition-all cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-zinc-700"><QrCode size={16} className="text-[#E8B4B8]" /> MoMo QR Code</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Placeholder</span>
            </motion.div>
            <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3 hover:border-[#A8D5BA]/30 hover:bg-emerald-50/50 transition-all cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-zinc-700"><Landmark size={16} className="text-[#A8D5BA]" /> Bank Transfer</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Placeholder</span>
            </motion.div>
            <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3 hover:border-[#A8D5BA]/30 hover:bg-emerald-50/50 transition-all cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-zinc-700"><Landmark size={16} className="text-[#A8D5BA]" /> Bank Cheque</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Placeholder</span>
            </motion.div>
            <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between rounded-2xl border border-zinc-100 p-3 hover:border-[#2d3436]/10 hover:bg-zinc-50 transition-all cursor-pointer">
              <span className="flex items-center gap-2 font-medium text-zinc-700"><QrCode size={16} className="text-[#2d3436]" /> GhanaPay QR</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">Placeholder</span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
