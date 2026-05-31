"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface QuickActionProps {
  label: string;
  description?: string;
  icon: LucideIcon;
  href: string;
  variant?: "default" | "primary" | "success";
  disabled?: boolean;
}

export function QuickAction({
  label,
  description,
  icon: Icon,
  href,
  variant = "default",
  disabled = false,
}: QuickActionProps) {
  const variantClasses = {
    default: "border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
    primary: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
    success: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  };

  const iconBgClasses = {
    default: "bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30",
    primary: "bg-indigo-100 dark:bg-indigo-900/30",
    success: "bg-emerald-100 dark:bg-emerald-900/30",
  };

  const iconColorClasses = {
    default: "text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    primary: "text-indigo-600 dark:text-indigo-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };

  const content = (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        group rounded-xl border p-4 transition-all
        ${variantClasses[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${iconBgClasses[variant]}`}>
          <Icon size={18} className={iconColorClasses[variant]} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}