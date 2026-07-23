"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPinPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizeIdentifier = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes("@")) return trimmed.toLowerCase();
    return trimmed;
  };

  const validateIdentifier = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email or phone is required";
    if (trimmed.includes("@") && !emailRegex.test(trimmed.toLowerCase())) {
      return "Enter a valid email address (e.g. name@example.com).";
    }
    return "";
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const identifierError = validateIdentifier(identifier);
    if (identifierError) {
      setError(identifierError);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/backend/api/auth/request-pin-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        identifier?: string;
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
          setError(details || data.message || "Failed to send OTP");
        } else {
          setError(data.message || "Failed to send OTP");
        }
        return;
      }

      const normalizedIdentifier = String(data.identifier || identifier).trim();
      setMessage(data.message || "OTP sent. Redirecting...");
      router.push(`/verify-otp?flow=pin-reset&identifier=${encodeURIComponent(normalizedIdentifier)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
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
          <h1 className="text-3xl font-bold tracking-tight text-[#2d3436]">Reset PIN</h1>
          <p className="mt-2 text-sm text-zinc-500 font-medium">Enter your email or phone number to receive an OTP.</p>
        </div>

        <div className="relative z-10 grid gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Email or Phone</label>
            <input
              required
              value={identifier}
              onChange={(e) => {
                setError("");
                setMessage("");
                setIdentifier(normalizeIdentifier(e.target.value));
              }}
              placeholder="e.g. 024XXXXXXX"
              autoComplete="username"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"
            />
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100"
          >
            {error}
          </motion.p>
        )}

        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100"
          >
            {message}
          </motion.p>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          className="relative z-10 mt-8 w-full rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </motion.button>

        <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
          Back to{" "}
          <Link href="/login" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors">
            Login
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
