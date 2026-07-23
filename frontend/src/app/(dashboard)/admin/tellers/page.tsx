"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Edit, Trash2, DollarSign, MapPin, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

interface Teller {
  id: string;
  teller_code: string;
  full_name: string;
  branch_id: string;
  branch_name?: string;
  daily_limit: number;
  current_cash_position: number;
  status: string;
  created_at: string;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  location: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
} as const;

const card =
  "rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl";

export default function AdminTellersPage() {
  const backendUrl = "/api/backend";
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

  const [tellers, setTellers] = useState<Teller[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!backendUrl) {
        setError("Missing NEXT_PUBLIC_BACKEND_URL");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [tRes, bRes] = await Promise.all([
          fetch(`${backendUrl}/api/admin/tellers`, {
            cache: "no-store",
            headers: adminKey ? { "x-admin-key": adminKey } : undefined
          }),
          fetch(`${backendUrl}/api/admin/branches`, {
            cache: "no-store",
            headers: adminKey ? { "x-admin-key": adminKey } : undefined
          })
        ]);

        const tJson = await tRes.json();
        const bJson = await bRes.json();

        if (tJson.success) setTellers(Array.isArray(tJson.data) ? tJson.data : []);
        if (bJson.success) setBranches(Array.isArray(bJson.data) ? bJson.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setTellers([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [adminKey, backendUrl]);

  const filtered = tellers.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.teller_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Teller Management</h1>
            <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">Manage branch tellers and cash positions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[color:var(--color-sage-green)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Teller
          </button>
        </div>
        {error ? <ErrorBanner message={error} onRetry={() => window.location.reload()} className="mt-4" /> : null}
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or teller code"
              className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            />
          </div>
          <div className="text-sm font-medium text-[color:var(--color-muted)]">
            {filtered.length} of {tellers.length} tellers
          </div>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-white/10" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[color:var(--color-muted)]">No tellers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[color:var(--color-muted)] uppercase tracking-wider text-xs">
                  <th className="py-4 font-medium">Teller Code</th>
                  <th className="py-4 font-medium">Name</th>
                  <th className="py-4 font-medium">Branch</th>
                  <th className="py-4 font-medium">Daily Limit</th>
                  <th className="py-4 font-medium">Cash Position</th>
                  <th className="py-4 font-medium">Status</th>
                  <th className="py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-white/10">
                    <td className="py-4 font-mono text-xs">{t.teller_code}</td>
                    <td className="py-4 font-semibold">{t.full_name}</td>
                    <td className="py-4 text-[color:var(--color-muted)]">{t.branch_name || t.branch_id}</td>
                    <td className="py-4">GHS {t.daily_limit.toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`font-semibold ${t.current_cash_position < t.daily_limit * 0.2 ? "text-amber-500" : "text-green-500"}`}>
                        GHS {t.current_cash_position.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4">
                      {t.status === "ACTIVE" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-[color:var(--color-sage-green)] hover:opacity-80 mr-2">
                        <Edit className="h-4 w-4 inline" />
                      </button>
                      <button className="text-rose-500 hover:opacity-80">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={card}
          >
            <h2 className="text-xl font-extrabold mb-4">Add New Teller</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Full Name</label>
                <input className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Teller Code</label>
                <input className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Branch</label>
                <select className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3">
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 font-medium hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button className="flex-1 rounded-xl bg-[color:var(--color-sage-green)] px-4 py-3 font-medium text-white hover:opacity-90">
                  Add Teller
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
