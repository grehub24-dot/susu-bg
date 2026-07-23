export type SusuTargetGroup = "MARKET_WOMEN" | "TAXI_DRIVERS" | "OFFICE_WORKERS" | "GENERAL";

export type SusuGroup = {
  id: string;
  group_name: string;
  group_code: string;
  target_group: SusuTargetGroup;
  max_members: number;
  current_members: number;
  daily_contribution: number;
  status: string;
  created_at: string;
};

export type GroupSummary = {
  id: string;
  group_name: string;
  target_group: SusuTargetGroup;
  active_members: number;
  daily_collection_target: number;
  total_contributions_today: number;
  vault_cash: number;
  loan_portfolio: number;
  status: string;
};

export type RevenueSummary = {
  totalRevenue: number;
  commission: number;
  processingFees: number;
  interest: number;
  insuranceFees: number;
  smsFees: number;
  maintenanceFees: number;
  withdrawalFees: number;
};

/**
 * All API calls go through the Next.js backend proxy at /api/backend/*.
 * This routes server-side to avoid direct browser-to-Render rate limiting.
 */
const API_BASE = "/api/backend";

import { safeFetchJson } from "@/lib/safe-fetch";

export async function fetchSusuGroups(): Promise<SusuGroup[]> {
  const data = await safeFetchJson<{ success: boolean; data?: SusuGroup[]; message?: string }>(
    `${API_BASE}/api/susu/groups`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load Susu groups");
  return data.data || [];
}

export async function createSusuGroup(payload: {
  groupName: string;
  targetGroup: SusuTargetGroup;
  collectorId: string;
  maxMembers?: number;
  dailyContribution?: number;
  cycleDays?: number;
}): Promise<SusuGroup> {
  const data = await safeFetchJson<{ success: boolean; data?: SusuGroup; message?: string }>(
    `${API_BASE}/api/susu/groups`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!data.success) throw new Error(data.message || "Failed to create Susu group");
  return data.data!;
}

export async function fetchGroupSummary(groupId: string): Promise<GroupSummary> {
  const data = await safeFetchJson<{ success: boolean; data?: GroupSummary; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/summary`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load group summary");
  return data.data!;
}

export async function fetchRevenueSummary(groupId: string, startDate: string, endDate: string): Promise<RevenueSummary> {
  const data = await safeFetchJson<{ success: boolean; data?: RevenueSummary; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/revenue?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load revenue summary");
  return data.data!;
}

export async function fetchGroupLiquidity(groupId: string) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/liquidity`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load liquidity");
  return data.data;
}

export async function fetchGroupMembers(groupId: string) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown[]; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/members`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load members");
  return data.data || [];
}

export async function fetchGroupCompliance(groupId: string) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/compliance`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load compliance");
  return data.data;
}

export async function fetchDailyContributions(groupId: string, date: string) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown[]; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/contributions?date=${encodeURIComponent(date)}`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load contributions");
  return data.data || [];
}

export async function recordContribution(payload: {
  membershipId: string;
  amount: number;
  paymentMethod: "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER";
  collectorId: string;
}) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown; message?: string }>(
    `${API_BASE}/api/susu/contributions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!data.success) throw new Error(data.message || "Failed to record contribution");
  return data;
}

export async function fetchGroupLoans(groupId: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await safeFetchJson<{ success: boolean; data?: unknown[]; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/loans${query}`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load loans");
  return data.data || [];
}

export async function applyForLoan(payload: {
  borrowerId: string;
  groupId: string;
  amount: number;
  loanTermDays?: number;
  interestRate?: number;
  guarantor1Id: string;
  guarantor2Id: string;
}) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown; message?: string }>(
    `${API_BASE}/api/susu/loans/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!data.success) throw new Error(data.message || "Failed to apply for loan");
  return data.data;
}

export async function approveLoan(payload: { loanId: string; collectorId: string }) {
  const data = await safeFetchJson<{ success: boolean; message?: string }>(
    `${API_BASE}/api/susu/loans/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!data.success) throw new Error(data.message || "Failed to approve loan");
  return data;
}

export async function disburseLoan(payload: { loanId: string; collectorId: string }) {
  const data = await safeFetchJson<{ success: boolean; message?: string }>(
    `${API_BASE}/api/susu/loans/disburse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!data.success) throw new Error(data.message || "Failed to disburse loan");
  return data;
}

export async function fetchSmsLogs(groupId: string, startDate: string, endDate: string) {
  const data = await safeFetchJson<{ success: boolean; data?: unknown[]; message?: string }>(
    `${API_BASE}/api/susu/groups/${groupId}/sms-logs?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    { cache: "no-store" }
  );
  if (!data.success) throw new Error(data.message || "Failed to load SMS logs");
  return data.data || [];
}
