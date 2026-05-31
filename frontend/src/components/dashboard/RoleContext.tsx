"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface StaffUser {
  id: string;
  staff_code: string;
  full_name: string;
  role: string;
  roles: string[];
}

interface RoleContextType {
  user: StaffUser | null;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  switchRole: (role: string) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_ROUTE_MAP: Record<string, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager_dash",
  SUPERVISOR: "/supervisor_dash",
  TELLER: "/teller_dash",
  LOAN_OFFICER: "/loan_officer_dash",
  SUSU_COLLECTOR: "/susu_collector_dash",
  AUDITOR: "/auditor_dash",
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

export function useRoleLabels() {
  return ROLE_LABELS;
}

export function getRoleDashboardUrl(role: string): string {
  return ROLE_ROUTE_MAP[role] || "/dashboard";
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const switchRole = (role: string) => {
    const url = ROLE_ROUTE_MAP[role];
    if (url) {
      router.push(url);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/staff/logout`, {
        method: "POST",
        credentials: "same-origin"
      });
    } catch {}
    router.push("/staff-login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--success)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{ user, isLoading, hasRole, switchRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}

export function useStaffAuth() {
  const { user, isLoading, logout } = useRole();

  const checkAuth = () => {
    if (!isLoading && !user) {
      return false;
    }
    return true;
  };

  return { user, isLoading, logout, checkAuth };
}