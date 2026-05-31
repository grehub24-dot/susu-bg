"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Plus, Search, Edit2, Trash2, X, 
  User, Mail, Phone, Building2, CheckCircle, XCircle,
  MoreHorizontal, Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
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

export default function AdminStaffPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({ key: "", direction: null });
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_code: "",
    full_name: "",
    email: "",
    phone_number: "",
    role: "TELLER",
    password: ""
  });

  useEffect(() => {
    fetchStaff();
    fetchCurrentRole();
  }, []);

  const canManageStaff = ["ADMIN", "MANAGER"].includes(String(currentRole || "").toUpperCase());

  const handleSort = (key: string) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

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

  const fetchCurrentRole = async () => {
    try {
      const response = await fetch("/api/admin-auth/verify-session", {
        method: "GET",
        credentials: "same-origin"
      });

      if (!response.ok) {
        setCurrentRole("");
        return;
      }

      const data = await response.json();
      const role = String(data?.user?.role || "");
      setCurrentRole(role);
    } catch {
      setCurrentRole("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageStaff) {
      showError("View-only access");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const method = editingStaff ? "PATCH" : "POST";
      const url = editingStaff 
        ? `/api/admin-proxy/staff-admin/staff/${editingStaff.id}`
        : "/api/admin-proxy/staff-admin/staff";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showSuccess(editingStaff ? "Staff updated successfully" : "Staff created successfully");
        setShowModal(false);
        setEditingStaff(null);
        setForm({ staff_code: "", full_name: "", email: "", phone_number: "", role: "TELLER", password: "" });
        fetchStaff();
      } else {
        showError(data.message || "Failed to save");
      }
    } catch (err) {
      showError("Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageStaff) {
      showError("View-only access");
      return;
    }

    if (!confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      const response = await fetch(`/api/admin-proxy/staff-admin/staff/${id}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Staff deleted successfully");
        fetchStaff();
      } else {
        showError(data.message || "Failed to delete");
      }
    } catch (err) {
      showError("Failed to connect");
    }
  };

  const openEdit = (item: StaffMember) => {
    if (!canManageStaff) {
      showError("View-only access");
      return;
    }

    setEditingStaff(item);
    setForm({
      staff_code: item.staff_code,
      full_name: item.full_name,
      email: item.email,
      phone_number: item.phone_number || "",
      role: item.role,
      password: ""
    });
    setShowModal(true);
  };

  const filtered = staff.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.staff_code.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FFF5F5] p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-[#2d3436] flex items-center gap-2">
              <Shield className="w-8 h-8 text-[#A8D5BA]" />
              Staff Management
            </h1>
            <p className="text-zinc-500 mt-1">{staff.length} staff members</p>
          </div>
          {canManageStaff && (
            <button
              onClick={() => { setEditingStaff(null); setForm({ staff_code: "", full_name: "", email: "", phone_number: "", role: "TELLER", password: "" }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d3436] text-white rounded-xl hover:bg-[#1a1f24]"
            >
              <Plus size={18} />
              Add Staff
            </button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 outline-none"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Staff Code</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Name</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Email</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Role</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500">Status</th>
                    {canManageStaff && (
                      <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="py-3 px-2 font-mono text-sm">{item.staff_code}</td>
                      <td className="py-3 px-2">{item.full_name}</td>
                      <td className="py-3 px-2 text-zinc-500">{item.email}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${ROLES.find(r => r.id === item.role)?.color || "bg-zinc-500"}`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {item.status === "ACTIVE" ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle size={14} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs">
                            <XCircle size={14} /> {item.status}
                          </span>
                        )}
                      </td>
                      {canManageStaff && (
                        <td className="py-3 px-2 text-right">
                          <button onClick={() => openEdit(item)} className="p-2 text-zinc-400 hover:text-[#2d3436]">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center py-8 text-zinc-400">No staff found</p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2d3436]">
                  {editingStaff ? "Edit Staff" : "Add Staff"}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Staff Code</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={form.staff_code}
                      onChange={(e) => setForm({ ...form, staff_code: e.target.value })}
                      placeholder="e.g. ADM-001"
                      disabled={!!editingStaff}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none disabled:bg-zinc-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                    >
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Password {!editingStaff && "*"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingStaff ? "Leave blank to keep current" : "Enter password"}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:border-[#A8D5BA] outline-none"
                    required={!editingStaff}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-[#2d3436] text-white rounded-xl font-medium hover:bg-[#1a1f24] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingStaff ? "Update Staff" : "Add Staff"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}