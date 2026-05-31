"use client";

import { useMemo, useState } from "react";
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
  "rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 md:p-8 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminUiSettings>(() => readAdminUiSettings());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsConfig>(() => readPaymentMethods());
  const [savedAt, setSavedAt] = useState<string>("");
  const [message, setMessage] = useState("");

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
        <h1 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Settings</h1>
        <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)]">
          Persisted admin UI preferences. These are browser-level controls, not core banking parameters.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">Weekly Activity</div>
            <div className="mt-3 text-sm font-semibold text-[color:var(--color-foreground)]">Week starts on</div>
            <div className="mt-3 inline-flex rounded-2xl border border-[color:var(--color-border)] bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, weekStartsOn: "MON" }))}
                className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                  settings.weekStartsOn === "MON"
                    ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
                    : "text-[color:var(--color-muted)]"
                }`}
              >
                Monday
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, weekStartsOn: "SUN" }))}
                className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition-colors ${
                  settings.weekStartsOn === "SUN"
                    ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"
                    : "text-[color:var(--color-muted)]"
                }`}
              >
                Sunday
              </button>
            </div>

            <div className="mt-5 text-sm font-semibold text-[color:var(--color-foreground)]">Weekend partial-day markers</div>
            <div className="mt-3 grid gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]/90">
                <input
                  type="checkbox"
                  checked={settings.partialDays.sat}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, partialDays: { ...prev.partialDays, sat: e.target.checked } }))
                  }
                  className="h-4 w-4 rounded border-[color:var(--color-border)]"
                />
                Saturday partial
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-foreground)]/90">
                <input
                  type="checkbox"
                  checked={settings.partialDays.sun}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, partialDays: { ...prev.partialDays, sun: e.target.checked } }))
                  }
                  className="h-4 w-4 rounded border-[color:var(--color-border)]"
                />
                Sunday partial
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">System Health</div>
            <div className="mt-3 text-sm font-semibold text-[color:var(--color-foreground)]">Auto refresh interval</div>
            <select
              value={settings.healthRefreshSeconds}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  healthRefreshSeconds: Number(e.target.value)
                }))
              }
              className="mt-3 w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
            >
              {healthRefreshOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-semibold text-[color:var(--color-muted)]">
              Used by the admin System Health screen for periodic checks.
            </p>
            <div className="mt-5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-xs font-semibold text-[color:var(--color-muted)]">
              {message ? `${message}${savedAt ? ` • ${savedAt}` : ""}` : "No unsaved warning. Click Save after changes."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSettings}
                className="rounded-xl bg-[color:var(--color-sage-green)] px-4 py-2 text-xs font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={resetDefaults}
                className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-2 text-xs font-extrabold text-[color:var(--color-foreground)] active:scale-[0.99] transition-transform"
              >
                Reset Defaults
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={card}>
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} className="text-[color:var(--color-sage-green)]" />
          <h2 className="text-xl font-extrabold tracking-tight text-[color:var(--color-foreground)]">Payment Methods</h2>
        </div>
        <p className="mt-1 text-sm font-medium text-[color:var(--color-muted)] mb-6">
          Enable or disable payment methods. Teller and GhanaPay are enabled by default. Other methods require API configuration.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[color:var(--color-foreground)] mb-3">Deposit Methods</h3>
            <div className="grid gap-2">
              {allMethods.map(({ id, deposit }) => deposit && (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${deposit.enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${deposit.enabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {getMethodIcon(id)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[color:var(--color-foreground)]">{deposit.name}</p>
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
            <h3 className="text-sm font-bold text-[color:var(--color-foreground)] mb-3">Withdrawal Methods</h3>
            <div className="grid gap-2">
              {allMethods.map(({ id, withdraw }) => withdraw && (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${withdraw.enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${withdraw.enabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {getMethodIcon(id)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[color:var(--color-foreground)]">{withdraw.name}</p>
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
            className="rounded-xl bg-[color:var(--color-sage-green)] px-4 py-2 text-xs font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform"
          >
            Save Payment Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
