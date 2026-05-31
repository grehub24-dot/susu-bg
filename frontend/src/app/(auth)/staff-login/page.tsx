"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, Shield, ArrowRight, Loader2, ShieldCheck, ArrowLeft, Clock } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

type Step = "credentials" | "otp";

export default function StaffLoginPage() {
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setIsPageLoading(false), 500);
    const timer2 = setTimeout(() => setShowForm(true), 850);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [message, setMessage] = useState("");

  const getClientInfo = () => ({
    headers: {
      "Content-Type": "application/json"
    }
  });

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${backendUrl}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.requiresOtp) {
        setOtpSessionToken(data.otpSessionToken || "");
        setMessage(data.message || "Enter the OTP sent to your registered phone.");
        setStep("otp");
        setResendCountdown(60);
        const timer = setInterval(() => {
          setResendCountdown((c) => {
            if (c <= 1) {
              clearInterval(timer);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
        setTimeout(() => clearInterval(timer), 60000);
      } else {
        router.push("/staff");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/staff/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpSessionToken, otp })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "OTP verification failed");
        setOtp("");
        return;
      }

      router.push("/staff");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${backendUrl}/api/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success && data.requiresOtp) {
        setOtpSessionToken(data.otpSessionToken || "");
        setOtp("");
        setMessage("New OTP sent.");
        setResendCountdown(60);
        const timer = setInterval(() => {
          setResendCountdown((c) => {
            if (c <= 1) { clearInterval(timer); return 0; }
            return c - 1;
          });
        }, 1000);
        setTimeout(() => clearInterval(timer), 60000);
      } else {
        setError(data.message || "Failed to resend OTP");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Animated Loading Screen */}
      <AnimatedLoader 
        isLoading={isPageLoading} 
        title="Susu-BG"
        subtitle="Staff Portal"
        variant="staff"
      />
      
      {showForm && (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#FFF5F5] to-[#E8F4EA]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md"
      >
        {step === "credentials" ? (
          <motion.div variants={itemVariants} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#2d3436] mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#2d3436]">Staff Portal</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in with your staff credentials</p>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="text-center mb-8">
            <button
              onClick={() => { setStep("credentials"); setOtp(""); setError(""); setMessage(""); }}
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[#2d3436] mb-4 transition-colors"
            >
              <ArrowLeft size={16} /> Back to login
            </button>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#A8D5BA] mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#2d3436]">Verify OTP</h1>
            <p className="text-sm text-zinc-500 mt-1">{message || "Enter the 6-digit code sent to your phone."}</p>
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)]"
        >
          {step === "credentials" ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@susu-bg.com"
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#2d3436] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#1a1f24] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  One-Time Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 outline-none transition-all text-2xl tracking-widest text-center font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">Enter the 6-digit code sent to your phone</p>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 bg-[#2d3436] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#1a1f24] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Verify & Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="text-center">
                {resendCountdown > 0 ? (
                  <p className="text-sm text-zinc-500 flex items-center justify-center gap-1">
                    <Clock size={14} /> Resend OTP in {resendCountdown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-sm text-[#A8D5BA] hover:text-[#2d3436] transition-colors disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <a href="/login" className="text-sm text-zinc-500 hover:text-[#2d3436] transition-colors">
              Are you a customer? Login here
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
      )}
    </>
  );
}