"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  ChevronDown, 
  LogOut, 
  Sun, 
  Moon,
  Shield,
  Building2,
  UserCheck,
  Wallet,
  Briefcase,
  PiggyBank,
  BarChart3,
  ArrowLeft
} from "lucide-react";
import { getRoleDashboardUrl } from "./RoleContext";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ROLE_ICONS: Record<string, React.ElementType> = {
  ADMIN: Shield,
  MANAGER: Building2,
  SUPERVISOR: UserCheck,
  TELLER: Wallet,
  LOAN_OFFICER: Briefcase,
  SUSU_COLLECTOR: PiggyBank,
  AUDITOR: BarChart3,
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  TELLER: "Teller",
  LOAN_OFFICER: "Loan Officer",
  SUSU_COLLECTOR: "Susu Collector",
  AUDITOR: "Auditor",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const router = useRouter();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [userData, setUserData] = useState<{full_name: string; role: string; roles: string[]} | null>(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch("/api/staff-session", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUserData({
              full_name: data.user.full_name || "Staff",
              role: data.user.role || "",
              roles: data.user.roles || [],
            });
          }
        }
      } catch {
        // Not authenticated — dashboard will show login redirect
      }
    };
    validate();
  }, []);

  const authorizedRoles = userData?.roles || [];
  const hasMultipleRoles = authorizedRoles.length > 1 && authorizedRoles.filter(r => r !== "ADMIN").length > 1;

  const handleRoleSwitch = (role: string) => {
    setRoleSwitcherOpen(false);
    const url = getRoleDashboardUrl(role);
    router.push(url);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/staff/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Logout best-effort — redirect anyway
    }
    router.push("/staff-login");
  };

  const handleBack = () => {
    router.push("/staff");
  };

  return (
    <ThemeProvider>
      <DashboardContent
        userData={userData}
        title={title}
        hasMultipleRoles={hasMultipleRoles}
        roleSwitcherOpen={roleSwitcherOpen}
        setRoleSwitcherOpen={setRoleSwitcherOpen}
        handleRoleSwitch={handleRoleSwitch}
        handleLogout={handleLogout}
        handleBack={handleBack}
        authorizedRoles={authorizedRoles}
      >
        {children}
      </DashboardContent>
    </ThemeProvider>
  );
}

function DashboardContent({
  children,
  userData,
  title,
  hasMultipleRoles,
  roleSwitcherOpen,
  setRoleSwitcherOpen,
  handleRoleSwitch,
  handleLogout,
  handleBack,
  authorizedRoles
}: DashboardLayoutProps & {
  userData: {full_name: string; role: string; roles: string[]} | null;
  hasMultipleRoles: boolean;
  roleSwitcherOpen: boolean;
  setRoleSwitcherOpen: (open: boolean) => void;
  handleRoleSwitch: (role: string) => void;
  handleLogout: () => void;
  handleBack: () => void;
  authorizedRoles: string[];
}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--primary)] p-2">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--foreground)]">
                  {title || "Staff Portal"}
                </h1>
                <p className="text-xs text-[var(--muted)]">
                  {userData?.full_name || "Loading..."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              {/* Role Switcher */}
              {hasMultipleRoles && (
                <div className="relative">
                  <button
                    onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    <span className="capitalize">
                      {ROLE_LABELS[userData?.role || ""] || userData?.role || "Staff"}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${roleSwitcherOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {roleSwitcherOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
                      >
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                            Switch Role
                          </p>
                          {authorizedRoles.filter(r => r !== "ADMIN").map((role) => {
                            const Icon = ROLE_ICONS[role] || Shield;
                            const isActive = userData?.role === role;

                            return (
                              <button
                                key={role}
                                onClick={() => handleRoleSwitch(role)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                  isActive
                                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                                }`}
                              >
                                <Icon size={16} />
                                <span className="flex-1 text-left">{ROLE_LABELS[role] || role}</span>
                                {isActive && (
                                  <span className="text-xs text-[var(--primary)]">Active</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 hover:bg-[var(--surface-elevated)] transition-colors"
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? (
                  <Moon size={18} className="text-[var(--foreground)]" />
                ) : (
                  <Sun size={18} className="text-[var(--foreground)]" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>

      {/* Click outside to close role switcher */}
      {roleSwitcherOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setRoleSwitcherOpen(false)}
        />
      )}
    </div>
  );
}