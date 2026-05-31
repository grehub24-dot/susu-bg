"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, DollarSign, Shield, TrendingUp, Wallet } from "lucide-react";
import {
  fetchGroupLiquidity,
  fetchGroupSummary,
  fetchRevenueSummary,
  fetchSusuGroups,
  type GroupSummary,
  type RevenueSummary,
  type SusuGroup
} from "@/lib/susu-api";

export default function SusuReportsPage() {
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [summary, setSummary] = useState<GroupSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [liquidity, setLiquidity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchSusuGroups();
        setGroups(list);
        if (!groupId && list[0]?.id) setGroupId(list[0].id);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      setLoading(true);
      try {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const endDate = new Date().toISOString().slice(0, 10);
        const [s, r, l] = await Promise.all([
          fetchGroupSummary(groupId),
          fetchRevenueSummary(groupId, startDate, endDate),
          fetchGroupLiquidity(groupId)
        ]);
        setSummary(s);
        setRevenue(r);
        setLiquidity(l);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [groupId]);

  const liquidityRatio = useMemo(() => {
    const total = Number(liquidity?.total_deposits || 0);
    const vault = Number(liquidity?.vault_cash || 0);
    if (total <= 0) return 0;
    return (vault / total) * 100;
  }, [liquidity]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2d3436]">Reports</h1>
            <p className="text-sm text-zinc-600">Revenue buckets + 80/20 liquidity monitoring.</p>
          </div>
          <div className="w-full md:w-[320px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Group</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]">
              <option value="" disabled>
                Select group
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name} ({g.group_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Revenue (30d)</div>
              <div className="mt-2 text-3xl font-extrabold text-[#2d3436]">GHS {Number(revenue?.totalRevenue || 0).toFixed(2)}</div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Vault Cash</div>
              <div className="mt-2 text-3xl font-extrabold text-[#2d3436]">GHS {Number(summary?.vault_cash || 0).toFixed(2)}</div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Shield size={18} className="text-blue-700" />
            </div>
          </div>
          <div className="mt-3 text-sm font-semibold text-zinc-600">Liquidity ratio: {liquidityRatio.toFixed(1)}% (target: 20%)</div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Loan Portfolio</div>
              <div className="mt-2 text-3xl font-extrabold text-[#2d3436]">GHS {Number(summary?.loan_portfolio || 0).toFixed(2)}</div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Wallet size={18} className="text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436] flex items-center gap-2">
            <BarChart3 size={18} className="text-zinc-400" />
            Revenue Buckets (30d)
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>31st day / commission</span>
              <span className="font-extrabold">GHS {Number(revenue?.commission || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Onboarding / processing fees</span>
              <span className="font-extrabold">GHS {Number(revenue?.processingFees || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Loan interest spread</span>
              <span className="font-extrabold">GHS {Number(revenue?.interest || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Loan insurance</span>
              <span className="font-extrabold">GHS {Number(revenue?.insuranceFees || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>SMS subscriptions</span>
              <span className="font-extrabold">GHS {Number(revenue?.smsFees || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#2d3436] flex items-center gap-2">
            <DollarSign size={18} className="text-zinc-400" />
            Cashflow Notes
          </h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <div className="rounded-2xl bg-[#FFF5F5] border border-[#E8B4B8]/30 p-4">
              <div className="font-extrabold text-[#2d3436]">80/20 rule</div>
              <div className="mt-1">Keep ~20% liquid to honor payouts/withdrawals. Use up to 80% for lending.</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="font-extrabold text-[#2d3436]">P2P guarantee</div>
              <div className="mt-1">Loans require 2 guarantors. Defaults can be recovered from guarantors’ future payouts.</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
