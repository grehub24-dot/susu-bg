"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDefaultAdminUiSettings, type AdminUiSettings, getDefaultPaymentMethods, readAdminUiSettings, readPaymentMethods, writeAdminUiSettings, writePaymentMethods, type PaymentMethodsConfig, type PaymentMethod } from "@/lib/admin-settings";
import { Settings, CreditCard, Smartphone, Landmark, Wifi, Wallet, PiggyBank, CheckCircle, XCircle, Clock } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } }
};

const card =
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-lg backdrop-blur-xl";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminUiSettings>(() => readAdminUiSettings());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsConfig>(() => readPaymentMethods());
  const [savedAt, setSavedAt] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const response = await fetch("/api/admin-auth/verify-session", {
          method: "GET",
          credentials: "same-origin"
        });

        if (!response.ok) {
          router.replace("/admin-login");
          return;
        }

        const data = await response.json();
        const role = String(data?.user?.role || "").toUpperCase();
        const allowed = role === "ADMIN" || role === "MANAGER";

        if (!allowed) {
          router.replace("/admin_dash");
        }
      } catch {
        router.replace("/admin_dash");
      }
    };

    checkRole();
  }, [router]);

  const togglePaymentMethod = (type: 'deposit' | 'withdraw', methodId: string) => {
    setPaymentMethods(prev => ({
      ...prev,
      [type]: prev[type].map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m)
    }));
  };

  const getMethodIcon = (methodId: string) => {
    const icons: Record<string, React.ReactNode> = {
      TELLER: <Wallet size={16} />,
      GHANAPAY: <Smartphone size={16} />,
      PAYSTACK: <CreditCard size={16} />,
      MOMO: <Smartphone size={16} />,
      ATM: <CreditCard size={16} />,
      USSD: <Wifi size={16} />
    };
    return icons[methodId] || <CreditCard size={16} />;
  };

  const getMethodTypeStyle = (type: string) => {
    const styles: Record<string, string> = {
      enabled: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
      gateway: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
      future: 'bg-slate-500/10 border-slate-500/30 text-slate-500'
    };
    return styles[type] || styles.future;
  };

  const healthRefreshOptions = useMemo(
    () => [
      { label: "10 seconds", value: 10 },
      { label: "30 seconds", value: 30 },
      { label: "60 seconds", value: 60 },
      { label: "120 seconds", value: 120 }
    ],
    []
  );

  const allMethods = useMemo(() => {
    const depositIds = paymentMethods.deposit.map(m => m.id);
    const withdrawIds = paymentMethods.withdraw.map(m => m.id);
    const uniqueIds = [...new Set([...depositIds, ...withdrawIds])];
    return uniqueIds.map(id => ({
      id,
      deposit: paymentMethods.deposit.find(m => m.id === id),
      withdraw: paymentMethods.withdraw.find(m => m.id === id)
    }));
  }, [paymentMethods]);

  const saveSettings = () => {
    writeAdminUiSettings(settings);
    writePaymentMethods(paymentMethods);
    setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setMessage("Settings saved");
  };

  const resetDefaults = () => {
    const defaults = getDefaultAdminUiSettings();
    setSettings(defaults);
    writeAdminUiSettings(defaults);
    setPaymentMethods(getDefaultPaymentMethods());
    writePaymentMethods(getDefaultPaymentMethods());
    setSavedAt(new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setMessage("Defaults restored");
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className={card}>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Persisted admin UI preferences. These are browser-level controls, not core banking parameters.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Weekly Activity</div>
            <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Week starts on</div>
            <div className="mt-3 inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, weekStartsOn: "MON" }))}
                className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                  settings.weekStartsOn === "MON"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-zinc-900 shadow-lg"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Monday
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, weekStartsOn: "SUN" }))}
                className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                  settings.weekStartsOn === "SUN"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-zinc-900 shadow-lg"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Sunday
              </button>
            </div>

            <div className="mt-5 text-sm font-semibold text-slate-900 dark:text-slate-100">Weekend partial-day markers</div>
            <div className="mt-3 grid gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100/90">
                <input
                  type="checkbox"
                  checked={settings.partialDays.sat}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, partialDays: { ...prev.partialDays, sat: e.target.checked } }))
                  }
                  className="h-4 w-4 rounded border-slate-200 dark:border-slate-800"
                />
                Saturday partial
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100/90">
                <input
                  type="checkbox"
                  checked={settings.partialDays.sun}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, partialDays: { ...prev.partialDays, sun: e.target.checked } }))
                  }
                  className="h-4 w-4 rounded border-slate-200 dark:border-slate-800"
                />
                Sunday partial
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-800 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">System Health</div>
            <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Auto refresh interval</div>
            <select
              value={settings.healthRefreshSeconds}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  healthRefreshSeconds: Number(e.target.value)
                }))
              }
              className="mt-3 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-600/30"
            >
              {healthRefreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Used by the admin System Health screen for periodic checks.
            </p>
            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {message ? `${message}${savedAt ? ` • ${savedAt}` : ""}` : "No unsaved warning. Click Save after changes."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-[#2d3436] shadow-lg active:scale-[0.99] transition-transform"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={resetDefaults}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 active:scale-[0.99] transition-transform"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} className="text-indigo-600" />
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Payment Methods</h2>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
          Enable or disable payment methods. Teller and GhanaPay are enabled by default. Other methods require API configuration.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Deposit Methods</h3>
            <div className="grid gap-2">
              {allMethods.map(({ id, deposit }) => deposit && (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${deposit.enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${deposit.enabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {getMethodIcon(id)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{deposit.name}</p>
                      <p className={`text-xs font-medium ${deposit.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {deposit.type === 'enabled' ? 'Active' : deposit.type === 'gateway' ? 'API Required' : 'Coming Soon'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePaymentMethod('deposit', id)}
                    disabled={deposit.type === 'future'}
                    className={`p-2 rounded-xl transition-all ${deposit.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} ${deposit.type === 'future' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {deposit.enabled ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Withdrawal Methods</h3>
            <div className="grid gap-2">
              {allMethods.map(({ id, withdraw }) => withdraw && (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${withdraw.enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${withdraw.enabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {getMethodIcon(id)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{withdraw.name}</p>
                      <p className={`text-xs font-medium ${withdraw.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {withdraw.type === 'enabled' ? 'Active' : withdraw.type === 'gateway' ? 'API Required' : 'Coming Soon'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePaymentMethod('withdraw', id)}
                    disabled={withdraw.type === 'future'}
                    className={`p-2 rounded-xl transition-all ${withdraw.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} ${withdraw.type === 'future' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {withdraw.enabled ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={saveSettings}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-[#2d3436] shadow-lg active:scale-[0.99] transition-transform"
          >
            Save Payment Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
