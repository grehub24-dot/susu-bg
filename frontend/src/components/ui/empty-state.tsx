"use client";

import { motion } from "framer-motion";
import { FileX, Inbox, RefreshCw, SearchX } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: "inbox" | "search" | "error" | "refresh";
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const icons = {
  inbox: Inbox,
  search: SearchX,
  error: FileX,
  refresh: RefreshCw
};

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-[var(--color-soft-pink)]/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-soft-pink)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="px-4 py-2 rounded-lg bg-[var(--color-sage-green)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-2 rounded-lg bg-[var(--color-sage-green)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            {action.label}
          </button>
        )
      )}
    </motion.div>
  );
}