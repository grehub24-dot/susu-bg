"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");
  const identifier = searchParams.get("identifier") || "";
  const sessionToken = searchParams.get("sessionToken") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const endpoint = useMemo(() => {
    if (flow === "registration") return "verify-registration-otp";
    if (flow === "login") return "verify-login-otp";
    return "";
  }, [flow]);

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

    const payload =
      flow === "registration"
        ? { identifier, otp }
        : {
            sessionToken,
            otp
          };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        resetToken?: string;
        message?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.message || "OTP verification failed");
        setLoading(false);
        return;
      }

      if (flow === "registration") {
        setMessage(data.message || "Registration verified. Continue to login.");
        setLoading(false);
        router.push("/login");
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
            onChange={(event) => setOtp(event.target.value)}
            placeholder="••••••"
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
      
      <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
        Back to{" "}
        <Link href="/login" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors">
          Login
        </Link>
      </p>
    </motion.form>
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
