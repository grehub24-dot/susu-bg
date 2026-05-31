export type AdminUiSettings = {
  weekStartsOn: "MON" | "SUN";
  partialDays: {
    sat: boolean;
    sun: boolean;
  };
  healthRefreshSeconds: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  enabled: boolean;
  method: string;
  type: 'enabled' | 'gateway' | 'future';
};

export type PaymentMethodsConfig = {
  deposit: PaymentMethod[];
  withdraw: PaymentMethod[];
};

export const ADMIN_UI_SETTINGS_KEY = "susu_admin_ui_settings";
export const ADMIN_ACTIVITY_SETTINGS_KEY = "susu_admin_activity_settings";
export const ADMIN_PAYMENT_SETTINGS_KEY = "susu_payment_settings";

const DEFAULT_PAYMENT_METHODS: PaymentMethodsConfig = {
  deposit: [
    { id: 'TELLER', name: 'Teller (Cash)', enabled: true, method: 'CASH', type: 'enabled' },
    { id: 'GHANAPAY', name: 'GhanaPay', enabled: true, method: 'GHANAPAY', type: 'enabled' },
    { id: 'PAYSTACK', name: 'Paystack Card', enabled: false, method: 'CARD', type: 'gateway' },
    { id: 'MOMO', name: 'Mobile Money', enabled: false, method: 'MOMO', type: 'future' },
    { id: 'ATM', name: 'ATM Card', enabled: false, method: 'ATM', type: 'future' },
    { id: 'USSD', name: 'USSD', enabled: false, method: 'USSD', type: 'future' }
  ],
  withdraw: [
    { id: 'TELLER', name: 'Teller (Cash)', enabled: true, method: 'CASH', type: 'enabled' },
    { id: 'GHANAPAY', name: 'GhanaPay', enabled: true, method: 'GHANAPAY', type: 'enabled' },
    { id: 'PAYSTACK', name: 'Bank Transfer', enabled: false, method: 'BANK', type: 'gateway' },
    { id: 'MOMO', name: 'Mobile Money', enabled: false, method: 'MOMO', type: 'future' },
    { id: 'ATM', name: 'ATM Card', enabled: false, method: 'ATM', type: 'future' },
    { id: 'USSD', name: 'USSD', enabled: false, method: 'USSD', type: 'future' }
  ]
};

const DEFAULT_SETTINGS: AdminUiSettings = {
  weekStartsOn: "MON",
  partialDays: {
    sat: false,
    sun: false
  },
  healthRefreshSeconds: 30
};

const asNumberInRange = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

export const getDefaultAdminUiSettings = (): AdminUiSettings => ({ ...DEFAULT_SETTINGS, partialDays: { ...DEFAULT_SETTINGS.partialDays } });

export const sanitizeAdminUiSettings = (input: unknown): AdminUiSettings => {
  if (!input || typeof input !== "object") return getDefaultAdminUiSettings();
  const raw = input as Partial<AdminUiSettings>;
  const weekStartsOn = raw.weekStartsOn === "SUN" ? "SUN" : "MON";
  const partialDaysRaw = raw.partialDays && typeof raw.partialDays === "object" ? raw.partialDays : {};

  return {
    weekStartsOn,
    partialDays: {
      sat: Boolean((partialDaysRaw as { sat?: unknown }).sat),
      sun: Boolean((partialDaysRaw as { sun?: unknown }).sun)
    },
    healthRefreshSeconds: asNumberInRange(raw.healthRefreshSeconds, 10, 300, DEFAULT_SETTINGS.healthRefreshSeconds)
  };
};

export const readAdminUiSettings = (): AdminUiSettings => {
  if (typeof window === "undefined") return getDefaultAdminUiSettings();
  try {
    const raw = localStorage.getItem(ADMIN_UI_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return sanitizeAdminUiSettings(parsed);
  } catch {
    return getDefaultAdminUiSettings();
  }
};

export const writeAdminUiSettings = (settings: AdminUiSettings) => {
  if (typeof window === "undefined") return;
  const normalized = sanitizeAdminUiSettings(settings);
  try {
    localStorage.setItem(ADMIN_UI_SETTINGS_KEY, JSON.stringify(normalized));
    localStorage.setItem(
      ADMIN_ACTIVITY_SETTINGS_KEY,
      JSON.stringify({ weekStartsOn: normalized.weekStartsOn, partialDays: normalized.partialDays })
    );
    window.dispatchEvent(new Event("susu-admin-ui-settings"));
  } catch {
    void 0;
  }
};

export const getDefaultPaymentMethods = (): PaymentMethodsConfig => ({
  deposit: [...DEFAULT_PAYMENT_METHODS.deposit],
  withdraw: [...DEFAULT_PAYMENT_METHODS.withdraw]
});

export const readPaymentMethods = (): PaymentMethodsConfig => {
  if (typeof window === "undefined") return getDefaultPaymentMethods();
  try {
    const raw = localStorage.getItem(ADMIN_PAYMENT_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PaymentMethodsConfig>) : null;
    if (!parsed?.deposit || !parsed?.withdraw) return getDefaultPaymentMethods();
    return {
      deposit: parsed.deposit.map(m => ({ ...DEFAULT_PAYMENT_METHODS.deposit.find(d => d.id === m.id), ...m })).filter(Boolean),
      withdraw: parsed.withdraw.map(m => ({ ...DEFAULT_PAYMENT_METHODS.withdraw.find(d => d.id === m.id), ...m })).filter(Boolean)
    };
  } catch {
    return getDefaultPaymentMethods();
  }
};

export const writePaymentMethods = (config: PaymentMethodsConfig) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_PAYMENT_SETTINGS_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("susu-payment-methods"));
  } catch {
    void 0;
  }
};

export const getEnabledPaymentMethods = (type: 'deposit' | 'withdraw'): PaymentMethod[] => {
  const config = readPaymentMethods();
  return config[type].filter(m => m.enabled);
};
