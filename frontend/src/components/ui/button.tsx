"use client";

import { forwardRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

const variants = {
  primary: "bg-[var(--color-sage-green)] text-white hover:opacity-90 border-transparent",
  secondary: "bg-[var(--color-soft-pink)] text-white hover:opacity-90 border-transparent",
  outline: "bg-transparent border-2 border-[var(--color-sage-green)] text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/10",
  ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-border)]",
  danger: "bg-red-500 text-white hover:opacity-90 border-transparent"
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, disabled, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all
          disabled:opacity-50 disabled:cursor-not-allowed active:scale-95
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]
              text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/50 focus:border-[var(--color-sage-green)]
              transition-all
              ${icon ? "pl-10" : ""}
              ${error ? "border-red-500" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`
        rounded-[1.5rem] p-6 bg-[var(--color-surface)]
        border border-[var(--color-border)] shadow-[0_8px_30px_rgb(0,0,0,0.08)]
        backdrop-blur-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}