"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, Camera } from "lucide-react";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read selfie image"));
    reader.readAsDataURL(file);
  });

function ResetPinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = useMemo(() => searchParams.get("resetToken") || "", [searchParams]);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (!resetToken) {
      setError("Reset token is missing");
      setLoading(false);
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setError("PIN must be 4 to 6 digits");
      setLoading(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError("PIN confirmation does not match");
      setLoading(false);
      return;
    }

    if (!selfieFile) {
      setError("Selfie image is required");
      setLoading(false);
      return;
    }

    try {
      const selfieImageDataUrl = await readFileAsDataUrl(selfieFile);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/reset-pin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resetToken,
            newPin,
            selfieImageDataUrl
          })
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        user?: { id: string; full_name: string; email?: string; phone_number: string };
        message?: string;
      };

      if (!response.ok || !data.success || !data.user) {
        setError(data.message || "PIN reset failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("susu_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "PIN reset failed");
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
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#E8B4B8]/20 to-[#A8D5BA]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 mb-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8B4B8]/20 text-[#E8B4B8]">
          <LockKeyhole size={28} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d3436]">Reset PIN</h1>
        <p className="mt-2 text-sm text-zinc-500 font-medium">
          Set a new PIN and upload your selfie to complete secure login.
        </p>
      </div>

      <div className="relative z-10 grid gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">New PIN</label>
          <input
            required
            value={newPin}
            onChange={(event) => setNewPin(event.target.value)}
            placeholder="••••"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all text-xl tracking-widest font-semibold text-center bg-zinc-50 focus:bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Confirm PIN</label>
          <input
            required
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value)}
            placeholder="••••"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#E8B4B8] focus:ring-2 focus:ring-[#E8B4B8]/20 transition-all text-xl tracking-widest font-semibold text-center bg-zinc-50 focus:bg-white"
          />
        </div>
        <div className="mt-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">
            <Camera size={14} /> Selfie Upload
          </label>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <input
              required
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setSelfieFile(event.target.files?.[0] || null)}
              className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[#E8B4B8]/20 file:text-[#2d3436] hover:file:bg-[#E8B4B8]/30 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
          {error}
        </motion.p>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={loading}
        className="relative z-10 mt-8 w-full rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
      >
        {loading ? "Updating PIN..." : "Complete Login"}
      </motion.button>
      
      <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
        Need to restart?{" "}
        <Link href="/login" className="text-[#E8B4B8] hover:text-[#2d3436] transition-colors">
          Back to Login
        </Link>
      </p>
    </motion.form>
  );
}

export default function ResetPinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <Suspense fallback={<div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E8B4B8] border-t-transparent" />}>
        <ResetPinForm />
      </Suspense>
    </div>
  );
}
