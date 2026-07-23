const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  
  // Check cookie first
  const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("admin_session_token="));
  if (hasCookie) {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("admin_session_token="));
    if (cookie) {
      return cookie.split("=")[1];
    }
  }
  
  // Fall back to staff_session
  const staffSession = localStorage.getItem("staff_session");
  if (staffSession) {
    try {
      const parsed = JSON.parse(staffSession);
      return parsed.token || null;
    } catch {
      return null;
    }
  }
  
  return null;
};

export interface RequestOptions {
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

class AdminClient {
  private baseUrl: string;
  private defaultRetries = 3;
  private defaultRetryDelay = 1000;

  constructor() {
    this.baseUrl = "/api/backend";
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    let path = `${this.baseUrl}/api/admin${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      const qs = searchParams.toString();
      if (qs) path += `?${qs}`;
    }
    return path;
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number = this.defaultRetries,
    retryDelay: number = this.defaultRetryDelay
  ): Promise<ApiResponse<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            "Content-Type": "application/json",
          },
        });

        // Handle 401 - try to refresh or re-authenticate
        if (response.status === 401) {
          // For now, return the error - could implement token refresh here
          const data = await response.json().catch(() => ({}));
          return { success: false, message: data.message || "Unauthorized" };
        }

        // Handle 429 - rate limited, wait and retry
        if (response.status === 429 && attempt < retries) {
          const retryAfter = response.headers.get("Retry-After");
          await this.delay(retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * 2);
          continue;
        }

        const data = await response.json().catch(() => ({})) as ApiResponse<T>;
        
        if (!response.ok) {
          return { 
            success: false, 
            message: data.message || `Request failed with status ${response.status}` 
          };
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on abort
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        
        if (attempt < retries) {
          // Exponential backoff
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    return { 
      success: false, 
      message: lastError?.message || "Network error - please check your connection" 
    };
  }

  private getHeaders(): Record<string, string> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["x-admin-session-token"] = token;
    }
    
    return headers;
  }

  async get<T = unknown>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries, signal, params } = options;
    const url = this.buildUrl(endpoint, params);
    
    return this.fetchWithRetry<T>(url, {
      method: "GET",
      headers: this.getHeaders(),
      signal,
    }, retries, 1000);
  }

  async post<T = unknown>(
    endpoint: string, 
    data: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries, signal, params } = options;
    const url = this.buildUrl(endpoint, params);
    
    return this.fetchWithRetry<T>(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      signal,
    }, retries, 1000);
  }

  async patch<T = unknown>(
    endpoint: string, 
    data: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries, signal, params } = options;
    const url = this.buildUrl(endpoint, params);
    
    return this.fetchWithRetry<T>(url, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      signal,
    }, retries, 1000);
  }

  async delete<T = unknown>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retries, signal, params } = options;
    const url = this.buildUrl(endpoint, params);
    
    return this.fetchWithRetry<T>(url, {
      method: "DELETE",
      headers: this.getHeaders(),
      signal,
    }, retries, 1000);
  }
}

// Singleton instance
export const adminClient = new AdminClient();

// Convenience methods
export const adminApi = {
  // Users
  users: {
    list: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/users", { params }),
    get: (userId: string) => 
      adminClient.get(`/users/${userId}`),
    create: (data: unknown) => 
      adminClient.post("/users", data),
    update: (userId: string, data: unknown) => 
      adminClient.patch(`/users/${userId}`, data),
    delete: (userId: string) => 
      adminClient.delete(`/users/${userId}`),
  },

  // Transactions
  transactions: {
    list: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/transactions", { params }),
    get: (transactionId: string) => 
      adminClient.get(`/transactions/${transactionId}`),
    create: (data: unknown) => 
      adminClient.post("/transactions", data),
    update: (transactionId: string, data: unknown) => 
      adminClient.patch(`/transactions/${transactionId}`, data),
    delete: (transactionId: string) => 
      adminClient.delete(`/transactions/${transactionId}`),
  },

  // Staff
  staff: {
    list: () => adminClient.get("/staff-management/staff"),
    get: (id: string) => adminClient.get(`/staff-management/staff/${id}`),
    create: (data: unknown) => adminClient.post("/staff-management/staff", data),
    update: (id: string, data: unknown) => adminClient.patch(`/staff-management/staff/${id}`, data),
    delete: (id: string) => adminClient.delete(`/staff-management/staff/${id}`),
    toggleStatus: (id: string, status: string) => adminClient.patch(`/staff-management/staff/${id}/status`, { status }),
    changeRole: (id: string, role: string) => adminClient.patch(`/staff-management/staff/${id}/role`, { role }),
    lock: (id: string) => adminClient.patch(`/staff-management/staff/${id}/lock`),
    unlock: (id: string) => adminClient.patch(`/staff-management/staff/${id}/unlock`),
    resetPassword: (id: string, newPassword: string) => adminClient.post(`/staff-management/staff/${id}/reset-password`, { newPassword }),
    getAuditLogs: (id: string) => adminClient.get(`/staff-management/staff/${id}/audit-logs`),
    getSessions: (id: string) => adminClient.get(`/staff-management/staff/${id}/sessions`),
    getFailedAttempts: () => adminClient.get("/staff-management/staff/failed-attempts"),
    getActiveSessions: () => adminClient.get("/staff-management/sessions"),
    revokeSession: (sessionId: string) => adminClient.post(`/staff-management/sessions/${sessionId}/revoke`),
  },

  // Groups
  groups: {
    list: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/susu/groups", { params }),
    get: (groupId: string) => adminClient.get(`/susu/groups/${groupId}`),
    create: (data: unknown) => adminClient.post("/susu/groups", data),
    update: (groupId: string, data: unknown) => 
      adminClient.patch(`/susu/groups/${groupId}`, data),
    delete: (groupId: string) => adminClient.delete(`/susu/groups/${groupId}`),
  },

  // Tellers
  tellers: {
    list: () => adminClient.get("/tellers"),
    get: (tellerId: string) => adminClient.get(`/tellers/${tellerId}`),
    create: (data: unknown) => adminClient.post("/tellers", data),
    update: (tellerId: string, data: unknown) => 
      adminClient.patch(`/tellers/${tellerId}`, data),
    delete: (tellerId: string) => adminClient.delete(`/tellers/${tellerId}`),
  },

  // Summary
  summary: {
    get: () => adminClient.get("/summary"),
  },

  // Revenue
  revenue: {
    ledger: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/revenue/ledger", { params }),
  },

  // Compliance
  compliance: {
    dashboard: () => adminClient.get("/compliance/dashboard"),
    flags: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/compliance/flags", { params }),
    createFlag: (data: unknown) => adminClient.post("/compliance/flags", data),
    deleteFlag: (flagId: string) => adminClient.delete(`/compliance/flags/${flagId}`),
  },

  // KYC
  kyc: {
    approve: (userId: string) => adminClient.patch(`/kyc/${userId}/approve`, {}),
  },

  // Ledger
  ledger: {
    list: (params?: Record<string, string | number | boolean>) => 
      adminClient.get("/ledger", { params }),
  },
};