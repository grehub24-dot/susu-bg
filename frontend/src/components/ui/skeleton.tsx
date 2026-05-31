"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = "", variant = "rectangular", width, height }: SkeletonProps) {
  const baseStyles = "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse";
  
  const variantStyles = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-xl"
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={60} />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
      <Skeleton width={60} height={20} />
    </div>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div className="rounded-[1.5rem] p-6 bg-[var(--color-surface)] border border-[var(--color-border)]">
      <Skeleton width={100} height={14} className="mb-2" />
      <Skeleton width={160} height={40} className="mb-4" />
      <div className="flex gap-3">
        <Skeleton width={80} height={36} />
        <Skeleton width={80} height={36} />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  const widths = [80, 100, 70, 90];
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--color-border)]">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} height={14} />
      ))}
    </div>
  );
}