"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Shield, Users } from "lucide-react";
import {
  fetchGroupCompliance,
  fetchGroupMembers,
  fetchSusuGroups,
  type SusuGroup
} from "@/lib/susu-api";

type MemberRow = {
  id: string;
  membership_number: string;
  tier: "SILVER" | "GOLD";
  daily_contribution: number;
  total_contributions: number;
  status: string;
  users?: { full_name?: string; phone_number?: string; email?: string };
  ghana_card_number?: string;
  ghana_card_type?: string;
};

export default function SusuMembersPage() {
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchSusuGroups();
        setGroups(list);
        if (!groupId && list[0]?.id) setGroupId(list[0].id);
      } catch (e: any) {
        setError(e?.message || "Failed to load groups");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      try {
        setError("");
        setLoading(true);
        const [membersData, complianceData] = await Promise.all([
          fetchGroupMembers(groupId),
          fetchGroupCompliance(groupId)
        ]);
        setMembers(membersData);
        setCompliance(complianceData);
      } catch (e: any) {
        setError(e?.message || "Failed to load members");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [groupId]);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId) || null, [groups, groupId]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2d3436]">Members & AML Compliance</h1>
            <p className="text-sm text-zinc-600">Ghana Card data is mandatory for BoG/AML compliance.</p>
          </div>

          <div className="w-full md:w-[320px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#A8D5BA]"
            >
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

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      {compliance ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Compliance Rate</div>
                <div className="mt-2 text-3xl font-extrabold text-[#2d3436]">{Number(compliance.complianceRate || 0).toFixed(0)}%</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-[#A8D5BA]/20 flex items-center justify-center">
                <Shield size={18} className="text-[#2d3436]" />
              </div>
            </div>
            <div className="mt-4 text-sm text-zinc-600">
              {compliance.compliantMembers} / {compliance.totalMembers} members compliant
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={18} className="text-emerald-700" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Compliant</div>
                <div className="text-2xl font-extrabold text-[#2d3436]">{compliance.compliantMembers}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-700" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Missing Ghana Card</div>
                <div className="text-2xl font-extrabold text-[#2d3436]">{compliance.totalMembers - compliance.compliantMembers}</div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2d3436] flex items-center gap-2">
            <Users size={18} className="text-zinc-400" />
            Members
          </h2>
          <div className="text-xs font-semibold text-zinc-500">{selectedGroup ? selectedGroup.group_name : ""}</div>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-50" />
        ) : members.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm font-semibold text-zinc-500">No members yet.</div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const amlOk = Boolean(m.ghana_card_number && m.ghana_card_type);
              return (
                <div key={m.id} className="rounded-2xl border border-zinc-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[#2d3436]">{m.users?.full_name || "Unnamed"}</div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500">
                        {m.membership_number} • {m.tier} • GHS {Number(m.daily_contribution || 0).toFixed(2)}/day
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{m.users?.phone_number || m.users?.email || ""}</div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${amlOk ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {amlOk ? "AML OK" : "AML MISSING"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
