"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, Loader2, ShieldCheck, Clock } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

type Step = "credentials" | "otp";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSessionToken, setOtpSessionToken] = useState("");
  const [message, setMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setIsPageLoading(false), 500);
    const timer2 = setTimeout(() => setShowForm(true), 850);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const checkSession = async () => {
        try {
          const response = await fetch("/api/admin-auth/verify-session", {
            cache: "no-store",
            credentials: "same-origin"
          });
          if (response.ok) {
            router.replace("/admin_dash");
          }
        } catch {
          // Stay on login page
        }
      };
      checkSession();
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  const startResendCountdown = () => {
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
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login failed");
        return;
      }

      if (data.requiresOtp) {
        setOtpSessionToken(data.otpSessionToken || "");
        setMessage(data.message || "OTP sent to your phone and email");
        setStep("otp");
        startResendCountdown();
      } else {
        router.replace("/admin_dash");
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
      const response = await fetch("/api/admin-auth/verify-otp", {
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

      router.replace("/admin_dash");
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
      const response = await fetch("/api/admin-auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpSessionToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to resend OTP");
        return;
      }

      setMessage("New OTP sent to your phone and email");
      startResendCountdown();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedLoader 
        isLoading={isPageLoading} 
        title="Susu-BG"
        subtitle="Admin Portal"
        variant="admin"
      />
      
      {showForm && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            {step === "credentials" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="rounded-full bg-blue-500/20 p-4">
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-white mb-2 text-center">Admin Login</h1>
                <p className="text-slate-400 mb-8 text-center">Sign in to access the admin panel</p>

                <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email, Admin Code, or Phone
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@susu-bg.com or ADM-001"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-500">
                    Default admin: admin@susu-bg.com (ADM-001) / admin123
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl"
              >
                <button
                  onClick={() => { setStep("credentials"); setOtp(""); setError(""); setMessage(""); }}
                  className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to login
                </button>

                <div className="flex items-center justify-center mb-6">
                  <div className="rounded-full bg-green-500/20 p-4">
                    <ShieldCheck className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                
                <h1 className="text-2xl font-extrabold text-white mb-2 text-center">Verify OTP</h1>
                <p className="text-slate-400 mb-6 text-center text-sm">
                  {message || "Enter the 6-digit code sent to your phone and email"}
                </p>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white placeholder-slate-500 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-center text-2xl tracking-widest font-mono"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full rounded-xl bg-green-600 px-4 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Sign In"
                    )}
                  </button>

                  <div className="text-center">
                    {resendCountdown > 0 ? (
                      <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                        <Clock size={14} /> Resend OTP in {resendCountdown}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}