"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");
  const identifier = searchParams.get("identifier") || "";
  const sessionToken = searchParams.get("sessionToken") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const normalizeOtp = (value: string) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);

  const endpoint = useMemo(() => {
    if (flow === "registration") return "verify-registration-otp";
    if (flow === "login") return "verify-login-otp";
    if (flow === "pin-reset") return "verify-pin-reset-otp";
    return "";
  }, [flow]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const onResend = async () => {
    const isRegistrationResend = flow === "registration";
    const isLoginResend = !!sessionToken && flow !== "registration" && flow !== "pin-reset";

    if (!isRegistrationResend && !isLoginResend) return;
    if (isRegistrationResend && !identifier) {
      setError("Missing identifier for OTP resend");
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setError("");
    setMessage("");

    try {
      const resendEndpoint =
        isRegistrationResend ? "resend-registration-otp" : "resend-login-otp";

      const resendPayload =
        isRegistrationResend ? { identifier } : { sessionToken };

      const response = await fetch(
        `/api/backend/api/auth/${resendEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resendPayload)
        }
      );

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const bodyText = await response.text();
        setError(
          `Resend OTP failed (expected JSON). Check NEXT_PUBLIC_BACKEND_URL. Status ${response.status}. Response starts with: ${bodyText
            .slice(0, 60)
            .replace(/\s+/g, " ")}`
        );
        return;
      }

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        issues?: Array<{ path?: string; message?: string }>;
      };

      if (!response.ok || !data.success) {
        if (Array.isArray(data.issues) && data.issues.length > 0) {
          const details = data.issues
            .map((issue) => {
              const path = String(issue.path || "").trim();
              const msg = String(issue.message || "").trim();
              return path ? `${path}: ${msg}` : msg;
            })
            .filter(Boolean)
            .join(" | ");
          setError(details || data.message || "Failed to resend OTP");
        } else {
          setError(data.message || "Failed to resend OTP");
        }
        return;
      }

      setMessage(data.message || "A new OTP has been sent");
      setResendCooldown(30);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!endpoint) {
      setError("Invalid OTP flow");
      setLoading(false);
      return;
    }

    if (flow === "login" && !sessionToken) {
      setError("Missing login session. Please go back and submit the Login form again.");
      setLoading(false);
      return;
    }

    if (flow === "pin-reset" && !identifier) {
      setError("Missing identifier. Please restart the PIN reset request.");
      setLoading(false);
      return;
    }

    const payload =
      flow === "registration"
        ? { identifier, otp }
        : flow === "login"
          ? {
              sessionToken,
              otp
            }
          : {
              identifier,
              otp
            };

    try {
      const response = await fetch(
        `/api/backend/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        resetToken?: string;
        user?: { id: string; full_name?: string; email?: string; phone_number?: string };
        message?: string;
        issues?: Array<{ path?: string; message?: string }>;
      };

      if (!response.ok || !data.success) {
        if (Array.isArray(data.issues) && data.issues.length > 0) {
          const details = data.issues
            .map((issue) => {
              const path = String(issue.path || "").trim();
              const msg = String(issue.message || "").trim();
              return path ? `${path}: ${msg}` : msg;
            })
            .filter(Boolean)
            .join(" | ");
          setError(details || data.message || "OTP verification failed");
        } else {
          setError(data.message || "OTP verification failed");
        }
        setLoading(false);
        return;
      }

      if (flow === "registration") {
        setMessage(data.message || "Registration verified. Continue to login.");
        setLoading(false);
        router.push("/login");
        return;
      }

      if (flow === "login") {
        if (!data.user?.id) {
          setError("Login session was not created");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        return;
      }

      if (!data.resetToken) {
        setError("PIN reset session was not created");
        setLoading(false);
        return;
      }

      router.push(`/reset-pin?resetToken=${encodeURIComponent(data.resetToken)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <AnimatedLoader 
        isLoading={isPageLoading} 
        title="Susu-BG"
        subtitle="Verifying"
        variant="default"
      />
    
      <motion.form
      variants={itemVariants}
      initial="hidden"
      animate="show"
      onSubmit={onSubmit}
      className="relative overflow-hidden w-full max-w-md rounded-3xl bg-white p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#A8D5BA]/20 to-[#E8B4B8]/20 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 mb-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A8D5BA]/20 text-[#A8D5BA]">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d3436]">Verify OTP</h1>
        <p className="mt-2 text-sm text-zinc-500 font-medium">
          {flow === "registration"
            ? "Enter the OTP sent to your phone to activate your account."
            : "Enter the OTP sent to your phone to continue."}
        </p>
      </div>

      <div className="relative z-10 grid gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">One-Time Password</label>
          <input
            required
            value={otp}
            onChange={(event) => {
              setError("");
              setOtp(normalizeOtp(event.target.value));
            }}
            placeholder="••••••"
            inputMode="text"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[A-Za-z0-9]{6}"
            title="Enter the 6-character OTP (letters and numbers)."
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all text-2xl tracking-widest font-semibold text-center bg-zinc-50 focus:bg-white"
          />
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
          {error}
        </motion.p>
      )}
      {message && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          {message}
        </motion.p>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={loading}
        className="relative z-10 mt-8 w-full rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </motion.button>

      {(flow === "registration" || (!!sessionToken && flow !== "pin-reset")) && (
        <p className="relative z-10 mt-4 text-center text-sm font-medium text-zinc-500">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resending || resendCooldown > 0}
            className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors underline disabled:opacity-50"
          >
            {resending
              ? "Resending..."
              : resendCooldown > 0
                ? `Resend OTP (${resendCooldown}s)`
                : "Resend OTP"}
          </button>
        </p>
      )}
      
      <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
        Back to{" "}
        <Link href="/login" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors">
          Login
        </Link>
      </p>
    </motion.form>
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <Suspense fallback={<div className="h-12 w-12 animate-spin rounded-full border-4 border-[#A8D5BA] border-t-transparent" />}>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
