"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Smartphone, Check, X, Clock, User, Search, RefreshCw } from "lucide-react";

interface GhanaPayVerification {
  id: string;
  reference: string;
  amount: number;
  customer_phone: string | null;
  ghanapay_number: string | null;
  status: string;
  created_at: string;
  wallets?: {
    users?: {
      full_name: string;
      phone_number: string;
    };
  };
}

export default function GhanaPayVerificationPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [verifications, setVerifications] = useState<GhanaPayVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch("/api/teller-session", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAuthenticated(true);
        }
      }
      if (!authenticated) {
        router.push("/teller");
      }
    };
    checkAuth();
  }, [router, authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    loadVerifications();
  }, [activeTab, authenticated]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "pending"
        ? `/api/backend/api/ghanapay/pending`
        : `/api/backend/api/ghanapay/history`;

      const response = await fetch(endpoint, {
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success) {
        setVerifications(data.data || []);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (requestId: string, verified: boolean) => {
    const sessionId = localStorage.getItem("teller_session_id");
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/backend/api/ghanapay/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({
          requestId,
          verified,
          notes: verified ? "Payment verified manually" : "Payment not found"
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage(verified ? "Verification approved!" : "Verification rejected");
        loadVerifications();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, [activeTab]);

  const pendingCount = verifications.filter(v => v.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#FFF5F5] p-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-[#2d3436] flex items-center gap-2">
            <Smartphone className="text-[#A8D5BA]" />
            GhanaPay Verification
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Check your GhanaPay app for incoming payments and verify below.
          </p>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              message.includes("approved") || message.includes("rejected")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </motion.div>
        )}

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              activeTab === "pending"
                ? "bg-[#2d3436] text-white"
                : "bg-white text-zinc-600"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              activeTab === "history"
                ? "bg-[#2d3436] text-white"
                : "bg-white text-zinc-600"
            }`}
          >
            History
          </button>
          <button
            onClick={loadVerifications}
            disabled={loading}
            className="ml-auto rounded-xl bg-[#A8D5BA] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className="inline mr-1" />
            Refresh
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="rounded-3xl bg-white p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#A8D5BA] border-t-transparent" />
              <p className="mt-2 text-sm text-zinc-600">Loading...</p>
            </div>
          ) : verifications.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center">
              <Clock className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-2 text-zinc-600">No {activeTab} verifications</p>
            </div>
          ) : (
            verifications.map((v) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#2d3436]">{v.reference}</p>
                    <p className="text-sm text-zinc-500">
                      {v.wallets?.users?.full_name || "Unknown Customer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      GHS {Number(v.amount).toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${
                      v.status === "PENDING" ? "text-amber-600" :
                      v.status === "VERIFIED" ? "text-green-600" : "text-red-600"
                    }`}>
                      {v.status}
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Customer Phone</p>
                    <p className="font-medium">{v.customer_phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">GhanaPay Number</p>
                    <p className="font-medium">{v.ghanapay_number || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500">Created</p>
                    <p className="font-medium">
                      {new Date(v.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {v.status === "PENDING" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(v.id, true)}
                      disabled={loading}
                      className="flex-1 rounded-xl bg-green-500 px-4 py-3 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check size={16} />
                      Verify Paid
                    </button>
                    <button
                      onClick={() => handleVerify(v.id, false)}
                      disabled={loading}
                      className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}