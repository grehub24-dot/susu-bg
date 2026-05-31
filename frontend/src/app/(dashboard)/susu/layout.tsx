"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Coins, LayoutDashboard, Mail, Users, Wallet } from "lucide-react";

const navItems = [
  { href: "/susu", label: "Overview", icon: LayoutDashboard },
  { href: "/susu/members", label: "Members/AML", icon: Users },
  { href: "/susu/contributions", label: "Contributions", icon: Coins },
  { href: "/susu/loans", label: "Loans", icon: Wallet },
  { href: "/susu/reports", label: "Reports", icon: BarChart3 },
  { href: "/susu/sms-logs", label: "SMS Logs", icon: Mail }
];

export default function SusuLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#A8D5BA]/20 text-[#2d3436] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <Wallet size={18} />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight text-[#2d3436]">Susu Management</div>
                <div className="text-xs font-semibold text-zinc-500">BoG-aligned cooperative savings</div>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[#2d3436] text-white"
                          : "bg-zinc-100 text-[#2d3436] hover:bg-zinc-200"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {children}
      </div>
    </div>
  );
}
