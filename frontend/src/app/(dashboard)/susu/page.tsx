"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  DollarSign, 
  Shield, 
  Phone, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  PiggyBank
} from "lucide-react";

interface SusuGroup {
  id: string;
  group_name: string;
  group_code: string;
  target_group: string;
  max_members: number;
  current_members: number;
  daily_contribution: number;
  status: string;
  created_at: string;
}

interface GroupSummary {
  id: string;
  group_name: string;
  target_group: string;
  active_members: number;
  daily_collection_target: number;
  total_contributions_today: number;
  vault_cash: number;
  loan_portfolio: number;
  status: string;
}

interface RevenueSummary {
  totalRevenue: number;
  commission: number;
  processingFees: number;
  interest: number;
  insuranceFees: number;
  smsFees: number;
  maintenanceFees: number;
  withdrawalFees: number;
}

export default function SusuDashboard() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'loans' | 'revenue'>('overview');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupSummary(selectedGroup);
      loadRevenueSummary(selectedGroup);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      if (!backendUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
      const response = await fetch(`${backendUrl}/api/susu/groups`);
      const data = await response.json();
      if (data.success) {
        setGroups(data.data);
        if (data.data.length > 0 && !selectedGroup) {
          setSelectedGroup(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupSummary = async (groupId: string) => {
    try {
      if (!backendUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
      const response = await fetch(`${backendUrl}/api/susu/groups/${groupId}/summary`);
      const data = await response.json();
      if (data.success) {
        setGroupSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to load group summary');
    }
  };

  const loadRevenueSummary = async (groupId: string) => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      if (!backendUrl) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
      const response = await fetch(`${backendUrl}/api/susu/groups/${groupId}/revenue?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      if (data.success) {
        setRevenueSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to load revenue summary');
    }
  };

  const getTargetGroupLabel = (targetGroup: string) => {
    const labels = {
      'MARKET_WOMEN': 'Market Women',
      'TAXI_DRIVERS': 'Taxi Drivers', 
      'OFFICE_WORKERS': 'Office Workers',
      'GENERAL': 'General'
    };
    return labels[targetGroup as keyof typeof labels] || targetGroup;
  };

  const getTargetGroupIcon = (targetGroup: string) => {
    switch (targetGroup) {
      case 'MARKET_WOMEN': return <Users className="h-5 w-5" />;
      case 'TAXI_DRIVERS': return <Phone className="h-5 w-5" />;
      case 'OFFICE_WORKERS': return <FileText className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a8d5ba] mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading Susu dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Susu Management</h1>
            <p className="text-zinc-600 mt-1">Modern cooperative savings and lending platform</p>
          </div>
          <Link href="/dashboard" className="text-sm text-[#d4af37]">
            Back to Dashboard
          </Link>
        </div>

        {/* Group Selection */}
        {groups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="mb-2 block text-sm font-medium">Select Group</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`rounded-xl p-4 text-left border-2 transition-all ${
                    selectedGroup === group.id
                      ? 'border-[#a8d5ba] bg-[#a8d5ba] bg-opacity-10'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${
                      selectedGroup === group.id ? 'bg-[#a8d5ba] text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {getTargetGroupIcon(group.target_group)}
                    </div>
                    <div>
                      <p className="font-medium">{group.group_name}</p>
                      <p className="text-sm text-zinc-600">{group.group_code}</p>
                      <p className="text-xs text-zinc-500">{getTargetGroupLabel(group.target_group)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedGroup && groupSummary && (
          <>
            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div className="rounded-xl bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-8 w-8 text-[#a8d5ba]" />
                  <span className="text-xs text-zinc-500">Active</span>
                </div>
                <p className="text-2xl font-bold">{groupSummary.active_members}</p>
                <p className="text-sm text-zinc-600">Members</p>
                <p className="text-xs text-zinc-500 mt-1">of {groupSummary.active_members} target</p>
              </div>

              <div className="rounded-xl bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <span className="text-xs text-zinc-500">Today</span>
                </div>
                <p className="text-2xl font-bold">GHS {groupSummary.total_contributions_today.toFixed(2)}</p>
                <p className="text-sm text-zinc-600">Daily Collections</p>
                <p className="text-xs text-zinc-500 mt-1">Target: GHS {groupSummary.daily_collection_target.toFixed(2)}</p>
              </div>

              <div className="rounded-xl bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <span className="text-xs text-zinc-500">20% Rule</span>
                </div>
                <p className="text-2xl font-bold">GHS {groupSummary.vault_cash.toFixed(2)}</p>
                <p className="text-sm text-zinc-600">Vault Cash</p>
                <p className="text-xs text-zinc-500 mt-1">Liquid reserves</p>
              </div>

              <div className="rounded-xl bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <span className="text-xs text-zinc-500">80% Rule</span>
                </div>
                <p className="text-2xl font-bold">GHS {groupSummary.loan_portfolio.toFixed(2)}</p>
                <p className="text-sm text-zinc-600">Loan Portfolio</p>
                <p className="text-xs text-zinc-500 mt-1">Available for lending</p>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex gap-2 border-b border-zinc-200">
                {[
                  { id: 'overview', label: 'Overview', icon: <Target className="h-4 w-4" /> },
                  { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
                  { id: 'loans', label: 'Loans', icon: <DollarSign className="h-4 w-4" /> },
                  { id: 'revenue', label: 'Revenue', icon: <TrendingUp className="h-4 w-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#a8d5ba] text-[#a8d5ba]'
                        : 'border-transparent text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {activeTab === 'overview' && (
                <>
                  {/* 31st Day Revenue Model */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                      <PiggyBank className="h-5 w-5 text-[#a8d5ba]" />
                      31st Day Revenue Model
                    </h2>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-[#f8f9fa] p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Silver Tier</span>
                          <span className="text-sm text-zinc-600">1 day's contribution</span>
                        </div>
                        <p className="text-sm text-zinc-600 mt-1">Traditional model - collector keeps 31st day</p>
                      </div>
                      <div className="rounded-xl bg-[#f8f9fa] p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Gold Tier</span>
                          <span className="text-sm text-zinc-600">GH¢15-20/month</span>
                        </div>
                        <p className="text-sm text-zinc-600 mt-1">No commission taken, flat maintenance fee</p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Sources */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Revenue Sources
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50">
                        <span className="text-sm">Commission (31st day)</span>
                        <span className="font-medium">GHS {(groupSummary.daily_collection_target * 0.03).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50">
                        <span className="text-sm">SMS Subscription</span>
                        <span className="font-medium">GHS {(groupSummary.active_members * 5).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50">
                        <span className="text-sm">Loan Interest (5% avg)</span>
                        <span className="font-medium">GHS {(groupSummary.loan_portfolio * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50">
                        <span className="text-sm">Processing Fees</span>
                        <span className="font-medium">GHS 20.00/application</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'members' && (
                <>
                  {/* Member Management */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold">Member Management</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 rounded-xl border border-zinc-200">
                        <div>
                          <p className="font-medium">Active Members</p>
                          <p className="text-sm text-zinc-600">Currently contributing</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{groupSummary.active_members}</p>
                          <p className="text-xs text-zinc-500">of {groupSummary.active_members} max</p>
                        </div>
                      </div>
                      <button className="w-full rounded-xl bg-[#a8d5ba] px-4 py-3 font-medium text-white">
                        Add New Member
                      </button>
                      <button className="w-full rounded-xl border border-zinc-200 px-4 py-3 font-medium">
                        View All Members
                      </button>
                    </div>
                  </div>

                  {/* Compliance Status */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Compliance Status
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">AML Compliant</p>
                          <p className="text-sm text-green-700">All members have Ghana Card details</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">GCSCA Registered</p>
                          <p className="text-sm text-blue-700">Association membership active</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Tier 4 Classification</p>
                          <p className="text-sm text-green-700">BoG compliant microfinance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'loans' && (
                <>
                  {/* Loan Portfolio */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold">Loan Portfolio</h2>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-[#f8f9fa] p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Available for Lending</span>
                          <span className="text-sm text-zinc-600">80% of deposits</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">GHS {groupSummary.loan_portfolio.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Interest Rate</span>
                          <span className="font-medium">3-7% monthly</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Processing Fee</span>
                          <span className="font-medium">GH¢15-30</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Insurance Fee</span>
                          <span className="font-medium">1% of loan</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Loan Terms</span>
                          <span className="font-medium">30-90 days</span>
                        </div>
                      </div>
                      <button className="w-full rounded-xl bg-[#a8d5ba] px-4 py-3 font-medium text-white">
                        View Loan Applications
                      </button>
                    </div>
                  </div>

                  {/* P2P Guarantee System */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      P2P Guarantee System
                    </h2>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-purple-50 p-4">
                        <p className="font-medium text-purple-900 mb-2">Social Collateral Model</p>
                        <p className="text-sm text-purple-700">Each loan requires 2 active guarantors from the group</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Guarantors must have 30+ days contribution history</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Default recovery from guarantor payouts</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Reduced risk through social pressure</span>
                        </div>
                      </div>
                      <button className="w-full rounded-xl border border-zinc-200 px-4 py-3 font-medium">
                        Manage Guarantees
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'revenue' && revenueSummary && (
                <>
                  {/* Revenue Summary */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold">Monthly Revenue Summary</h2>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-green-50 p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-900">Total Revenue</span>
                          <span className="text-2xl font-bold text-green-600">GHS {revenueSummary.totalRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Commission (31st day)</span>
                          <span className="font-medium">GHS {revenueSummary.commission.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Processing Fees</span>
                          <span className="font-medium">GHS {revenueSummary.processingFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">Loan Interest</span>
                          <span className="font-medium">GHS {revenueSummary.interest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600">SMS Fees</span>
                          <span className="font-medium">GHS {revenueSummary.smsFees.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Potential */}
                  <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="mb-4 text-lg font-semibold">Revenue Potential</h2>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-[#f8f9fa] p-4">
                        <p className="font-medium mb-2">With 100 clients @ GHS 10 daily:</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Susu Commission:</span>
                            <span className="font-medium">GHS 1,000/month</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SMS Fees:</span>
                            <span className="font-medium">GHS 500/month</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Loan Interest:</span>
                            <span className="font-medium">GHS 750/month</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-medium">Total Potential:</span>
                            <span className="font-bold text-green-600">GHS 2,250+/month</span>
                          </div>
                        </div>
                      </div>
                      <button className="w-full rounded-xl bg-[#a8d5ba] px-4 py-3 font-medium text-white">
                        Download Revenue Report
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}

        {/* No Groups */}
        {!loading && groups.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <PiggyBank className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No Susu Groups Yet</h3>
            <p className="text-zinc-600 mb-6">Create your first Susu group to start managing cooperative savings</p>
            <button className="rounded-xl bg-[#a8d5ba] px-6 py-3 font-medium text-white">
              Create Susu Group
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
