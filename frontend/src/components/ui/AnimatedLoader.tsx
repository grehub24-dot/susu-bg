"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Shield } from "lucide-react";

interface AnimatedLoaderProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  variant?: "default" | "staff" | "admin";
}

export function AnimatedLoader({ 
  isLoading, 
  title = "Susu-BG", 
  subtitle = "Loading...",
  variant = "default"
}: AnimatedLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server or during hydration
  if (!mounted) return null;
  const bgGradient = {
    default: "from-[#FFF5F5] via-[#FFE5E5] to-[#E8F4EA]",
    staff: "from-[#FFF5F5] to-[#E8F4EA]",
    admin: "from-slate-900 to-slate-800"
  };

  const iconColor = {
    default: "bg-[#2d3436]",
    staff: "bg-[#2d3436]",
    admin: "bg-slate-700"
  };

  const iconType = variant === "staff" ? Shield : ShieldCheck;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25 }}
          className={`absolute inset-0 z-40 flex items-center justify-center bg-[#FFF5F5]/95 backdrop-blur-sm`}
        >
          {/* Subtle background orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#A8D5BA]/25 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#E8B4B8]/25 blur-3xl" />
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 text-center"
          >
            {/* Animated Icon */}
            <motion.div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${iconColor[variant]} mb-6 shadow-lg`}
              whileHover={{ scale: 1.05 }}
            >
              {variant === "staff" ? (
                <Shield className="w-12 h-12 text-white" />
              ) : (
                <ShieldCheck className="w-12 h-12 text-white" />
              )}
            </motion.div>

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-[#2d3436] mb-2"
            >
              {title}
            </motion.h1>

            {/* Subtitle with animated dots */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-zinc-500 flex items-center justify-center gap-1"
            >
              {subtitle}
              <LoadingDots />
            </motion.p>
          </motion.div>

          {/* Bottom branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-zinc-400 font-medium"
          >
            Fintech for Everyone
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </span>
  );
}

export default AnimatedLoader;