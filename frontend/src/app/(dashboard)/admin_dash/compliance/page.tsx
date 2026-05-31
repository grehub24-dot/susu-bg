"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, FileText, Download, Filter, ArrowLeft } from "lucide-react";

interface ComplianceFlag {
  id: string;
  flag_type: string;
  description: string;
  amount_involved: number;
  status: string;
  reported_to_bog: boolean;
  created_at: string;
  resolved_at: string;
  users?: {
    full_name: string;
    phone_number: string;
    risk_rating: string;
  };
}

interface ComplianceStats {
  total: number;
  open: number;
  investigating: number;
  closed: number;
  ctr: number;
  str: number;
  aml: number;
  reportedToBoG: number;
  totalAmount: number;
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
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl";

export default function AdminCompliancePage() {
  const router = useRouter();
  const [flags, setFlags] = useState<ComplianceFlag[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [role, setRole] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin-auth/verify-session", { 
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!res.ok) {
          router.push("/admin-login");
          return;
        }
        const data = await res.json();
        if (!data.success || !data.user) {
          router.push("/admin-login");
          return;
        }
        setRole(data.user.role as string || "ADMIN");
        setIsAuthorized(["ADMIN", "MANAGER", "SUPERVISOR"].includes(data.user.role as string));
      } catch {
        router.push("/admin-login");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthorized === false && role) {
      router.replace("/admin_dash");
    }
  }, [isAuthorized, role, router]);

  if (!isAuthorized && role) {
    return null;
  }

  const canManageCompliance = ["ADMIN", "MANAGER"].includes(role);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin-proxy/compliance/dashboard", { cache: "no-store" });
        const data = await response.json();

        if (data.success) {
          setFlags(Array.isArray(data.flags) ? data.flags : []);
          setStats(data.stats || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load compliance data");
        setFlags([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredFlags = filter === "ALL" 
    ? flags 
    : flags.filter(f => f.flag_type === filter);

  const handleResolve = async (flagId: string) => {
    try {
      const res = await fetch(`/api/admin-proxy/compliance/flags/${flagId}/resolve`, {
        method: "POST",
        credentials: "same-origin"
      });
      if (res.ok) {
        setFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: "CLOSED" } : f));
      }
    } catch (err) {
      setError("Failed to resolve flag");
    }
  };

  const handleReportToBoG = async (flagId: string) => {
    try {
      const res = await fetch(`/api/admin-proxy/compliance/flags/${flagId}/report`, {
        method: "POST",
        credentials: "same-origin"
      });
      if (res.ok) {
        setFlags(prev => prev.map(f => f.id === flagId ? { ...f, reported_to_bog: true } : f));
      }
    } catch (err) {
      setError("Failed to report to BoG");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-amber-100 text-amber-700";
      case "INVESTIGATING": return "bg-blue-100 text-blue-700";
      case "CLOSED": return "bg-green-100 text-green-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case "CTR": return "bg-purple-100 text-purple-700";
      case "STR": return "bg-rose-100 text-rose-700";
      case "AML_ALERT": return "bg-orange-100 text-orange-700";
      default: return "bg-zinc-100 text-zinc-700";
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin_dash" className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition-colors">
                <ArrowLeft size={18} className="text-slate-900 dark:text-slate-100" />
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Compliance Center</h1>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">AML monitoring, CTR/STR tracking, and BoG reporting</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Download className="h-4 w-4" />
            Generate Reports
          </button>
        </div>
        {error ? <div className="mt-4 text-sm font-semibold text-rose-500">{error}</div> : null}
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <AlertTriangle className="h-4 w-4" />
              Total Flags
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">GHS {stats.totalAmount.toFixed(2)} involved</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              <Clock className="h-4 w-4" />
              Open
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-600">{stats.open}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Require attention</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-purple-600">
              <FileText className="h-4 w-4" />
              CTR
            </div>
            <div className="mt-2 text-2xl font-extrabold text-purple-600">{stats.ctr}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Cash Transaction Reports</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              STR
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-600">{stats.str}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Suspicious Transactions</div>
          </div>
        </motion.div>
      )}

      {/* Flags Table */}
      <motion.div variants={itemVariants} className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 px-4 py-2 text-sm outline-none"
            >
              <option value="ALL">All Flags</option>
              <option value="CTR">CTR Only</option>
              <option value="STR">STR Only</option>
              <option value="AML_ALERT">AML Alerts Only</option>
            </select>
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {filteredFlags.length} flags
          </div>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-white/10" />
        ) : filteredFlags.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">No compliance flags found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                  <th className="py-4 font-medium">Type</th>
                  <th className="py-4 font-medium">Description</th>
                  <th className="py-4 font-medium">User</th>
                  <th className="py-4 font-medium">Amount</th>
                  <th className="py-4 font-medium">Status</th>
                  <th className="py-4 font-medium">BoG Reported</th>
                  <th className="py-4 font-medium">Date</th>
                  <th className="py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlags.map((f) => (
                  <tr key={f.id} className="border-b border-white/10">
                    <td className="py-4">
                      <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getFlagTypeColor(f.flag_type)}`}>
                        {f.flag_type}
                      </span>
                    </td>
                    <td className="py-4 max-w-xs truncate">{f.description}</td>
                    <td className="py-4">
                      <div>
                        <div className="font-semibold">{f.users?.full_name || "Unknown"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{f.users?.phone_number || ""}</div>
                      </div>
                    </td>
                    <td className="py-4 font-semibold">
                      {f.amount_involved ? `GHS ${f.amount_involved.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-4">
                      <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(f.status)}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="py-4">
                      {f.reported_to_bog ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                    </td>
                    <td className="py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-indigo-600 hover:opacity-80 text-sm font-semibold">
                          View
                        </button>
                        {canManageCompliance && f.status !== "CLOSED" && (
                          <>
                            <button 
                              className="text-amber-600 hover:opacity-80 text-sm font-semibold"
                              onClick={() => handleResolve(f.id)}
                            >
                              Resolve
                            </button>
                            {!f.reported_to_bog && (
                              <button 
                                className="text-rose-600 hover:opacity-80 text-sm font-semibold"
                                onClick={() => handleReportToBoG(f.id)}
                              >
                                Report
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
