"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Landmark, QrCode, Smartphone, Link as LinkIcon, ExternalLink, ShieldCheck, Wallet, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { readPaymentMethods, type PaymentMethod as PaymentMethodType } from "@/lib/admin-settings";

type PaymentMethod = "teller" | "ghanapay" | "paystack" | "momo" | "bank";

export default function DepositPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("teller");
  const { showSuccess, showError, showInfo } = useToast();

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

  const methods = useMemo(() => {
    try {
      return readPaymentMethods().deposit;
    } catch {
      return [];
    }
  }, []);

  const enabledMethods = useMemo(() => methods.filter(m => m.enabled).map(m => m.id.toLowerCase()), [methods]);
  const defaultMethod = enabledMethods.includes('teller') ? 'teller' : enabledMethods[0] || 'teller';

  const canSubmit = useMemo(() => {
    if (!Number(amount) || Number(amount) <= 0) return false;
    if (paymentMethod === 'paystack' && email.length < 3) return false;
    const methodConfig = methods.find(m => m.id.toLowerCase() === paymentMethod);
    return methodConfig?.enabled && methodConfig?.type !== 'future';
  }, [amount, email, paymentMethod, methods]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (paymentMethod === 'teller') {
      showError("Please visit a teller for cash deposits. Go to /teller page.");
      return;
    }

    if (paymentMethod === 'ghanapay') {
      showInfo("Payment initiated. Complete payment in GhanaPay app, then visit a teller to verify.");
      return;
    }

    if (paymentMethod !== "paystack") {
      showError("This payment method is coming soon.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (!userId) {
        showError("Please login first");
        setLoading(false);
        return;
      }
      const walletRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/wallet/balance?userId=${userId}`
      );
      const walletJson = (await walletRes.json()) as {
        success: boolean;
        wallet?: { id: string };
        message?: string;
      };
      if (!walletJson.success || !walletJson.wallet?.id) {
        showError(walletJson.message || "Wallet not found");
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
        showError(data.message || "Deposit initialization failed");
        setLoading(false);
        return;
      }
      window.location.href = data.authorization_url;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Deposit failed");
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
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#A8D5BA]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="relative z-10 mb-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#2d3436] flex items-center gap-2">
              {paymentMethod === "ghanapay" && <QrCode size={20} className="text-[#A8D5BA]" />}
              {paymentMethod === "paystack" && <CreditCard size={20} className="text-[#A8D5BA]" />}
              {paymentMethod === "momo" && <Smartphone size={20} className="text-[#E8B4B8]" />}
              {paymentMethod === "bank" && <Landmark size={20} className="text-[#A8D5BA]" />}
              {paymentMethod === "ghanapay" ? "GhanaPay QR / Link" : 
               paymentMethod === "paystack" ? "Paystack Card / Bank" :
               paymentMethod === "momo" ? "Mobile Money" : "Bank Transfer / Cheque"}
            </h1>
            <Link href="/dashboard">
              <motion.div whileHover={{ x: -2 }} className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
                <ArrowLeft size={16} /> Back
              </motion.div>
            </Link>
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl flex-wrap">
              {methods.map(method => {
                const isEnabled = method.enabled && method.type !== 'future';
                const methodId = method.id.toLowerCase() as PaymentMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!isEnabled}
                    onClick={() => setPaymentMethod(methodId)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all min-w-[70px] ${paymentMethod === methodId ? 'bg-white text-[#2d3436] shadow-sm' : isEnabled ? 'text-zinc-500 hover:text-zinc-700' : 'text-zinc-300 cursor-not-allowed'} ${!isEnabled ? 'opacity-50' : ''}`}
                  >
                    {method.name}
                    {!isEnabled && method.type === 'future' && (
                      <span className="ml-1 text-[8px]">🎯</span>
                    )}
                  </button>
                );
              })}
            </div>

            {paymentMethod === "ghanapay" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-4">
                <div className="mx-auto w-52 h-52 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 flex items-center justify-center relative group overflow-hidden shadow-inner">
                  <QrCode size={80} className="text-zinc-200 group-hover:text-[#A8D5BA] transition-all duration-500 transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2d3436] mb-2">Secure Scan</span>
                    <div className="w-8 h-8 rounded-full border-2 border-[#A8D5BA] border-t-transparent animate-spin mb-3" />
                    <span className="text-[9px] font-medium text-zinc-500">Generating dynamic QR...</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#2d3436]">Scan to Pay with GhanaPay</p>
                  <p className="text-xs text-zinc-500 max-w-[200px] mx-auto leading-relaxed">
                    Open your GhanaPay app and scan the code above to complete your deposit.
                  </p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button" 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d3436]/5 text-xs font-bold text-[#2d3436] hover:bg-[#2d3436]/10 transition-all"
                  >
                    <LinkIcon size={14} /> Copy Payment Link
                  </motion.button>
                </div>
              </motion.div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {paymentMethod === "paystack" && (
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
              )}

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

              {paymentMethod === "momo" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Merchant Details</span>
                    <Smartphone size={14} className="text-[#E8B4B8]" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                      <span className="text-xs text-zinc-500 font-medium">Network</span>
                      <span className="text-xs font-bold text-[#2d3436]">MTN / Telecel / AT</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm group cursor-pointer active:scale-95 transition-transform">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Merchant No.</span>
                        <span className="text-sm font-bold text-[#2d3436]">055 123 4567</span>
                      </div>
                      <LinkIcon size={14} className="text-[#E8B4B8] group-hover:rotate-12 transition-transform" />
                    </div>
                  </div>
                  <div className="flex gap-2 p-3 bg-[#E8B4B8]/5 rounded-2xl border border-[#E8B4B8]/10">
                    <ExternalLink size={12} className="text-[#E8B4B8] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#b86d74] leading-relaxed font-medium">
                      Send funds to the merchant number and enter the <b>Transaction ID</b> in the next step to verify.
                    </p>
                  </div>
                </motion.div>
              )}

              {paymentMethod === "bank" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Settlement Account</span>
                    <Landmark size={14} className="text-[#A8D5BA]" />
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Account Name</p>
                      <p className="text-sm font-bold text-[#2d3436]">SUSU-BG FINTECH LTD</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-1">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Bank</p>
                        <p className="text-sm font-bold text-[#2d3436]">GCB Bank</p>
                      </div>
                      <div className="p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm space-y-1 group cursor-pointer active:scale-95 transition-transform">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Acc No.</p>
                        <p className="text-sm font-bold text-[#2d3436]">123456...789</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center italic">
                    Use your <b>Phone Number</b> as the reference for bank transfers.
                  </p>
                </motion.div>
              )}

              {message && (
                <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                  {message}
                </motion.p>
              )}
              
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={!canSubmit || loading}
                className={`relative z-10 w-full rounded-2xl px-4 py-4 font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 ${paymentMethod === "ghanapay" ? "bg-[#2d3436] text-white" : "bg-[#A8D5BA] text-[#2d3436] disabled:opacity-50"}`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === "ghanapay" ? "Get Payment Details" :
                  paymentMethod === "paystack" ? "Proceed to Paystack" : "Submit Request"}
              </motion.button>
            </form>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-zinc-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-[#A8D5BA]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#2d3436] tracking-tight">Secured by Susu-BG</h2>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              All transactions are encrypted. For manual payments, please allow up to 15 minutes for verification.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
