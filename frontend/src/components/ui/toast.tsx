"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showLoading: (message: string) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2
};

const styles = {
  success: "bg-emerald-500/90 border-emerald-600",
  error: "bg-red-500/90 border-red-600",
  info: "bg-blue-500/90 border-blue-600",
  loading: "bg-amber-500/90 border-amber-600"
};

const iconStyles = {
  success: "text-emerald-100",
  error: "text-red-100",
  info: "text-blue-100",
  loading: "text-amber-100 animate-spin"
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    if (type !== "loading") {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  }, []);

  const showSuccess = useCallback((message: string) => showToast("success", message), [showToast]);
  const showError = useCallback((message: string) => showToast("error", message), [showToast]);
  const showInfo = useCallback((message: string) => showToast("info", message), [showToast]);
  
  const showLoading = useCallback((message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type: "loading", message }]);
    return id;
  }, [showToast]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showLoading, hideToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => {
            const Icon = icons[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles[toast.type]} text-white shadow-lg min-w-[280px] max-w-sm`}
              >
                <Icon className={`w-5 h-5 ${iconStyles[toast.type]}`} />
                <span className="flex-1 text-sm font-medium">{toast.message}</span>
                {toast.type !== "loading" && (
                  <button
                    onClick={() => hideToast(toast.id)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}