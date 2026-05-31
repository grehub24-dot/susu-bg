"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Banknote, Smartphone, QrCode, Landmark, ShieldCheck, Link as LinkIcon, Info, Wallet } from "lucide-react";
import { GHANA_BANKS, getBankBySortCode } from "@/lib/bank-data";
import { useToast } from "@/components/ui/toast";
import { readPaymentMethods } from "@/lib/admin-settings";

type WithdrawMethod = "teller" | "ghanapay" | "momo" | "bank";

export default function WithdrawPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ momo_number?: string; bank_account_number?: string; bank_sort_code?: string; bank_name?: string } | null>(null);

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
        setUser(data.user as any);
      } catch {
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, [router]);

  if (!authChecked) {
    return null;
  }

  const [amount, setAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>("teller");
  
  // GhanaPay fields
  const [ghanaPayNumber, setGhanaPayNumber] = useState("");

  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");

  const [bankSortCode, setBankSortCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  useEffect(() => {
    if (user) {
      setGhanaPayNumber((prev) => prev || String(user.momo_number || ""));
      setMomoNumber((prev) => prev || String(user.momo_number || ""));
      setBankSortCode((prev) => prev || String(user.bank_sort_code || ""));
      setBankAccountNumber((prev) => prev || String(user.bank_account_number || ""));
      setBankName((prev) => prev || String(user.bank_name || ""));
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { showSuccess, showError, showInfo } = useToast();

  const withdrawMethods = useMemo(() => {
    try {
      return readPaymentMethods().withdraw;
    } catch {
      return [];
    }
  }, []);

  const enabledWithdrawMethods = useMemo(() => withdrawMethods.filter(m => m.enabled).map(m => m.id.toLowerCase()), [withdrawMethods]);

  const canSubmit = useMemo(() => {
    const amt = Number(amount);
    if (amt <= 0) return false;
    if (withdrawMethod === "teller") return true;
    return false;
  }, [amount, withdrawMethod]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    showInfo("Please visit a teller for cash withdrawals.");
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <div className="w-full max-w-md space-y-6">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
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
          
          <div className="relative z-10 space-y-6">
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl flex-wrap">
              {withdrawMethods.map(method => {
                const isEnabled = method.enabled && method.type !== 'future';
                const methodId = method.id.toLowerCase() as WithdrawMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!isEnabled}
                    onClick={() => setWithdrawMethod(methodId)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all min-w-[70px] ${withdrawMethod === methodId ? 'bg-white text-[#2d3436] shadow-sm' : isEnabled ? 'text-zinc-500 hover:text-zinc-700' : 'text-zinc-300 cursor-not-allowed'} ${!isEnabled ? 'opacity-50' : ''}`}
                  >
                    {method.name}
                    {!isEnabled && method.type === 'future' && (
                      <span className="ml-1 text-[8px]">🎯</span>
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
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
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all text-xl font-semibold bg-zinc-50 focus:bg-white"
                />
              </div>

              {withdrawMethod === "ghanapay" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">GhanaPay Number</label>
                    <input
                      required
                      value={ghanaPayNumber}
                      onChange={(e) => setGhanaPayNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 10-digit number"
                      maxLength={10}
                      className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
                    />
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-3">
                    <Info size={16} className="text-[#E8B4B8] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Withdrawals to GhanaPay are usually processed within 2-4 hours. Make sure the name matches your account.
                    </p>
                  </div>
                </motion.div>
              )}

              {withdrawMethod === "momo" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Network</label>
                      <select 
                        value={momoNetwork}
                        onChange={(e) => setMomoNetwork(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white text-sm font-medium"
                      >
                        <option>MTN</option>
                        <option>Telecel</option>
                        <option>AT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">MoMo Number</label>
                      <input
                        required
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="055..."
                        maxLength={10}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {withdrawMethod === "bank" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Sort Code</label>
                      <input
                        required
                        value={bankSortCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setBankSortCode(val);
                          if (val.length >= 2) {
                            const detected = getBankBySortCode(val);
                            if (detected) setBankName(detected);
                          }
                        }}
                        placeholder="6-digit"
                        maxLength={6}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Account No.</label>
                      <input
                        required
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="Acc No."
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Bank Name</label>
                    <input
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Bank Name"
                      className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all bg-zinc-50 focus:bg-white"
                    />
                  </div>
                </motion.div>
              )}

              {message && (
                <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`text-sm font-medium px-4 py-2 rounded-xl border ${message.includes("success") || message.includes("submitted") ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-red-600 bg-red-50 border-red-100"}`}>
                  {message}
                </motion.p>
              )}
              
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={!canSubmit || loading}
                className={`relative z-10 w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-4 font-semibold shadow-sm hover:shadow-md transition-all ${withdrawMethod === "ghanapay" ? "bg-[#2d3436] text-white" : "bg-[#E8B4B8] text-[#2d3436] disabled:opacity-50"}`}
              >
                {loading ? "Processing..." : "Initiate Withdrawal"}
                {!loading && <ArrowUpRight size={18} />}
              </motion.button>
            </form>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-[#FFF5F5] flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-[#E8B4B8]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#2d3436] tracking-tight">Withdrawal Security</h2>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Withdrawals are monitored for security. Please ensure payment details are correct to avoid delays.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
