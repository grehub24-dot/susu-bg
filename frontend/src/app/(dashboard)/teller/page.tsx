"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, User, Wallet, Receipt, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, LogOut, Lock, Smartphone } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  risk_rating?: string;
  pep_status?: boolean;
  kyc_status?: string;
  wallet: {
    id: string;
    balance: number;
    currency: string;
    status?: string;
    daily_limit?: number;
    monthly_limit?: number;
  } | null;
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  status: "SUCCESS" | "FAILED" | "PENDING";
  created_at: string;
  metadata: any;
  wallets: {
    users: {
      full_name: string;
      phone_number: string;
    };
  };
}

interface DailySummary {
  totalTransactions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  successfulTransactions: number;
  failedTransactions: number;
}

interface TellerSession {
  id: string;
  tellerId: string;
  tellerCode: string;
  fullName: string;
  branchId: string;
  branchName: string;
  dailyLimit: number;
  currentCashPosition: number;
  expiresAt: string;
}

export default function TellerPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<TellerSession | null>(null);
  const [loginForm, setLoginForm] = useState({ tellerCode: "", password: "" });
  const [operationType, setOperationType] = useState<"deposit" | "withdrawal">("deposit");
  const [clientIdentifier, setClientIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const backendUrl = "/api/backend";

  // Check for existing session on mount
  useEffect(() => {
    validateSession();
  }, []);

  const validateSession = async () => {
    try {
      const response = await fetch("/api/teller-session", {
        credentials: "same-origin"
      });
      const data = await response.json();
      if (data.success && data.session) {
        setSession(data.session);
        setIsLoggedIn(true);
        loadTellerData(data.session.tellerId);
      }
    } catch (error) {
      console.error("Session validation failed");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${backendUrl}/api/teller/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();

      if (data.success) {
        setSession(data.session.teller);
        setIsLoggedIn(true);
        setMessage("Login successful");
        loadTellerData(data.session.teller.id);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${backendUrl}/api/teller/logout`, {
        method: "POST",
        credentials: "include"
      });
      setSession(null);
      setIsLoggedIn(false);
      setRecentTransactions([]);
      setDailySummary(null);
      setMessage("Logged out successfully");
    } catch (error) {
      console.error("Logout failed");
    }
  };

  const loadTellerData = (tellerId: string) => {
    loadRecentTransactions(tellerId);
    loadDailySummary(tellerId);
  };

  const searchClient = async () => {
    if (!clientIdentifier.trim()) return;
    
    setSearchingClient(true);
    setSelectedClient(null);
    setMessage("");

    try {
      
      const response = await fetch(
        `${backendUrl}/api/teller/client?identifier=${encodeURIComponent(clientIdentifier)}`,
        session?.id ? { headers: { "x-session-id": session.id } } : undefined
      );
      const data = await response.json();

      if (data.success) {
        setSelectedClient(data.client);
        setMessage(`Client found: ${data.client.full_name}`);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Failed to search for client");
    } finally {
      setSearchingClient(false);
    }
  };

  const processTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setMessage("Please search and select a client first");
      return;
    }

    if (!session) {
      setMessage("Missing teller session. Please login again.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const endpoint = operationType === "deposit" ? `${backendUrl}/api/teller/deposit` : `${backendUrl}/api/teller/withdrawal`;
      const payload = operationType === "deposit" 
        ? {
            clientId: selectedClient.wallet?.id,
            amount: parseFloat(amount),
            tellerId: session.tellerId,
            paymentMethod
          }
        : {
            clientId: selectedClient.wallet?.id,
            amount: parseFloat(amount),
            tellerId: session.tellerId,
            pin,
            paymentMethod
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.id ? { "x-session-id": session.id } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`${operationType.charAt(0).toUpperCase() + operationType.slice(1)} successful! Reference: ${data.reference}`);
        // Clear form
        setAmount("");
        setPin("");
        setSelectedClient(null);
        setClientIdentifier("");
        // Refresh transactions and session (cash position updated)
        loadTellerData(session.tellerId);
        validateSession();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage(`Failed to process ${operationType}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTransactions = async (tellerId: string) => {
    try {
      if (!backendUrl) return;
      const sessionId = localStorage.getItem("teller_session_id");
      const response = await fetch(
        `${backendUrl}/api/teller/transactions?tellerId=${tellerId}&limit=10`,
        sessionId ? { headers: { "x-session-id": sessionId } } : undefined
      );
      const data = await response.json();
      if (data.success) {
        setRecentTransactions(data.data);
      }
    } catch (error) {
      console.error("Failed to load transactions");
    }
  };

  const loadDailySummary = async (tellerId: string) => {
    try {
      if (!backendUrl) return;
      const sessionId = localStorage.getItem("teller_session_id");
      const response = await fetch(
        `${backendUrl}/api/teller/summary?tellerId=${tellerId}`,
        sessionId ? { headers: { "x-session-id": sessionId } } : undefined
      );
      const data = await response.json();
      if (data.success) {
        setDailySummary(data.data);
      }
    } catch (error) {
      console.error("Failed to load summary");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Teller Operations</h1>
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-zinc-600">{session?.fullName}</span>
                <span className="mx-2 text-zinc-400">|</span>
                <span className="text-zinc-600">{session?.branchName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium hover:bg-zinc-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
          {!isLoggedIn && (
            <Link href="/dashboard" className="text-sm text-[#d4af37]">
              Back to Dashboard
            </Link>
          )}
        </div>

        {/* Login Form */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md"
          >
            <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="mb-6 flex items-center justify-center">
                <Lock className="h-12 w-12 text-[#d4af37]" />
              </div>
              <h2 className="mb-2 text-center text-xl font-semibold">Teller Login</h2>
              <p className="mb-6 text-center text-sm text-zinc-600">Enter your teller credentials to access the terminal</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Teller Code</label>
                  <input
                    type="text"
                    value={loginForm.tellerCode}
                    onChange={(e) => setLoginForm({ ...loginForm, tellerCode: e.target.value })}
                    placeholder="Enter your teller code"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
                    required
                  />
                </div>
                {message && (
                  <p className={`text-sm font-medium ${message.includes("successful") ? "text-green-600" : "text-red-600"}`}>
                    {message}
                  </p>
                )}
                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-[#2d3436] px-4 py-3 font-medium text-white disabled:opacity-50"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Teller Terminal */}
        {isLoggedIn && session && (
          <div>
            {/* Session Info */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl bg-white p-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-zinc-600">Daily Limit</p>
                  <p className="font-semibold">GHS {session.dailyLimit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600">Cash Position</p>
                  <p className="font-semibold text-[#d4af37]">GHS {session.currentCashPosition.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600">Session Expires</p>
                  <p className="font-semibold">{new Date(session.expiresAt).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600">Branch</p>
                  <p className="font-semibold">{session.branchName}</p>
                </div>
                <div>
                  <Link href="/teller/ghanapay">
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-[#A8D5BA] px-3 py-2 text-sm font-medium text-white hover:bg-[#8fc4a3]">
                      <Smartphone size={14} />
                      GhanaPay Verify
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Daily Summary */}
            {dailySummary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4"
              >
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-sm text-zinc-600">Total Transactions</p>
                  <p className="text-xl font-semibold">{dailySummary.totalTransactions}</p>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-sm text-zinc-600">Deposits</p>
                  <p className="text-xl font-semibold text-green-600">GHS {dailySummary.totalDeposits.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-sm text-zinc-600">Withdrawals</p>
                  <p className="text-xl font-semibold text-red-600">GHS {dailySummary.totalWithdrawals.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-sm text-zinc-600">Successful</p>
                  <p className="text-xl font-semibold text-green-600">{dailySummary.successfulTransactions}</p>
                </div>
                <div className="rounded-xl bg-white p-4 text-center">
                  <p className="text-sm text-zinc-600">Failed</p>
                  <p className="text-xl font-semibold text-red-600">{dailySummary.failedTransactions}</p>
                </div>
              </motion.div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Transaction Form */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                <div className="mb-6 flex gap-4">
                  <button
                    onClick={() => setOperationType("deposit")}
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      operationType === "deposit"
                        ? "bg-[#2d3436] text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setOperationType("withdrawal")}
                    className={`rounded-xl px-4 py-2 text-sm font-medium ${
                      operationType === "withdrawal"
                        ? "bg-[#2d3436] text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    Withdrawal
                  </button>
                </div>

                <form onSubmit={processTransaction} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Client Search</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clientIdentifier}
                        onChange={(e) => setClientIdentifier(e.target.value)}
                        placeholder="Phone, email, or user ID"
                        className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#a8d5ba]"
                      />
                      <button
                        type="button"
                        onClick={searchClient}
                        disabled={searchingClient}
                        className="rounded-xl bg-[#a8d5ba] px-4 py-3 text-white disabled:opacity-50"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {selectedClient && (
                    <div className="rounded-xl bg-[#f8f9fa] p-4">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-[#a8d5ba]" />
                        <div>
                          <p className="font-medium">{selectedClient.full_name}</p>
                          <p className="text-sm text-zinc-600">{selectedClient.phone_number}</p>
                          {selectedClient.wallet && (
                            <p className="text-sm text-[#d4af37]">Balance: GHS {selectedClient.wallet.balance.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}