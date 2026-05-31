"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, AtSign, CheckCircle2, Mail, RefreshCcw, Search, Send, X } from "lucide-react";

type EmailLog = {
  id: string;
  user_id?: string | null;
  to_email: string;
  subject?: string | null;
  body_preview?: string | null;
  email_type: string;
  status: "SENT" | "FAILED";
  message_id?: string | null;
  error_message?: string | null;
  metadata?: unknown;
  created_at: string;
  users?: { full_name?: string | null; phone_number?: string | null; email?: string | null } | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

const cardClassName =
  "rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl";

const inputClassName =
  "w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 text-sm text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30";

const subtleButtonClassName =
  "rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-[color:var(--color-foreground)]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] active:scale-[0.99] transition-transform";

const primaryButtonClassName =
  "rounded-2xl bg-[color:var(--color-foreground)] px-4 py-3 text-sm font-extrabold text-[color:var(--color-background)] shadow-[0_14px_30px_rgba(0,0,0,0.18)] active:scale-[0.99] transition-transform disabled:opacity-50";

export default function AdminMessagesPage() {
  const adminApiBase = "/api/admin-proxy";
  const [messageType, setMessageType] = useState<"individual" | "bulk">("individual");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"send" | "logs">("send");
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "SENT" | "FAILED">("");
  const [typeFilter, setTypeFilter] = useState("");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const buildLogsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter.trim()) params.set("emailType", typeFilter.trim());
    return `${adminApiBase}/email-logs?${params.toString()}`;
  }, [adminApiBase, limit, offset, search, statusFilter, typeFilter]);

  const loadLogs = useCallback(async () => {
    if (!buildLogsUrl) return;
    setLogsLoading(true);
    setLogsError("");
    try {
      const response = await fetch(buildLogsUrl, {
        cache: "no-store"
      });
      const data = (await response.json()) as { success: boolean; data?: EmailLog[]; message?: string };
      if (!response.ok || !data.success) {
        setLogsError(data.message || "Failed to load email logs");
        return;
      }
      setLogs(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Failed to load email logs");
    } finally {
      setLogsLoading(false);
    }
  }, [buildLogsUrl]);

  useEffect(() => {
    if (activeTab !== "logs") return;
    void loadLogs();
  }, [activeTab, loadLogs]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(`${adminApiBase}/messages/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messageType,
          recipient: messageType === "individual" ? recipient : undefined,
          subject,
          body
        })
      });

      const data = (await response.json()) as { success: boolean; message?: string };
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send message");
        return;
      }

      setSuccess(data.message || "Message sent successfully!");
      setRecipient("");
      setSubject("");
      setBody("");
      if (activeTab === "logs") void loadLogs();
    } catch {
      setError("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const statusPill = (status: EmailLog["status"]) => {
    if (status === "SENT") {
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20";
    }
    return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20";
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className={`${cardClassName} p-6 md:p-8`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Messaging</h1>
            <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Send emails and review delivery history.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <Mail size={14} />
              Admin Mailer
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={`${cardClassName} p-6 md:p-8`}
      >
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex w-full max-w-sm rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={`absolute inset-1 w-1/2 rounded-[1.25rem] bg-[color:var(--color-foreground)] shadow-[0_14px_30px_rgba(0,0,0,0.18)] ${
                activeTab === "send" ? "translate-x-0" : "translate-x-full"
              }`}
            />
            <button
              type="button"
              onClick={() => setActiveTab("send")}
              className={`relative z-10 flex w-1/2 items-center justify-center gap-2 rounded-[1.25rem] px-4 py-2 text-sm font-extrabold transition-colors ${
                activeTab === "send" ? "text-[color:var(--color-background)]" : "text-[color:var(--color-muted)]"
              }`}
            >
              <Send size={16} />
              Send
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`relative z-10 flex w-1/2 items-center justify-center gap-2 rounded-[1.25rem] px-4 py-2 text-sm font-extrabold transition-colors ${
                activeTab === "logs" ? "text-[color:var(--color-background)]" : "text-[color:var(--color-muted)]"
              }`}
            >
              <Search size={16} />
              Logs
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {activeTab === "logs" ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => void loadLogs()}
                className={subtleButtonClassName}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw size={16} />
                  Refresh
                </span>
              </motion.button>
            ) : null}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "send" ? (
            <motion.div key="send" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-5">
              <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-2xl bg-white/10 p-1">
                    <button
                      type="button"
                      onClick={() => setMessageType("individual")}
                      className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                        messageType === "individual"
                          ? "bg-white/20 text-[color:var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                          : "text-[color:var(--color-muted)]"
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType("bulk")}
                      className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                        messageType === "bulk"
                          ? "bg-white/20 text-[color:var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                          : "text-[color:var(--color-muted)]"
                      }`}
                    >
                      Bulk
                    </button>
                  </div>
                  <div className="ml-auto text-xs font-semibold text-[color:var(--color-muted)]">Records delivery logs automatically.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <form onSubmit={onSubmit} className="space-y-4">
                  {messageType === "individual" ? (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">Recipient (Email or Phone)</label>
                      <div className="relative">
                        <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" />
                        <input
                          required
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="Enter client email or phone"
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">Subject</label>
                    <input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Message subject"
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">Message Body</label>
                    <textarea
                      required
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={7}
                      className={inputClassName}
                    />
                  </div>

                  {(error || success) && (
                    <div className="space-y-2">
                      {error ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/20">
                          <AlertTriangle size={16} />
                          {error}
                        </div>
                      ) : null}
                      {success ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                          <CheckCircle2 size={16} />
                          {success}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <button disabled={loading} className={`w-full ${primaryButtonClassName}`}>
                    <span className="inline-flex items-center justify-center gap-2">
                      <Send size={16} />
                      {loading ? "Sending..." : messageType === "bulk" ? "Send Bulk Email" : "Send Email"}
                    </span>
                  </button>
                </form>

                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Preview</div>
                    <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[color:var(--color-muted)]">Internal template</div>
                  </div>
                  <div className="mt-4 rounded-3xl bg-white/10 p-5">
                    <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Susu-BG</div>
                    <div className="mt-4 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-5">
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                        <Mail size={14} />
                        ADMIN MESSAGE
                      </div>
                      <div className="mt-3 text-lg font-extrabold text-[color:var(--color-foreground)]">
                        {subject.trim() ? subject.trim() : "Your email subject"}
                      </div>
                      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
                        {body.trim() ? body.trim() : "Your message body will appear here."}
                      </div>
                      <div className="mt-6 text-center text-xs font-semibold text-[color:var(--color-muted)]">
                        This is an automated message from Susu-BG.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={16} />
                  <input
                    value={search}
                    onChange={(e) => {
                      setOffset(0);
                      setSearch(e.target.value);
                    }}
                    placeholder="Search by email, subject, or body"
                    className={`${inputClassName} pl-11`}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setOffset(0);
                    setStatusFilter(e.target.value as "" | "SENT" | "FAILED");
                  }}
                  className={inputClassName}
                >
                  <option value="">All statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                </select>
                <input
                  value={typeFilter}
                  onChange={(e) => {
                    setOffset(0);
                    setTypeFilter(e.target.value);
                  }}
                  placeholder="Type (e.g. LOGIN_OTP)"
                  className={inputClassName}
                />
                <select
                  value={limit}
                  onChange={(e) => {
                    setOffset(0);
                    setLimit(Number(e.target.value));
                  }}
                  className={inputClassName}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              {logsError ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/20">
                  <AlertTriangle size={16} />
                  {logsError}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
                        <th className="px-5 py-4 font-medium">Date</th>
                        <th className="px-5 py-4 font-medium">Recipient</th>
                        <th className="px-5 py-4 font-medium">Subject</th>
                        <th className="px-5 py-4 font-medium">Type</th>
                        <th className="px-5 py-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                      {logsLoading ? (
                        [1, 2, 3, 4, 5].map((x) => (
                          <tr key={x} className="border-b border-white/10">
                            <td colSpan={5} className="px-5 py-4">
                              <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
                            </td>
                          </tr>
                        ))
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-[color:var(--color-muted)]">
                            No logs found.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <motion.tr
                            key={log.id}
                            variants={itemVariants}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                            className="cursor-pointer border-b border-white/10 transition-colors"
                            onClick={() => setSelectedLog(log)}
                          >
                            <td className="px-5 py-4 whitespace-nowrap text-[color:var(--color-muted)]">{formatDate(log.created_at)}</td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-[color:var(--color-foreground)]">{log.to_email}</div>
                              {log.users?.full_name || log.users?.phone_number ? (
                                <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">
                                  {log.users?.full_name ? log.users.full_name : "Unknown user"}
                                  {log.users?.phone_number ? ` • ${log.users.phone_number}` : ""}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-[color:var(--color-foreground)]/90">
                              <div className="max-w-[320px] truncate font-semibold">{log.subject || "-"}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)] ring-1 ring-white/10">
                                {log.email_type}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusPill(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </motion.tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={offset <= 0}
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                  className={subtleButtonClassName + " disabled:opacity-50"}
                >
                  Prev
                </button>
                <div className="text-xs font-semibold text-[color:var(--color-muted)]">
                  Showing {offset + 1}–{offset + Math.max(0, logs.length)}
                </div>
                <button
                  type="button"
                  disabled={logs.length < limit}
                  onClick={() => setOffset((prev) => prev + limit)}
                  className={subtleButtonClassName + " disabled:opacity-50"}
                >
                  Next
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {selectedLog ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ y: 14, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_18px_55px_rgba(0,0,0,0.20)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div>
                  <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">Email Details</div>
                  <div className="mt-1 font-mono text-[11px] text-[color:var(--color-muted)]">{selectedLog.id}</div>
                </div>
                <button type="button" className={subtleButtonClassName} onClick={() => setSelectedLog(null)} aria-label="Close">
                  <span className="inline-flex items-center gap-2">
                    <X size={16} />
                    Close
                  </span>
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <div className="text-xs font-semibold text-[color:var(--color-muted)]">Recipient</div>
                    <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{selectedLog.to_email}</div>
                    <div className="mt-1 text-xs font-semibold text-[color:var(--color-muted)]">{selectedLog.users?.full_name || "-"}</div>
                  </div>

                  <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <div className="text-xs font-semibold text-[color:var(--color-muted)]">Status</div>
                    <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(selectedLog.status)}`}>
                      {selectedLog.status}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">{formatDate(selectedLog.created_at)}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="text-xs font-semibold text-[color:var(--color-muted)]">Subject</div>
                  <div className="mt-2 text-sm font-extrabold text-[color:var(--color-foreground)]">{selectedLog.subject || "-"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[color:var(--color-foreground)] ring-1 ring-white/10">
                      {selectedLog.email_type}
                    </div>
                    {selectedLog.message_id ? (
                      <div className="inline-flex rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] font-semibold text-[color:var(--color-foreground)] ring-1 ring-white/10">
                        {selectedLog.message_id}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="text-xs font-semibold text-[color:var(--color-muted)]">Body Preview</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]/90">
                    {selectedLog.body_preview || "-"}
                  </div>
                </div>

                {selectedLog.error_message ? (
                  <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <div className="text-xs font-extrabold text-rose-300">Error</div>
                    <div className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-rose-200">{selectedLog.error_message}</div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
