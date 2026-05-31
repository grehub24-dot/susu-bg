"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { fetchSmsLogs, fetchSusuGroups, type SusuGroup } from "@/lib/susu-api";

type SmsLogRow = any;

export default function SusuSmsLogsPage() {
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<SmsLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchSusuGroups();
        setGroups(list);
        if (!groupId && list[0]?.id) setGroupId(list[0].id);
      } catch (e: any) {
        setError(e?.message || "Failed to load groups");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const reload = async () => {
    if (!groupId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchSmsLogs(groupId, startDate, endDate);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load SMS logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [groupId, startDate, endDate]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2d3436]">SMS Logs</h1>
            <p className="text-sm text-zinc-600">Compliance evidence: every receipt message should be traceable.</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-[#A8D5BA]/20 flex items-center justify-center">
            <Mail size={18} className="text-[#2d3436]" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Group</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
              <option value="" disabled>
                Select group
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">End</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]" />
          </div>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-lg font-semibold text-[#2d3436]">Messages</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-50" />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">No SMS logs found.</div>
          ) : (
            rows.map((row: any) => (
              <div key={row.id} className="rounded-2xl border border-zinc-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-[#2d3436]">{row.phone_number}</div>
                    <div className="mt-1 text-xs font-semibold text-zinc-500">{row.message_type} • {new Date(row.sent_at).toLocaleString()}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${row.delivery_status === "FAILED" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {row.delivery_status}
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
                  {row.message_content}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
