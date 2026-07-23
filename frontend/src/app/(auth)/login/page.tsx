"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LoginPage() {
  const router = useRouter();
  const backendUrl = "/api/backend";
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // First, let loader show for 700ms
    const timer1 = setTimeout(() => setIsPageLoading(false), 700);
    // After loader exits (0.40s animation) + buffer, show form
    const timer2 = setTimeout(() => setShowForm(true), 850);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requiresRegistrationOtp, setRequiresRegistrationOtp] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("susu_last_identifier");
      if (saved) setIdentifier(String(saved));
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    if (!identifier.trim()) return;
    try {
      localStorage.setItem("susu_last_identifier", identifier.trim());
    } catch {
      void 0;
    }
  }, [identifier]);

  const normalizeIdentifierInput = (value: string) => {
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

  const normalizePin = (value: string) => value.replace(/\D/g, "").slice(0, 6);

  const normalizedIdentifier = useMemo(() => {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) return trimmed.toLowerCase();
    return trimmed;
  }, [identifier]);

  const canResendRegistrationOtp = useMemo(() => {
    if (!requiresRegistrationOtp) return false;
    if (loading || resending) return false;
    return !validateIdentifier(normalizedIdentifier);
  }, [loading, normalizedIdentifier, requiresRegistrationOtp, resending]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missingFields: string[] = [];
    const nextFieldErrors: Record<string, boolean> = {};
    if (!identifier.trim()) {
      missingFields.push("Email or Phone");
      nextFieldErrors.identifier = true;
    }
    if (!pin.trim()) {
      missingFields.push("PIN");
      nextFieldErrors.pin = true;
    }
    if (missingFields.length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please complete: ${missingFields.join(", ")}.`);
      return;
    }

    if (!/^\d{4,6}$/.test(pin)) {
      setFieldErrors({ pin: true });
      setError("PIN must be 4 to 6 digits.");
      return;
    }

    const identifierError = validateIdentifier(identifier);
    if (identifierError) {
      setFieldErrors({ identifier: true });
      setError(identifierError);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setRequiresRegistrationOtp(false);

    try {
      if (!backendUrl) {
        setError("Missing NEXT_PUBLIC_BACKEND_URL");
        return;
      }

      const requestBody = { identifier: normalizedIdentifier, pin: normalizePin(pin) };
      const response = await fetch(
        `${backendUrl}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const bodyText = await response.text();
        setError(
          `Login failed (expected JSON). Check NEXT_PUBLIC_BACKEND_URL. Status ${response.status}. Response starts with: ${bodyText
            .slice(0, 60)
            .replace(/\s+/g, " ")}`
        );
        return;
      }

      const data = (await response.json()) as {
        success: boolean;
        requiresOtp?: boolean;
        sessionToken?: string;
        message?: string;
        issues?: Array<{ path?: string; message?: string }>;
      };
      if (!response.ok || !data.success) {
        if (response.status === 403 && String(data.message || "").toLowerCase().includes("complete registration")) {
          setRequiresRegistrationOtp(true);
          setNotice("Your account needs registration OTP verification before you can login.");
        }
        if (Array.isArray(data.issues) && data.issues.length > 0) {
          const pinIssue = data.issues.find((i) => String(i.path || "") === "pin");
          if (pinIssue) {
            setFieldErrors((prev) => ({ ...prev, pin: true }));
            setError("PIN must be 4 to 6 digits.");
          } else {
            const details = data.issues
              .map((issue) => {
                const path = String(issue.path || "").trim();
                const msg = String(issue.message || "").trim();
                return path ? `${path}: ${msg}` : msg;
              })
              .filter(Boolean)
              .join(" | ");
            setError(details || data.message || "Login failed");
          }
        } else {
          setError(data.message || "Login failed");
        }
        return;
      }
      if (!data.requiresOtp || !data.sessionToken) {
        setError("OTP verification is required");
        return;
      }
      router.push(`/verify-otp?flow=login&sessionToken=${encodeURIComponent(data.sessionToken)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const resendRegistrationOtp = async () => {
    if (!backendUrl) {
      setError("Missing NEXT_PUBLIC_BACKEND_URL");
      return;
    }
    const identifierError = validateIdentifier(normalizedIdentifier);
    if (identifierError) {
      setFieldErrors({ identifier: true });
      setError(identifierError);
      return;
    }

    setResending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${backendUrl}/api/auth/resend-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: normalizedIdentifier })
      });
      const data = (await response.json()) as { success: boolean; identifier?: string; message?: string };
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to resend OTP");
        return;
      }
      const nextIdentifier = String(data.identifier || normalizedIdentifier).trim().toLowerCase();
      router.push(`/verify-otp?flow=registration&identifier=${encodeURIComponent(nextIdentifier)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-5 md:p-8 bg-[#FFF5F5] overflow-hidden">
<AnimatedLoader
        isLoading={isPageLoading}
        title="Susu-BG"
        subtitle="Loading"
        variant="default"
      />

      {showForm && (
      <motion.form
        variants={itemVariants}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl md:p-10"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#A8D5BA]/40 to-transparent blur-2xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-tr from-[#E8B4B8]/40 to-transparent blur-2xl" />
        </div>
        
        <div className="relative z-10 mb-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm">
            <ShieldCheck size={14} className="text-[#2d3436]" />
            Secure Login
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2d3436]">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-600 font-medium">Login with your phone/email and PIN. We’ll send an OTP to confirm.</p>
        </div>
        
        <div className="relative z-10 grid gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Email or Phone</label>
            <div className={`flex items-center gap-3 rounded-2xl border bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur ${fieldErrors.identifier ? "border-red-300 focus-within:ring-2 focus-within:ring-red-500/20" : "border-white/70 focus-within:ring-2 focus-within:ring-[#A8D5BA]/30"}`}>
              <Smartphone size={16} className="text-zinc-400" />
              <input
                required
                value={identifier}
                onChange={(e) => {
                  setError("");
                  setNotice("");
                  setRequiresRegistrationOtp(false);
                  setFieldErrors((prev) => ({ ...prev, identifier: false }));
                  setIdentifier(normalizeIdentifierInput(e.target.value));
                }}
                placeholder="Email or phone"
                autoComplete="username"
                className="w-full bg-transparent outline-none text-[#2d3436] placeholder:text-zinc-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">PIN</label>
            <div className={`flex items-center gap-3 rounded-2xl border bg-white/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur ${fieldErrors.pin ? "border-red-300 focus-within:ring-2 focus-within:ring-red-500/20" : "border-white/70 focus-within:ring-2 focus-within:ring-[#A8D5BA]/30"}`}>
              <LockKeyhole size={16} className="text-zinc-400" />
              <input
                required
                value={pin}
                onChange={(e) => {
                  setError("");
                  setNotice("");
                  setRequiresRegistrationOtp(false);
                  setFieldErrors((prev) => ({ ...prev, pin: false }));
                  setPin(normalizePin(e.target.value));
                }}
                placeholder="••••"
                type={showPin ? "text" : "password"}
                autoComplete="current-password"
                inputMode="numeric"
                minLength={4}
                maxLength={6}
                title="Enter a 4 to 6 digit PIN."
                className="w-full bg-transparent outline-none text-xl tracking-widest font-semibold text-[#2d3436] placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="rounded-xl bg-white/60 p-2 text-zinc-500 shadow-sm active:scale-[0.98] transition-transform"
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-700"
          >
            {notice}
          </motion.div>
        ) : null}

        {error ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
            {error}
          </motion.p>
        ) : null}

        {requiresRegistrationOtp ? (
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              disabled={!canResendRegistrationOtp}
              onClick={() => void resendRegistrationOtp()}
              className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-[#2d3436] shadow-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
            >
              {resending ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Sending OTP...
                </span>
              ) : (
                "Send registration OTP"
              )}
            </button>
            <p className="text-xs text-zinc-500 text-center">Use the OTP sent to your phone/email to complete registration verification.</p>
          </div>
        ) : null}

        <p className="mt-4 text-center text-sm font-medium text-zinc-500">
          Forgot your PIN?{" "}
          <Link href="/forgot-pin" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors underline">
            Reset PIN
          </Link>
        </p>
        
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={loading}
          className="relative z-10 mt-8 w-full rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-[0_14px_30px_rgba(45,52,54,0.25)] active:scale-[0.99] transition-transform"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Logging in...
            </span>
          ) : (
            "Continue"
          )}
        </motion.button>
        
        <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
          New to Susu?{" "}
          <Link href="/register" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors">
            Create an account
          </Link>
        </p>

        <div className="relative z-10 mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-zinc-400">
          <Wallet size={14} className="text-zinc-400" />
          Susu-BG
        </div>

        <div className="relative z-10 mt-4 text-center text-xs">
          <Link href="/staff-login" className="text-zinc-400 hover:text-[#2d3436] transition-colors">
            Staff Login
          </Link>
        </div>
      </motion.form>
      )}
    </div>
  );
}
