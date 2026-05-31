"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Bell, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Mail, Menu, Moon, ReceiptText, Search, Settings, Sun, User, Users, X, Briefcase, Shield, Wallet, ShieldCheck } from "lucide-react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "susu_theme";
const THEME_EVENT = "susu-theme";

const setThemeMode = (mode: ThemeMode) => {
  // Toggle dark class for Tailwind v4 dark mode
  document.documentElement.classList.toggle("dark", mode === "dark");
  // Keep data-theme for backwards compatibility
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
  { href: "/admin_dash", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin_dash/users", label: "Users", icon: Users },
  { href: "/admin_dash/groups", label: "Groups", icon: Users },
  { href: "/admin_dash/tellers", label: "Tellers", icon: Briefcase },
  { href: "/admin_dash/staff", label: "Staff", icon: Shield },
  { href: "/admin_dash/staff-roles", label: "Staff Role Management", icon: ShieldCheck },
  { href: "/admin_dash/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/admin_dash/ledger", label: "Ledger", icon: Wallet },
  { href: "/admin_dash/compliance", label: "Compliance", icon: AlertTriangle },
  { href: "/admin_dash/messages", label: "Messaging", icon: Mail },
  { href: "/admin_dash/revenue", label: "Audit Revenue", icon: ReceiptText },
  { href: "/admin_dash/system-health", label: "System Health", icon: Activity },
  { href: "/admin_dash/settings", label: "Settings", icon: Settings }
];

function AdminDashSidebar({
  variant,
  pathname,
  mode,
  onClose,
  onToggleTheme,
  navItems: navItemsOverride,
  collapsed,
  onToggleCollapse
}: {
  variant: "desktop" | "mobile";
  pathname: string;
  mode: ThemeMode;
  onClose?: () => void;
  onToggleTheme: () => void;
  navItems?: typeof navItems;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const isCollapsed = variant === "desktop" && collapsed;
  const items = navItemsOverride || navItems;
  
  return (
    <div
      className={`h-full transition-all duration-200 ${
        variant === "desktop" ? "hidden lg:flex" : "flex"
      } ${isCollapsed ? "w-[72px]" : "w-[260px]"} flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm`}
    >
      <div className="flex items-center justify-between px-3 py-3.5">
        <Link href="/admin_dash" className="flex items-center gap-3" onClick={onClose}>
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <LayoutDashboard size={16} />
          </div>
          {!isCollapsed && (
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Susu-BG</div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Admin</div>
            </div>
          )}
        </Link>
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1.5 text-slate-500 active:scale-[0.98] transition-transform"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        ) : (
          variant === "desktop" && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-[0.98] transition-transform"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )
        )}
      </div>

      <div className="px-2.5">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/50 p-2.5">
          {!isCollapsed && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 mb-1">Menu</div>
          )}
          <nav className="mt-1.5 grid gap-0.5">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin_dash" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`rounded-lg p-1.5 ${
                        active ? "bg-indigo-200 dark:bg-indigo-800" : "bg-slate-200 dark:bg-slate-700"
                      } shrink-0`}
                    >
                      <Icon size={14} />
                    </span>
                    {!isCollapsed && item.label}
                  </span>
                  {active && !isCollapsed ? <ChevronRight size={14} className="opacity-60" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-auto p-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{mode === "dark" ? "Dark" : "Light"}</div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="rounded-lg bg-slate-700 dark:bg-slate-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-[0.98] transition-transform"
              >
                <span className="inline-flex items-center gap-1.5">
                  {mode === "dark" ? <Sun size={12} /> : <Moon size={12} />}
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

export default function AdminDashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin-auth/verify-session", {
          method: "GET",
          credentials: "same-origin"
        });

        if (response.ok) {
          try {
            const data = await response.json();
            setCurrentRole(String(data?.user?.role || ""));
          } catch {
            setCurrentRole("");
          }
          setIsAuthenticated(true);
          setIsAuthResolved(true);
          return;
        }
      } catch {
        // Continue to unauthenticated
      }

      setIsAuthenticated(false);
      setCurrentRole("");
      setIsAuthResolved(true);
      router.replace("/admin-login");
    };

    checkAuth();
  }, [router, pathname]);

  const filteredNavItems = useMemo(() => {
    const role = String(currentRole || "").toUpperCase();
    const isAdminOrManager = role === "ADMIN" || role === "MANAGER";
    return navItems.filter((item) => {
      if (item.href === "/admin_dash/ledger") return isAdminOrManager;
      if (item.href === "/admin_dash/messages") return isAdminOrManager;
      if (item.href === "/admin_dash/settings") return isAdminOrManager;
      if (item.href === "/admin_dash/staff-roles") return isAdminOrManager;
      return true;
    });
  }, [currentRole]);

  const breadcrumbs = useMemo(() => {
    const parts = String(pathname || "/")
      .split("/")
      .filter(Boolean);
    if (parts.length === 0) return ["Admin"];
    if (parts[0] !== "admin_dash") return ["Admin"];
    const rest = parts.slice(1);
    if (rest.length === 0) return ["Admin", "Dashboard"];
    return ["Admin", ...rest.map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))];
  }, [pathname]);

  const toggleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const handleSettings = () => {
    router.push("/admin_dash/settings");
  };

  const handleMessages = () => {
    router.push("/admin_dash/messages");
  };

  const handleProfile = () => {
    router.push("/admin_dash/settings");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin-auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // ignore errors - proceed with client-side logout
    }

    setIsAuthenticated(false);
    setCurrentRole("");
    document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.replace("/admin-login");
  };

  const handleBack = () => {
    router.push("/admin_dash");
  };

  if (!isAuthResolved) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Background - subtle gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6">
        <AdminDashSidebar variant="desktop" pathname={String(pathname || "")} mode={mode} onToggleTheme={toggleTheme} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} navItems={filteredNavItems} />

        <div className="flex-1">
          {/* Header - 21st.dev Inspired Design */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2.5 shadow-sm dark:shadow-slate-900/50 flex-wrap">
            {/* Left: Menu + Title + Page */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300 active:scale-[0.98] transition-transform"
                aria-label="Open sidebar"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Admin Dashboard</div>
                <div className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {breadcrumbs[breadcrumbs.length - 1] || "Dashboard"}
                </div>
              </div>
            </div>

            {/* Center: Search */}
            <div className="relative hidden flex-1 min-w-[150px] max-w-[250px] sm:min-w-[200px] sm:max-w-[300px] md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                placeholder="Search..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {mode === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </motion.button>

              {/* Settings */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleSettings}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Settings"
              >
                <Settings size={14} />
              </motion.button>

              {/* Notifications */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleMessages}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={14} />
              </motion.button>

              {/* User Profile */}
              <button
                type="button"
                onClick={handleProfile}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 sm:px-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <User size={13} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden xs:block sm:block">Admin</span>
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft size={13} />
                <span className="hidden xs:inline">Back</span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <LogOut size={13} />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>

          <div className="mt-3">{children}</div>
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
              <AdminDashSidebar
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