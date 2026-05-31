"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Shield, Search, Eye, 
  User, Mail, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { DataTable, type Column, type SortDirection } from "@/components/admin/DataTable";
import { ErrorBanner } from "@/components/admin/ErrorBanner";

const ROLES = [
  { id: "ADMIN", name: "Admin", color: "bg-purple-500" },
  { id: "MANAGER", name: "Manager", color: "bg-blue-500" },
  { id: "SUPERVISOR", name: "Supervisor", color: "bg-cyan-500" },
  { id: "TELLER", name: "Teller", color: "bg-green-500" },
  { id: "LOAN_OFFICER", name: "Loan Officer", color: "bg-amber-500" },
  { id: "SUSU_COLLECTOR", name: "Susu Collector", color: "bg-pink-500" },
  { id: "AUDITOR", name: "Auditor", color: "bg-slate-500" },
];

type StaffMember = {
  id: string;
  staff_code: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

export default function AdminStaffViewPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    router.replace("/admin_dash/staff");
    return;
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/admin-proxy/staff-admin/staff", {
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff);
      } else {
        setError(data.message || "Failed to load staff");
      }
    } catch (err) {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? staff.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.full_name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.staff_code.toLowerCase().includes(q) ||
          item.role.toLowerCase().includes(q)
        );
      })
    : staff;

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.status === "ACTIVE").length,
    inactive: staff.filter((s) => s.status !== "ACTIVE").length,
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Staff View</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">View-only staff list for admins.</p>
          </div>
          <Link href="/admin_dash" className="text-xs font-extrabold text-indigo-600 hover:opacity-80">
            Back to Dashboard
          </Link>
        </div>
        {error && <div className="mt-4 text-sm font-semibold text-rose-500">{error}</div>}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Staff</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-500">{stats.active}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-lg backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inactive</div>
          <div className="mt-2 text-2xl font-extrabold text-rose-500">{stats.inactive}</div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl"
      >
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, email, code, or role..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                  <th className="text-left py-4 font-medium">Staff Code</th>
                  <th className="text-left py-4 font-medium">Name</th>
                  <th className="text-left py-4 font-medium">Email</th>
                  <th className="text-left py-4 font-medium">Phone</th>
                  <th className="text-left py-4 font-medium">Role</th>
                  <th className="text-left py-4 font-medium">Status</th>
                  <th className="text-left py-4 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No staff found
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-4 font-mono text-sm text-slate-900 dark:text-slate-100">{item.staff_code}</td>
                      <td className="py-4 text-slate-900 dark:text-slate-100">{item.full_name}</td>
                      <td className="py-4 text-slate-500 dark:text-slate-400">{item.email}</td>
                      <td className="py-4 text-slate-500 dark:text-slate-400">{item.phone_number || "-"}</td>
                      <td className="py-4">
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${ROLES.find(r => r.id === item.role)?.color || "bg-zinc-500"}`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="py-4">
                        {item.status === "ACTIVE" ? (
                          <span className="flex items-center gap-1 text-emerald-500 text-xs">
                            <CheckCircle size={14} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-500 text-xs">
                            <XCircle size={14} /> {item.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {item.last_login_at 
                          ? new Date(item.last_login_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                          : "Never"
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}