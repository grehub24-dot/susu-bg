"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Users, UserCheck, Wallet, PiggyBank, 
  LogOut, Lock, CheckCircle, Briefcase, 
  BarChart3, Building2, ArrowLeft
} from "lucide-react";

interface StaffUser {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  roles: string[];
}

// Staff roles only (ADMIN excluded - goes to /admin directly)
const roles = [
  { id: 'MANAGER', name: 'Manager', icon: Building2, color: 'bg-blue-500', href: '/manager_dash', description: 'Branch Management' },
  { id: 'SUPERVISOR', name: 'Supervisor', icon: UserCheck, color: 'bg-cyan-500', href: '/supervisor_dash', description: 'Teller Oversight' },
  { id: 'TELLER', name: 'Teller', icon: Wallet, color: 'bg-green-500', href: '/teller_dash', description: 'Cash Transactions' },
  { id: 'LOAN_OFFICER', name: 'Loan Officer', icon: Briefcase, color: 'bg-amber-500', href: '/loan_officer_dash', description: 'Loan Management' },
  { id: 'SUSU_COLLECTOR', name: 'Susu Collector', icon: PiggyBank, color: 'bg-pink-500', href: '/susu_collector_dash', description: 'Group Collections' },
  { id: 'AUDITOR', name: 'Auditor', icon: BarChart3, color: 'bg-slate-500', href: '/auditor_dash', description: 'Reports & Audit' },
];

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/staff-session", { 
          credentials: "same-origin",
          method: "GET" 
        });

        if (!response.ok) {
          router.push("/staff-login");
          return;
        }

        const data = await response.json();
        
        if (!data.success || !data.authenticated) {
          router.push("/staff-login");
          return;
        }

        setUser(data.user as StaffUser);
      } catch {
        router.push("/staff-login");
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`/api/backend/api/staff/logout`, {
        method: "POST",
        credentials: "same-origin"
      });
    } catch {}
    router.push("/staff-login");
  };

  const handleRoleClick = (roleId: string, href: string) => {
    if (user?.roles?.includes(roleId)) {
      router.push(href);
    }
  };

  const goToAdmin = () => {
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--success)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <Users className="w-8 h-8 text-[var(--primary)]" />
              Staff Portal
            </h1>
            <p className="text-[var(--muted)] mt-1">
              Welcome, {user?.full_name || 'Staff Member'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin Access Button */}
            {user?.roles?.includes('ADMIN') && (
              <button
                onClick={goToAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-colors"
              >
                <Building2 size={18} />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] rounded-xl hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Your Roles</h2>
            <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-full">
              {user?.roles?.filter(r => r !== 'ADMIN').length || 0} role(s)
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Click on a highlighted role below to access that section. Grayed roles are not assigned to you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role, index) => {
            const hasAccess = user?.roles?.includes(role.id);
            const Icon = role.icon;

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleRoleClick(role.id, role.href)}
                className={`
                  relative rounded-2xl p-6 cursor-pointer transition-all
                  ${hasAccess 
                    ? 'border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:shadow-md hover:scale-[1.02]' 
                    : 'border border-[var(--border)] bg-[var(--surface)]/50 opacity-50 cursor-not-allowed'}
                `}
              >
                <div className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="font-semibold text-[var(--foreground)] mb-1">{role.name}</h3>
                <p className="text-xs text-[var(--muted)] mb-4">{role.description}</p>

                {hasAccess ? (
                  <div className="flex items-center gap-1 text-[var(--success)] text-sm font-medium">
                    <CheckCircle size={14} />
                    Access Granted
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[var(--muted)] text-sm">
                    <Lock size={14} />
                    No Access
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}