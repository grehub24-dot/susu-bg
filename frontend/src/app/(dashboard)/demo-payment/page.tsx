"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getBankBySortCode } from "@/lib/bank-data";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  QrCode, 
  Smartphone, 
  Landmark, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Send,
  Info,
  AlertCircle
} from "lucide-react";

type PaymentMethod = "ghanapay" | "momo" | "bank" | "card";
type TransType = "DEPOSIT" | "WITHDRAWAL";

type SessionUser = {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
};

export default function DemoPaymentPage() {
  const router = useRouter();
  const [transType, setTransType] = useState<TransType>("DEPOSIT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ghanapay");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "process" | "display" | "result">("input");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // User Input fields
  const [userPhone, setUserPhone] = useState("");
  const [userNetwork, setUserNetwork] = useState("MTN");
  const [bankReceiptNumber, setBankReceiptNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvc: "" });

  const [result, setResult] = useState<{ success: boolean; message: string; reference?: string; newBalance?: number } | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser({ 
              id: data.user.id as string, 
              full_name: data.user.full_name as string | undefined,
              email: data.user.email as string | undefined,
              phone_number: data.user.phone as string | undefined
            });
          }
        }
      } catch {
        // Continue without auth for demo
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleFinalizeTransaction = useCallback(async () => {
    if (!demoSessionId) {
      setResult({ success: false, message: "Missing verification session. Start again." });
      setStep("result");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/demo`;
      console.log(`Calling API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          amount: Number(amount),
          type: transType,
          paymentMethod,
          userPhone,
          userNetwork,
          bankReceiptNumber,
          stage: "FINALIZE",
          demoSessionId
        })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 425 && typeof data.remainingSeconds === "number") {
            setTimeLeft(Math.max(1, Number(data.remainingSeconds)));
            setStep("process");
            setLoading(false);
            return;
          }
          setResult({ success: false, message: data.message || "Failed to process transaction" });
          setStep("result");
        } else {
          setResult(data);
          setStep("result");
        }
      } else {
        const text = await response.text();
        setResult({ success: false, message: `Unexpected response: ${text.slice(0, 120)}` });
        setStep("result");
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Finalization failed" });
      setStep("result");
    } finally {
      setLoading(false);
    }
  }, [amount, bankReceiptNumber, demoSessionId, paymentMethod, transType, user?.id, userNetwork, userPhone]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && step === "process" && demoSessionId) {
      setTimeLeft(null);
      handleFinalizeTransaction();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, step, demoSessionId, handleFinalizeTransaction]);

  const canSubmit = useMemo(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !user) return false;
    
    if (step === "input") {
      if (paymentMethod === "ghanapay") return userPhone.length >= 10;
      if (paymentMethod === "momo") return userPhone.length >= 10;
      if (paymentMethod === "bank") {
        if (transType === "DEPOSIT") return userPhone.length >= 10 && bankReceiptNumber.length >= 5;
        return bankAccountNumber.length >= 10 && bankName.trim().length >= 2;
      }
      if (paymentMethod === "card") return cardDetails.number.length >= 16 && cardDetails.expiry.length >= 4;
    }
    
    if (step === "process") return false;
    
    return true;
  }, [amount, user, step, paymentMethod, userPhone, cardDetails, bankReceiptNumber, transType, bankAccountNumber, bankName]);

  const handleDemoTransaction = async () => {
    if (!canSubmit) return;
    if (!user?.id) {
      setResult({ success: false, message: "User session invalid. Please login again." });
      return;
    }

    if (step === "input") {
      // First stage: Initiated notification
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/transactions/demo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            amount: Number(amount),
            type: transType,
            paymentMethod,
            userPhone,
            userNetwork,
            bankReceiptNumber,
            stage: "INITIATE"
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          console.log(`[DEMO NOTIFICATION] SMS/Email sent: Transaction initiated for GHS ${amount}`);
          if (!data?.demoSessionId) {
            setResult({ success: false, message: "Failed to start verification session" });
            setStep("result");
            return;
          }
          setDemoSessionId(data.demoSessionId);
          // Enforce a 5-minute delay for all methods to ensure a realistic interval for demo notifications
          setTimeLeft(Number(data.waitSeconds || 300));
          setStep("process");
        } else {
          setResult({ success: false, message: data.message || "Failed to initiate" });
          setStep("result");
        }
      } catch {
        setResult({ success: false, message: "Network error during initiation" });
        setStep("result");
      } finally {
        setLoading(false);
      }
      return;
    }

    return;
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-xl space-y-6">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-[2.5rem] bg-white p-8 md:p-12 shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-zinc-100"
        >
          {/* Header */}
          <div className="relative z-10 mb-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#A8D5BA]/20 text-[#2d3436] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Sandbox Mode</span>
                <Zap size={14} className="text-[#A8D5BA] fill-[#A8D5BA]" />
              </div>
              <h1 className="text-2xl font-bold text-[#2d3436]">Demo Payment Console</h1>
            </div>
            <Link href="/dashboard">
              <motion.div whileHover={{ x: -2 }} className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-[#2d3436] transition-colors bg-zinc-50 px-4 py-2 rounded-2xl border border-zinc-100">
                <ArrowLeft size={16} /> Exit
              </motion.div>
            </Link>
          </div>

          <div className="relative z-10 space-y-8">
            {/* Transaction Type Toggle */}
            <div className="flex p-1.5 bg-zinc-100 rounded-3xl">
              <button
                onClick={() => setTransType("DEPOSIT")}
                className={`flex-1 py-3 px-4 rounded-[1.25rem] text-sm font-bold transition-all ${transType === "DEPOSIT" ? "bg-white text-[#2d3436] shadow-md" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                Deposit
              </button>
              <button
                onClick={() => setTransType("WITHDRAWAL")}
                className={`flex-1 py-3 px-4 rounded-[1.25rem] text-sm font-bold transition-all ${transType === "WITHDRAWAL" ? "bg-white text-[#2d3436] shadow-md" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                Withdrawal
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "ghanapay", label: "GhanaPay", icon: QrCode, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { id: "momo", label: "Mobile Money", icon: Smartphone, color: "bg-amber-50 text-amber-600 border-amber-100" },
                { id: "bank", label: "Bank Transfer", icon: Landmark, color: "bg-blue-50 text-blue-600 border-blue-100" },
                { id: "card", label: "Debit Card", icon: CreditCard, color: "bg-purple-50 text-purple-600 border-purple-100" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${paymentMethod === method.id ? `${method.color} scale-105 shadow-sm` : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"}`}
                >
                  <method.icon size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Step 1: User Details Input */}
            {step === "input" && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Transaction Amount</label>
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-300 group-focus-within:text-[#A8D5BA] transition-colors">GHS</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-3xl px-20 py-6 text-3xl font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] focus:bg-white transition-all placeholder:text-zinc-200"
                      />
                    </div>
                  </div>

                  {transType === "DEPOSIT" ? (
                    <>
                      {(paymentMethod === "ghanapay" || paymentMethod === "momo" || paymentMethod === "bank") && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Your Phone Number</label>
                              <input
                                type="tel"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="05XXXXXXXX"
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all"
                              />
                            </div>
                            {paymentMethod === "momo" && (
                              <div>
                                <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Network</label>
                                <select 
                                  value={userNetwork}
                                  onChange={(e) => setUserNetwork(e.target.value)}
                                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all appearance-none"
                                >
                                  <option>MTN</option>
                                  <option>Telecel</option>
                                  <option>AT</option>
                                </select>
                              </div>
                            )}
                            {paymentMethod === "bank" && (
                              <div>
                                <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Receipt / Transaction ID</label>
                                <input
                                  type="text"
                                  value={bankReceiptNumber}
                                  onChange={(e) => setBankReceiptNumber(e.target.value)}
                                  placeholder="GHSXXXXXXXXX"
                                  className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentMethod === "card" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Card Number</label>
                            <input
                              type="text"
                              value={cardDetails.number}
                              onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                              placeholder="XXXX XXXX XXXX XXXX"
                              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Expiry</label>
                              <input
                                type="text"
                                value={cardDetails.expiry}
                                onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                                placeholder="MM/YY"
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">CVC</label>
                              <input
                                type="password"
                                value={cardDetails.cvc}
                                onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                                placeholder="***"
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#A8D5BA] transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Withdrawal Specific Inputs */}
                      {(paymentMethod === "ghanapay" || paymentMethod === "momo") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Recipient Phone</label>
                            <input
                              type="tel"
                              value={userPhone}
                              onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              placeholder="05XXXXXXXX"
                              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all"
                            />
                          </div>
                          {paymentMethod === "momo" && (
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Network</label>
                              <select 
                                value={userNetwork}
                                onChange={(e) => setUserNetwork(e.target.value)}
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all appearance-none"
                              >
                                <option>MTN</option>
                                <option>Telecel</option>
                                <option>AT</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {paymentMethod === "bank" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Sort Code</label>
                              <input
                                type="text"
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
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Account Number</label>
                              <input
                                type="text"
                                value={bankAccountNumber}
                                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                                placeholder="Acc No."
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Bank Name</label>
                            <input
                              type="text"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="Bank Name"
                              className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {paymentMethod === "card" && (
                        <div>
                          <label className="block text-xs font-bold mb-2 text-zinc-400 uppercase tracking-widest">Recipient Card Number</label>
                          <input
                            type="text"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                            placeholder="XXXX XXXX XXXX XXXX"
                            className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl px-4 py-4 font-bold text-[#2d3436] outline-none focus:border-[#E8B4B8] transition-all"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    Enter your details to initiate the transaction. You will receive an &quot;Initiated&quot; SMS/Email alert.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Processing & Merchant Details */}
            {step === "process" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                {/* Timer Section */}
                <div className="text-center space-y-4">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 border-4 border-[#A8D5BA]/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-[#A8D5BA] border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#2d3436]">
                        {timeLeft !== null ? Math.floor(timeLeft / 60) : 0}:
                        {timeLeft !== null ? (timeLeft % 60).toString().padStart(2, "0") : "00"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#2d3436]">
                      {transType === "DEPOSIT" ? "Verifying Payment..." : "Processing Withdrawal..."}
                    </h3>
                    <p className="text-[10px] font-bold text-[#A8D5BA] uppercase tracking-[0.2em] animate-pulse">
                      Verification in progress
                    </p>
                  </div>
                </div>

                {/* Merchant Details (Only for Deposit) */}
                {transType === "DEPOSIT" && (
                  <div className="bg-zinc-50 rounded-[2rem] p-6 border border-zinc-100 shadow-inner">
                    {paymentMethod === "ghanapay" && (
                      <div className="space-y-4 text-center">
                        <div className="mx-auto w-40 h-40 bg-white rounded-3xl border-2 border-dashed border-[#A8D5BA] flex items-center justify-center">
                          <QrCode size={80} className="text-[#A8D5BA]" />
                        </div>
                        <p className="text-xs text-zinc-500">Scan QR with GhanaPay App</p>
                      </div>
                    )}

                    {paymentMethod === "momo" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-400 uppercase font-bold">Merchant No.</span>
                            <span className="text-md font-bold text-[#2d3436]">055 123 4567</span>
                          </div>
                          <Smartphone size={20} className="text-amber-500" />
                        </div>
                        <p className="text-center text-[10px] text-zinc-500">Send <b>GHS {amount}</b> to merchant above</p>
                      </div>
                    )}

                    {paymentMethod === "bank" && (
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold">Bank Details</span>
                          <p className="text-sm font-bold text-[#2d3436] mt-1">GCB Bank - 1234567890123</p>
                        </div>
                        <p className="text-center text-[10px] text-zinc-500">Receipt: <b>{bankReceiptNumber}</b></p>
                      </div>
                    )}

                    {paymentMethod === "card" && (
                      <div className="p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm text-center">
                        <CreditCard size={24} className="mx-auto text-[#A8D5BA] mb-2" />
                        <p className="text-xs font-bold text-[#2d3436]">Card ending in {cardDetails.number.slice(-4)}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">GHS {parseFloat(amount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Withdrawal Details */}
                {transType === "WITHDRAWAL" && (
                  <div className="bg-zinc-50 rounded-[2rem] p-6 border border-zinc-100 shadow-inner text-center">
                    <p className="text-xs text-zinc-500">Sending <b>GHS {parseFloat(amount).toFixed(2)}</b> to</p>
                    <p className="text-md font-bold text-[#2d3436] mt-1">
                      {paymentMethod === "bank" ? `${bankName} (${bankAccountNumber})` : userPhone}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-2">{paymentMethod}</p>
                  </div>
                )}

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <Info className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                    The transaction is being verified. Please stay on this page. Your balance will update automatically in 5 minutes.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Result Area */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-6 rounded-3xl border ${result.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${result.success ? "bg-emerald-200/50" : "bg-red-200/50"}`}>
                      {result.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{result.message}</p>
                      {result.success && (
                        <div className="space-y-1 mt-2">
                          <p className="text-[10px] font-medium opacity-70">REF: {result.reference}</p>
                          <p className="text-xs font-bold">New Balance: GHS {result.newBalance?.toFixed(2)}</p>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-200/50">
                            <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Send size={10} /> Alerts Sent Successfully
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Button */}
            {step !== "result" && step !== "process" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDemoTransaction}
                disabled={!canSubmit || loading}
                className="w-full bg-[#2d3436] text-white py-6 rounded-3xl font-bold text-lg shadow-xl shadow-zinc-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {step === "input" ? "Initiate Transaction" : "Finalize Transaction"}
                    <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </motion.button>
            )}

            {step === "result" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setStep("input");
                  setResult(null);
                  setAmount("");
                  setTimeLeft(null);
                  setDemoSessionId(null);
                  setUserPhone("");
                  setBankReceiptNumber("");
                }}
                className="w-full bg-[#A8D5BA] text-[#2d3436] py-6 rounded-3xl font-bold text-lg shadow-xl shadow-zinc-100 transition-all flex items-center justify-center gap-3"
              >
                Start New Transaction
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} className="text-[#A8D5BA]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2d3436]">Transaction Simulation Engine</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              This environment allows you to test real balance updates, transaction history logging, and notification systems (Wigal SMS & Email) without real fund movement.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
