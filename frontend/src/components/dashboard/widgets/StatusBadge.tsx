"use client";

import { LucideIcon, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

type StatusVariant = "success" | "pending" | "failed" | "processing" | "duplicate";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const VARIANT_MAP: Record<string, StatusVariant> = {
  SUCCESS: "success",
  COMPLETED: "success",
  APPROVED: "success",
  PENDING: "pending",
  PROCESSING: "processing",
  FAILED: "failed",
  REJECTED: "failed",
  REVERSED: "failed",
  DUPLICATE: "duplicate",
  BLOCKED: "duplicate",
};

export function StatusBadge({
  status,
  variant,
  showIcon = true,
  size = "md",
}: StatusBadgeProps) {
  const resolvedVariant = variant || VARIANT_MAP[status.toUpperCase()] || "pending";

  const config = {
    success: {
      bg: "bg-[var(--success)]/10",
      text: "text-[var(--success)]",
      border: "border-[var(--success)]/20",
      icon: CheckCircle,
    },
    pending: {
      bg: "bg-[var(--warning)]/10",
      text: "text-[var(--warning)]",
      border: "border-[var(--warning)]/20",
      icon: Clock,
    },
    failed: {
      bg: "bg-[var(--danger)]/10",
      text: "text-[var(--danger)]",
      border: "border-[var(--danger)]/20",
      icon: XCircle,
    },
    processing: {
      bg: "bg-[var(--primary)]/10",
      text: "text-[var(--primary)]",
      border: "border-[var(--primary)]/20",
      icon: AlertCircle,
    },
    duplicate: {
      bg: "bg-[var(--muted)]/10",
      text: "text-[var(--muted)]",
      border: "border-[var(--muted)]/20",
      icon: AlertCircle,
    },
  };

  const { bg, text, border, icon: IconComponent } = config[resolvedVariant];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium capitalize ${bg} ${text} ${border} ${sizeClasses}`}
    >
      {showIcon && <IconComponent size={size === "sm" ? 10 : 12} />}
      {status.toLowerCase()}
    </span>
  );
}