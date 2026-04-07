"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminMessagesPage() {
  const [messageType, setMessageType] = useState<"individual" | "bulk">("individual");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");

    try {
      // Placeholder for admin messaging API
      setTimeout(() => {
        setSuccess("Message sent successfully!");
        setLoading(false);
        setRecipient("");
        setSubject("");
        setBody("");
      }, 1000);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Messaging</h1>
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
              onClick={() => setMessageType("individual")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                messageType === "individual"
                  ? "bg-[#2d3436] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Individual Client
            </button>
            <button
              onClick={() => setMessageType("bulk")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                messageType === "bulk"
                  ? "bg-[#2d3436] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Bulk Message
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {messageType === "individual" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Recipient (Email or Phone)</label>
                <input
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter client email or phone"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Message Body</label>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
              />
            </div>

            {success && <p className="text-sm font-medium text-[#a8d5ba]">{success}</p>}

            <button
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#a8d5ba] px-4 py-3 font-medium text-[#2d3436] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}