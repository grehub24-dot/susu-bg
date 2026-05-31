"use client";

import { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "warning" | "danger";
  size?: "sm" | "md";
}

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  size = "md",
}: StatTileProps) {
  const toneClasses = {
    default: "text-[var(--foreground)]",
    positive: "text-[var(--success)]",
    warning: "text-[var(--warning)]",
    danger: "text-[var(--danger)]",
  };

  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
  };

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] ${sizeClasses[size]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">{label}</p>
          <p className={`mt-1 font-semibold ${toneClasses[tone]}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <div className="rounded-lg bg-[var(--border)] p-2">
            <Icon size={16} className="text-[var(--muted)]" />
          </div>
        )}
      </div>
    </div>
  );
}