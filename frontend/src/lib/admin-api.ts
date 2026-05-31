// Admin API Helper Functions for CRUD operations
// These functions connect the frontend to the backend admin endpoints

const ADMIN_API_BASE = "/api/admin-proxy";

type AdminPayload = Record<string, unknown>;

// Generic fetch wrapper for admin API
async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const base = (ADMIN_API_BASE || "/api/admin-proxy").replace(/\/+$/, "");
  const path = "/" + (endpoint || "").replace(/^\/+|\/+$/g, "");
  const url = `${base}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

// ==================== USERS ====================
export const adminUsers = {
  list: () => adminFetch("users"),
  get: (userId: string) => adminFetch(`users/${userId}`),
  getTransactions: (userId: string) => adminFetch(`users/${userId}/transactions`),
  create: (data: AdminPayload) => adminFetch("users", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (userId: string, data: AdminPayload) => adminFetch(`users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (userId: string) => adminFetch(`users/${userId}`, {
    method: "DELETE",
  }),
};

// ==================== WALLETS ====================
export const adminWallets = {
  list: (params?: { userId?: string }) => {
    const query = params?.userId ? `?userId=${params.userId}` : "";
    return adminFetch(`wallets${query}`);
  },
  get: (walletId: string) => adminFetch(`wallets/${walletId}`),
  create: (data: AdminPayload) => adminFetch("wallets", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (walletId: string, data: AdminPayload) => adminFetch(`wallets/${walletId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (walletId: string) => adminFetch(`wallets/${walletId}`, {
    method: "DELETE",
  }),
};

// ==================== TRANSACTIONS ====================
export const adminTransactions = {
  list: () => adminFetch("transactions"),
  get: (transactionId: string) => adminFetch(`transactions/${transactionId}`),
  create: (data: AdminPayload) => adminFetch("transactions", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (transactionId: string, data: AdminPayload) => adminFetch(`transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (transactionId: string) => adminFetch(`transactions/${transactionId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU GROUPS ====================
export const adminSusuGroups = {
  list: (params?: { targetGroup?: string; collectorId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.targetGroup) queryParams.set("targetGroup", params.targetGroup);
    if (params?.collectorId) queryParams.set("collectorId", params.collectorId);
    const query = queryParams.toString();
    return adminFetch(`susu/groups${query ? `?${query}` : ""}`);
  },
  get: (groupId: string) => adminFetch(`susu/groups/${groupId}`),
  getMembers: (groupId: string) => adminFetch(`susu/groups/${groupId}/members`),
  getContributions: (groupId: string, params?: { date?: string }) => {
    const query = params?.date ? `?date=${params.date}` : "";
    return adminFetch(`susu/groups/${groupId}/contributions${query}`);
  },
  getLoans: (groupId: string, params?: { status?: string }) => {
    const query = params?.status ? `?status=${params.status}` : "";
    return adminFetch(`susu/groups/${groupId}/loans${query}`);
  },
  getPayouts: (groupId: string, params?: { date?: string; membershipId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.set("date", params.date);
    if (params?.membershipId) queryParams.set("membershipId", params.membershipId);
    const query = queryParams.toString();
    return adminFetch(`susu/groups/${groupId}/payouts${query ? `?${query}` : ""}`);
  },
  create: (data: AdminPayload) => adminFetch("susu/groups", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (groupId: string, data: AdminPayload) => adminFetch(`susu/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (groupId: string) => adminFetch(`susu/groups/${groupId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU MEMBERSHIPS ====================
export const adminSusuMemberships = {
  create: (data: AdminPayload) => adminFetch("susu/memberships", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (membershipId: string, data: AdminPayload) => adminFetch(`susu/memberships/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (membershipId: string) => adminFetch(`susu/memberships/${membershipId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU CONTRIBUTIONS ====================
export const adminSusuContributions = {
  create: (data: AdminPayload) => adminFetch("susu/contributions", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (contributionId: string, data: AdminPayload) => adminFetch(`susu/contributions/${contributionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (contributionId: string) => adminFetch(`susu/contributions/${contributionId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU LOANS ====================
export const adminSusuLoans = {
  create: (data: AdminPayload) => adminFetch("susu/loans", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (loanId: string, data: AdminPayload) => adminFetch(`susu/loans/${loanId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (loanId: string) => adminFetch(`susu/loans/${loanId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU PAYOUTS ====================
export const adminSusuPayouts = {
  create: (data: AdminPayload) => adminFetch("susu/payouts", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (payoutId: string, data: AdminPayload) => adminFetch(`susu/payouts/${payoutId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (payoutId: string) => adminFetch(`susu/payouts/${payoutId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU CYCLES ====================
export const adminSusuCycles = {
  list: (params?: { groupId?: string }) => {
    const query = params?.groupId ? `?groupId=${params.groupId}` : "";
    return adminFetch(`susu/cycles${query}`);
  },
  create: (data: AdminPayload) => adminFetch("susu/cycles", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (cycleId: string, data: AdminPayload) => adminFetch(`susu/cycles/${cycleId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (cycleId: string) => adminFetch(`susu/cycles/${cycleId}`, {
    method: "DELETE",
  }),
};

// ==================== SUSU FEES ====================
export const adminSusuFees = {
  list: (params?: { groupId?: string }) => {
    const query = params?.groupId ? `?groupId=${params.groupId}` : "";
    return adminFetch(`susu/fees${query}`);
  },
  create: (data: AdminPayload) => adminFetch("susu/fees", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (feeId: string, data: AdminPayload) => adminFetch(`susu/fees/${feeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (feeId: string) => adminFetch(`susu/fees/${feeId}`, {
    method: "DELETE",
  }),
};

// ==================== TELLERS ====================
export const adminTellers = {
  list: () => adminFetch("tellers"),
  get: (tellerId: string) => adminFetch(`tellers/${tellerId}`),
  create: (data: AdminPayload) => adminFetch("tellers", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (tellerId: string, data: AdminPayload) => adminFetch(`tellers/${tellerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (tellerId: string) => adminFetch(`tellers/${tellerId}`, {
    method: "DELETE",
  }),
};

// ==================== BRANCHES ====================
export const adminBranches = {
  list: () => adminFetch("branches"),
  get: (branchId: string) => adminFetch(`branches/${branchId}`),
  create: (data: AdminPayload) => adminFetch("branches", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (branchId: string, data: AdminPayload) => adminFetch(`branches/${branchId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (branchId: string) => adminFetch(`branches/${branchId}`, {
    method: "DELETE",
  }),
};

// ==================== COMPLIANCE FLAGS ====================
export const adminCompliance = {
  dashboard: () => adminFetch("compliance/dashboard"),
  flags: (params?: { flagType?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.flagType) queryParams.set("flagType", params.flagType);
    if (params?.status) queryParams.set("status", params.status);
    const query = queryParams.toString();
    return adminFetch(`compliance/flags${query ? `?${query}` : ""}`);
  },
  getFlag: (flagId: string) => adminFetch(`compliance/flags/${flagId}`),
  createFlag: (data: AdminPayload) => adminFetch("compliance/flags", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  deleteFlag: (flagId: string) => adminFetch(`compliance/flags/${flagId}`, {
    method: "DELETE",
  }),
  markAsReported: (flagId: string) => adminFetch(`compliance/flags/${flagId}/report`, {
    method: "PATCH",
  }),
  resolve: (flagId: string, data: { resolutionNotes: string }) => adminFetch(`compliance/flags/${flagId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  getCTRReport: (params?: { startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set("startDate", params.startDate);
    if (params?.endDate) queryParams.set("endDate", params.endDate);
    const query = queryParams.toString();
    return adminFetch(`compliance/ctr${query ? `?${query}` : ""}`);
  },
  getSTRReport: (params?: { startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set("startDate", params.startDate);
    if (params?.endDate) queryParams.set("endDate", params.endDate);
    const query = queryParams.toString();
    return adminFetch(`compliance/str${query ? `?${query}` : ""}`);
  },
};

// ==================== REVENUE LEDGER ====================
export const adminRevenue = {
  ledger: (params?: { category?: string }) => {
    const query = params?.category ? `?category=${params.category}` : "";
    return adminFetch(`revenue/ledger${query}`);
  },
  createEntry: (data: AdminPayload) => adminFetch("revenue/entries", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateEntry: (entryId: string, data: AdminPayload) => adminFetch(`revenue/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  deleteEntry: (entryId: string) => adminFetch(`revenue/entries/${entryId}`, {
    method: "DELETE",
  }),
};

// ==================== RECEIPTS ====================
export const adminReceipts = {
  list: () => adminFetch("receipts"),
  create: (data: AdminPayload) => adminFetch("receipts", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (receiptId: string, data: AdminPayload) => adminFetch(`receipts/${receiptId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (receiptId: string) => adminFetch(`receipts/${receiptId}`, {
    method: "DELETE",
  }),
};

// ==================== AUDIT LOGS ====================
export const adminAuditLogs = {
  list: (params?: { userId?: string; action?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.set("userId", params.userId);
    if (params?.action) queryParams.set("action", params.action);
    const query = queryParams.toString();
    return adminFetch(`audit-logs${query ? `?${query}` : ""}`);
  },
  create: (data: AdminPayload) => adminFetch("audit-logs", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};

// ==================== SMS LOGS ====================
export const adminSMSLogs = {
  list: (params?: { userId?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.set("userId", params.userId);
    if (params?.status) queryParams.set("status", params.status);
    const query = queryParams.toString();
    return adminFetch(`sms-logs${query ? `?${query}` : ""}`);
  },
  create: (data: AdminPayload) => adminFetch("sms-logs", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (logId: string, data: AdminPayload) => adminFetch(`sms-logs/${logId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  delete: (logId: string) => adminFetch(`sms-logs/${logId}`, {
    method: "DELETE",
  }),
};

// ==================== SUMMARY & REPORTS ====================
export const adminSummary = {
  get: () => adminFetch("summary"),
  emailLogs: (params?: { limit?: number; offset?: number; q?: string; status?: string; emailType?: string; userId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    if (params?.q) queryParams.set("q", params.q);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.emailType) queryParams.set("emailType", params.emailType);
    if (params?.userId) queryParams.set("userId", params.userId);
    const query = queryParams.toString();
    return adminFetch(`email-logs${query ? `?${query}` : ""}`);
  },
  sendEmail: (data: AdminPayload) => adminFetch("messages/email", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  approveKYC: (userId: string) => adminFetch(`kyc/${userId}/approve`, {
    method: "PATCH",
  }),
  health: () => adminFetch("health"),
};

// Export all as a single object for convenience
export const adminAPI = {
  users: adminUsers,
  wallets: adminWallets,
  transactions: adminTransactions,
  susuGroups: adminSusuGroups,
  susuMemberships: adminSusuMemberships,
  susuContributions: adminSusuContributions,
  susuLoans: adminSusuLoans,
  susuPayouts: adminSusuPayouts,
  susuCycles: adminSusuCycles,
  susuFees: adminSusuFees,
  tellers: adminTellers,
  branches: adminBranches,
  compliance: adminCompliance,
  revenue: adminRevenue,
  receipts: adminReceipts,
  auditLogs: adminAuditLogs,
  smsLogs: adminSMSLogs,
  summary: adminSummary,
};
