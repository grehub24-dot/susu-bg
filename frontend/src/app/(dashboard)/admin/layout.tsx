"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Bell, ChevronLeft, ChevronRight, LayoutDashboard, Mail, Menu, Moon, ReceiptText, Search, Settings, Sun, User, Users, X, Briefcase, Shield, Wallet, ShieldCheck } from "lucide-react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "susu_theme";
const THEME_EVENT = "susu-theme";

const setThemeMode = (mode: ThemeMode) => {
  document.documentElement.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    void 0;
  }
  window.dispatchEvent(new Event(THEME_EVENT));
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    void 0;
  }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/groups", label: "Groups", icon: Users },
  { href: "/admin/tellers", label: "Tellers", icon: Briefcase },
  { href: "/admin/staff", label: "Staff", icon: Shield },
  { href: "/admin/staff-roles", label: "Staff Role Management", icon: ShieldCheck },
  { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/admin/transactions/monitor", label: "Transaction Monitor", icon: ShieldCheck },
  { href: "/admin/ledger", label: "Ledger", icon: Wallet },
  { href: "/admin/compliance", label: "Compliance", icon: AlertTriangle },
  { href: "/admin/messages", label: "Messaging", icon: Mail },
  { href: "/admin/revenue", label: "Audit Revenue", icon: ReceiptText },
  { href: "/admin/system-health", label: "System Health", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

function AdminSidebar({
  variant,
  pathname,
  mode,
  onClose,
  onToggleTheme,
  collapsed,
  onToggleCollapse
}: {
  variant: "desktop" | "mobile";
  pathname: string;
  mode: ThemeMode;
  onClose?: () => void;
  onToggleTheme: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const isCollapsed = variant === "desktop" && collapsed;
  
  return (
    <div
      className={`h-full transition-all duration-300 ${
        variant === "desktop" ? "hidden lg:flex" : "flex"
      } ${isCollapsed ? "w-[72px]" : "w-[280px]"} flex-col rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="h-10 w-10 rounded-2xl bg-[color:var(--color-sage-green)]/18 text-[color:var(--color-foreground)] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] shrink-0">
            <LayoutDashboard size={18} />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[color:var(--color-foreground)]">Susu-BG</div>
              <div className="text-xs font-semibold text-[color:var(--color-muted)]">Admin Dashboard</div>
            </div>
          )}
        </Link>
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-[color:var(--color-muted)] active:scale-[0.98] transition-transform"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        ) : (
          variant === "desktop" && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-[color:var(--color-foreground)]/70 hover:text-[color:var(--color-foreground)] active:scale-[0.98] transition-transform"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )
        )}
      </div>

      <div className="px-3">
        <div className="rounded-3xl bg-[color:var(--color-surface-2)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          {!isCollapsed && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Menu</div>
          )}
          <nav className="mt-3 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[color:var(--color-sage-green)]/15 text-[color:var(--color-foreground)] ring-1 ring-[color:var(--color-sage-green)]/15"
                      : "text-[color:var(--color-foreground)]/80 hover:bg-black/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`rounded-xl p-2 ${
                        active ? "bg-[color:var(--color-sage-green)]/20" : "bg-black/5"
                      } shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] shrink-0`}
                    >
                      <Icon size={16} />
                    </span>
                    {!isCollapsed && item.label}
                  </span>
                  {active && !isCollapsed ? <ChevronRight size={16} className="opacity-70" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-auto p-4">
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[color:var(--color-muted)]">Theme</div>
                <div className="text-sm font-extrabold text-[color:var(--color-foreground)]">{mode === "dark" ? "Dark" : "Light"}</div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-2xl bg-[color:var(--color-foreground)] px-3 py-2 text-xs font-extrabold text-[color:var(--color-background)] shadow-[0_14px_30px_rgba(0,0,0,0.18)] active:scale-[0.98] transition-transform"
              >
                <span className="inline-flex items-center gap-2">
                  {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  Toggle
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const mode = useSyncExternalStore<ThemeMode>(
    (callback) => {
      if (typeof window === "undefined") return () => void 0;
      window.addEventListener("storage", callback);
      window.addEventListener(THEME_EVENT, callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(THEME_EVENT, callback);
      };
    },
    () => getInitialTheme(),
    () => "light"
  );

  useEffect(() => {
    setThemeMode(mode);
  }, [mode]);

  // Check authentication — cookie presence only.
  // The dashboard's own data-fetching calls handle session validation;
  // we only need to gate rendering on whether a cookie was set.
  useEffect(() => {
    const checkAuth = async () => {
      const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("admin_session_token="));
      
      if (hasCookie) {
        try {
          const token = document.cookie
            .split("; ")
            .find(c => c.trim().startsWith("admin_session_token="))
            ?.split("=")[1];

          const response = await fetch("/api/admin-auth/verify-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-session-token": token || ""
            }
          });

          if (response.ok) {
            setIsAuthenticated(true);
            setIsAuthResolved(true);
            return;
          }
        } catch {
          // Continue to unauthenticated
        }
      }

      setIsAuthenticated(false);
      setIsAuthResolved(true);
      router.replace("/admin-login");
    };

    checkAuth();
  }, [router, pathname]);

  const breadcrumbs = useMemo(() => {
    const parts = String(pathname || "/")
      .split("/")
      .filter(Boolean);
    if (parts.length === 0) return ["Admin"];
    if (parts[0] !== "admin") return ["Admin"];
    const rest = parts.slice(1);
    if (rest.length === 0) return ["Admin", "Overview"];
    return ["Admin", ...rest.map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))];
  }, [pathname]);

  const toggleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  if (!isAuthResolved || !isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-skin min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[color:var(--color-sage-green)]/18 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[34rem] w-[34rem] rounded-full bg-[color:var(--color-soft-pink)]/16 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6">
        <AdminSidebar variant="desktop" pathname={String(pathname || "")} mode={mode} onToggleTheme={toggleTheme} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <div className="flex-1">
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 text-[color:var(--color-foreground)]/80 active:scale-[0.98] transition-transform"
                aria-label="Open sidebar"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-[color:var(--color-foreground)]">
                  {breadcrumbs[breadcrumbs.length - 1] || "Dashboard"}
                </div>
                <div className="mt-0.5 flex items-center gap-2 truncate text-xs font-semibold text-[color:var(--color-muted)]">
                  {breadcrumbs.slice(0, -1).map((b, idx) => (
                    <span key={`${b}-${idx}`} className="inline-flex items-center gap-2">
                      <span>{b}</span>
                      <ChevronRight size={14} className="opacity-60" />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative hidden w-full max-w-[420px] flex-1 md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" size={16} />
                <input
                  placeholder="Search for something"
                  className="w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] py-2.5 pl-11 pr-4 text-sm font-semibold text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/25"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-foreground)]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  aria-label="Toggle theme"
                >
                  {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-foreground)]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  aria-label="Settings"
                >
                  <Settings size={16} />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] text-[color:var(--color-foreground)]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                </motion.button>

                <div className="flex h-11 items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[color:var(--color-sage-green)]/15 text-[color:var(--color-foreground)]">
                    <User size={16} />
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-extrabold text-[color:var(--color-foreground)]">Admin</div>
                    <div className="text-[11px] font-semibold text-[color:var(--color-muted)]">Operations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">{children}</div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 p-4 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminSidebar
                variant="mobile"
                pathname={String(pathname || "")}
                mode={mode}
                onToggleTheme={toggleTheme}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
