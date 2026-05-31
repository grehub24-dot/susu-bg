"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { TransactionSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type Tx = {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  status: "PENDING" | "SUCCESS" | "FAILED";
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

export default function TransactionsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

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
        setUserId(data.user.id as string);
        setAuthChecked(true);
      } catch {
        router.push("/login");
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/history?userId=${userId}`
        );
        const data = (await response.json()) as { success: boolean; data?: Tx[] };
        setRows(data.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (!authChecked) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl"
      >
        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#A8D5BA]/10 to-[#E8B4B8]/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#2d3436]">Transaction History</h1>
            <Link href="/dashboard">
              <motion.div whileHover={{ x: -2 }} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
                <ArrowLeft size={16} /> Back
              </motion.div>
            </Link>
          </div>
          
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider text-xs">
                  <th className="py-4 font-medium">Transaction</th>
                  <th className="py-4 font-medium">Reference</th>
                  <th className="py-4 font-medium text-right">Amount</th>
                  <th className="py-4 font-medium text-center">Status</th>
                  <th className="py-4 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                {loading
                  ? [1, 2, 3, 4, 5].map((x) => (
                      <tr key={x} className="border-b border-zinc-50">
                        <td className="py-4" colSpan={5}>
                          <TransactionSkeleton />
                        </td>
                      </tr>
                    ))
                  : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon="inbox"
                            title="No transactions yet"
                            description="Your transaction history will appear here once you make your first deposit or withdrawal."
                            action={{ label: "Make a Deposit", href: "/deposit" }}
                          />
                        </td>
                      </tr>
                    ) : rows.map((tx) => (
                      <motion.tr 
                        key={tx.id} 
                        variants={itemVariants}
                        whileHover={{ backgroundColor: "#f8fafc" }}
                        className="border-b border-zinc-50 group transition-colors"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2.5 ${tx.type === "DEPOSIT" ? "bg-[#A8D5BA]/20 text-[#2d3436]" : "bg-[#E8B4B8]/20 text-[#2d3436]"}`}>
                              {tx.type === "DEPOSIT" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div>
                              <p className="font-semibold text-[#2d3436] capitalize">{tx.type.toLowerCase()}</p>
                              <p className="text-xs text-zinc-400">{new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-zinc-500 font-mono text-xs">{tx.reference}</td>
                        <td className="py-4 text-right">
                          <span className={`font-bold ${tx.type === "DEPOSIT" ? "text-emerald-600" : "text-[#2d3436]"}`}>
                            {tx.type === "DEPOSIT" ? "+" : "-"}GHS {Number(tx.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 
                              tx.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                              'bg-amber-100 text-amber-800'}`}>
                            {tx.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.print()} 
                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-200 hover:text-[#2d3436] transition-colors"
                          >
                            <Download size={14} />
                            PDF
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
              </motion.tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
