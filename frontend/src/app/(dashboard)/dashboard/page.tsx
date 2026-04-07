"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Wallet, User, History } from "lucide-react";

type Tx = {
  id: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  status: "PENDING" | "SUCCESS" | "FAILED";
  created_at: string;
};

type WalletResponse = {
  success: boolean;
  wallet?: { id: string; balance: number; currency: string };
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

export default function DashboardPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const userRaw = localStorage.getItem("susu_user");
        if (!userRaw) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(userRaw) as { id: string };
        const walletRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/wallet/balance?userId=${user.id}`
        );
        const walletData = (await walletRes.json()) as WalletResponse;
        if (walletData.success && walletData.wallet) {
          setBalance(Number(walletData.wallet.balance));
        } else {
          setBalance(0);
        }
        const txRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/history?userId=${user.id}`
        );
        const txData = (await txRes.json()) as { success: boolean; data?: Tx[] };
        setTransactions(txData.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl space-y-6"
      >
        <motion.div variants={itemVariants} className="relative rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E8B4B8]/20 to-[#A8D5BA]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-full w-fit">
              <Wallet size={16} className="text-zinc-500" />
              <p className="text-sm font-medium text-zinc-600">Total Balance</p>
            </div>
            <Link href="/profile">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#E8B4B8]/10 text-[#2d3436] rounded-full text-sm font-medium hover:bg-[#E8B4B8]/20 transition-colors"
              >
                <User size={14} />
                Profile
              </motion.div>
            </Link>
          </div>
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-14 w-52 animate-pulse rounded-xl bg-zinc-100"
              />
            ) : (
              <motion.h1
                key="balance"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-5xl md:text-6xl font-bold tracking-tight text-[#2d3436]"
              >
                GHS {(balance ?? 0).toFixed(2)}
              </motion.h1>
            )}
          </AnimatePresence>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link href="/deposit" className="block">
              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#A8D5BA] px-4 py-4 font-semibold text-[#2d3436] shadow-sm hover:shadow-md transition-all"
              >
                <ArrowDownRight size={18} />
                Deposit
              </motion.div>
            </Link>
            <Link href="/withdraw" className="block">
              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white shadow-sm hover:shadow-md transition-all"
              >
                <ArrowUpRight size={18} />
                Withdraw
              </motion.div>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History size={20} className="text-zinc-400" />
              Recent Transactions
            </h2>
            <Link href="/transactions">
              <motion.span 
                whileHover={{ x: 2 }}
                className="text-sm font-medium text-[#2d3436] hover:text-[#A8D5BA] transition-colors"
              >
                View all &rarr;
              </motion.span>
            </Link>
          </div>
          
          <div className="space-y-4">
            {loading
              ? [1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-zinc-50" />
                ))
              : transactions.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 bg-zinc-50 rounded-2xl">
                    No transactions yet.
                  </div>
                ) : (
                  transactions.slice(0, 5).map((tx, index) => (
                    <motion.div 
                      key={tx.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01, backgroundColor: "#f8fafc" }}
                      className="flex items-center justify-between rounded-2xl border border-zinc-100 p-4 transition-colors cursor-default"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-full p-3 ${tx.type === "DEPOSIT" ? "bg-[#A8D5BA]/20 text-[#2d3436]" : "bg-[#E8B4B8]/20 text-[#2d3436]"}`}>
                          {tx.type === "DEPOSIT" ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2d3436] capitalize">{tx.type.toLowerCase()}</p>
                          <p className="text-xs font-medium text-zinc-400">{new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === "DEPOSIT" ? "text-emerald-600" : "text-[#2d3436]"}`}>
                          {tx.type === "DEPOSIT" ? "+" : "-"}GHS {Number(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs font-medium text-zinc-400 uppercase">{tx.status}</p>
                      </div>
                    </motion.div>
                  ))
                )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#E8B4B8]/10 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />
          <div className="mb-4 flex items-center justify-between relative z-10">
            <h2 className="text-xl font-semibold text-[#2d3436]">USSD Quick Access</h2>
          </div>
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border border-[#E8B4B8]/30 bg-[#FFF5F5] p-5 relative z-10 transition-shadow hover:shadow-sm"
          >
            <p className="text-sm font-medium text-zinc-600 mb-2">Dial the shortcode below to access your Susu wallet offline:</p>
            <div className="text-2xl md:text-3xl font-bold text-[#2d3436] tracking-widest my-2">*920*123#</div>
            <p className="text-xs font-medium text-zinc-500">Available for all networks. Standard USSD charges may apply.</p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
