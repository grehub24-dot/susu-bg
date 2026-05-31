"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "susu_fintech_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = stored || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const tokens = themeTokens[theme];
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export const themeTokens = {
  light: {
    primary: "#4F46E5",
    primaryLight: "#6366F1",
    success: "#059669",
    successLight: "#10B981",
    warning: "#D97706",
    warningLight: "#F59E0B",
    danger: "#DC2626",
    dangerLight: "#EF4444",
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "#E2E8F0",
    foreground: "#0F172A",
    foregroundSecondary: "#334155",
    muted: "#64748B",
    debit: "#059669",
    credit: "#2563EB",
    tax: "#D97706",
    duplicate: "#6B7280",
    ledgerDebit: "#DCFCE7",
    ledgerCredit: "#DBEAFE",
    ledgerTax: "#FEF3C7",
  },
  dark: {
    primary: "#818CF8",
    primaryLight: "#A5B4FC",
    success: "#34D399",
    successLight: "#6EE7B7",
    warning: "#FBBF24",
    warningLight: "#FCD34D",
    danger: "#F87171",
    dangerLight: "#FCA5A5",
    background: "#09090B",
    surface: "#18181B",
    surfaceElevated: "#27272A",
    border: "#27272A",
    foreground: "#FAFAFA",
    foregroundSecondary: "#A1A1AA",
    muted: "#71717A",
    debit: "#34D399",
    credit: "#60A5FA",
    tax: "#FBBF24",
    duplicate: "#71717A",
    ledgerDebit: "#064E3B",
    ledgerCredit: "#1E3A8A",
    ledgerTax: "#78350F",
  },
};