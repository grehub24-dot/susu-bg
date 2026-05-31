"use client";

import { FileX, Inbox, SearchX, UserX } from "lucide-react";

interface EmptyStateProps {
  icon?: "inbox" | "search" | "users" | "file";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  inbox: Inbox,
  search: SearchX,
  users: UserX,
  file: FileX,
};

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[color:var(--color-surface-2)] flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-[color:var(--color-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[color:var(--color-foreground)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[color:var(--color-muted)] max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--color-sage-green)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface EmptyTableProps {
  message?: string;
}

export function EmptyTable({ message = "No data available" }: EmptyTableProps) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-12 text-center">
        <EmptyState icon="inbox" title={message} />
      </td>
    </tr>
  );
}