"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TellerPage() {
  const [operationType, setOperationType] = useState<"deposit" | "withdrawal">("deposit");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setReceiptUrl("");

    try {
      // Placeholder for teller operation API
      setTimeout(() => {
        setMessage(`Client ${operationType} successful!`);
        setReceiptUrl("/placeholder-receipt.pdf"); // In a real app, this would be a real URL
        setLoading(false);
      }, 1000);
    } catch {
      setMessage(`Failed to process ${operationType}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Teller Operations</h1>
          <Link href="/dashboard" className="text-sm text-[#d4af37]">
            Back to Dashboard
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setOperationType("deposit")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                operationType === "deposit"
                  ? "bg-[#2d3436] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setOperationType("withdrawal")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                operationType === "withdrawal"
                  ? "bg-[#2d3436] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Withdrawal
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Client ID / Phone Number</label>
              <input
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter client identifier"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Amount (GHS)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
              />
            </div>

            {operationType === "withdrawal" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Client PIN Authorization</label>
                <input
                  required
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter client PIN"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
                />
              </div>
            )}

            {message && <p className="text-sm font-medium text-[#a8d5ba]">{message}</p>}

            <button
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#2d3436] px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Processing..." : `Process ${operationType}`}
            </button>

            {receiptUrl && (
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-2 w-full rounded-xl bg-[#a8d5ba] px-4 py-3 font-medium text-[#2d3436]"
              >
                Print Receipt
              </button>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}