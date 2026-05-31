"use client";

import { useRouter } from "next/navigation";
import { useRole, getRoleDashboardUrl, useRoleLabels } from "../RoleContext";

export function useRoleSwitcher() {
  const router = useRouter();
  const { user, switchRole, hasRole } = useRole();
  const roleLabels = useRoleLabels();

  const authorizedRoles = user?.roles || [];

  const switchToRole = (role: string) => {
    if (hasRole(role)) {
      switchRole(role);
    }
  };

  const getRoleOptions = () => {
    return authorizedRoles.map((role) => ({
      id: role,
      label: roleLabels[role] || role,
      url: getRoleDashboardUrl(role),
      isActive: user?.role === role,
    }));
  };

  return {
    user,
    authorizedRoles,
    switchToRole,
    getRoleOptions,
    hasRole,
    primaryRole: user?.role || "",
    primaryRoleLabel: roleLabels[user?.role || ""] || user?.role || "",
  };
}