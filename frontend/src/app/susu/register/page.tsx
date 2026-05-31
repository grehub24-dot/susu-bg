"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Shield, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/admin/LoadingSpinner";

type SusuGroup = {
  id: string;
  group_name: string;
  group_code: string;
  target_group: string;
  daily_contribution: number;
  cycle_days: number;
  tier: string;
  status: string;
};

type UserProfile = {
  id: string;
  full_name: string;
  phone_number: string;
  kyc_status: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const groupOptions = [
  {
    id: "SIE_BI_SUSU",
    name: "SIE BI SUSU",
    description: "Weekly payout group - Everyone contributes daily, one person receives payout each week on rotation basis",
    icon: <Users size={24} />,
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "emerald-500/30",
    textColor: "text-emerald-300",
    cycle: "7 days",
  },
  {
    id: "ABRABOPA_SUSU",
    name: "ABRABOPA SUSU",
    description: "Monthly payout group - Longer cycle for larger savings goals with monthly disbursements",
    icon: <Shield size={24} />,
    color: "from-blue-500/20 to-indigo-500/20",
    borderColor: "blue-500/30",
    textColor: "text-blue-300",
    cycle: "30 days",
  },
];

export default function SusuRegisterPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedGroup, setSelectedGroup] = useState<typeof groupOptions[0] | null>(null);
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    daily_contribution: "",
    payment_method: "MOBILE_MONEY",
    momo_number: "",
    acceptor_name: "",
    acceptor_phone: "",
    guarantor_1_name: "",
    guarantor_1_phone: "",
    guarantor_2_name: "",
    guarantor_2_phone: "",
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, groupsRes] = await Promise.all([
        fetch("/api/admin-proxy/admin/users?limit=1&offset=0").catch(() => null),
        fetch("/api/admin-proxy/admin/susu-groups").catch(() => null),
      ]);

      if (profileRes?.ok) {
        const profileData = await profileRes.json();
        if (profileData.success && profileData.data?.length > 0) setUser(profileData.data[0]);
      }

      if (groupsRes?.ok) {
        const groupsData = await groupsRes.json();
        if (groupsData.success) setGroups(groupsData.data || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (option: typeof groupOptions[0]) => {
    setSelectedGroup(option);
    const group = groups.find((g) => g.target_group === option.id);
    if (group) {
      setFormData((prev) => ({
        ...prev,
        daily_contribution: String(group.daily_contribution),
      }));
    }
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!selectedGroup) return;

    if (!formData.daily_contribution || !formData.momo_number) {
      showError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const group = groups.find((g) => g.target_group === selectedGroup.id);
      if (!group) {
        showError("Group not found");
        return;
      }

      const res = await fetch("/api/admin-proxy/admin/susu-memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          group_id: group.id,
          daily_contribution: parseFloat(formData.daily_contribution),
          payment_method: formData.payment_method,
          momo_number: formData.momo_number,
          acceptor_name: formData.acceptor_name,
          acceptor_phone: formData.acceptor_phone,
          guarantor_1_name: formData.guarantor_1_name,
          guarantor_1_phone: formData.guarantor_1_phone,
          guarantor_2_name: formData.guarantor_2_name,
          guarantor_2_phone: formData.guarantor_2_phone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showSuccess("Successfully registered for " + selectedGroup.name);
        router.push("/susu/dashboard");
      } else {
        showError(data.message || "Registration failed");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isKYCApproved = user?.kyc_status === "APPROVED" || user?.kyc_status === "VERIFIED";

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-background)] p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-background)]">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants}>
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-[1.75rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)]"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3 text-[color:var(--color-foreground)]">
                <Users size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[color:var(--color-foreground)]">Join a Susu Group</h1>
                <p className="mt-0.5 text-sm font-medium text-[color:var(--color-muted)]">
                  Start your savings journey with a community-based rotating savings group
                </p>
              </div>
            </div>
          </motion.div>

          {!isKYCApproved && (
            <motion.div variants={itemVariants} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-300" size={20} />
                <div>
                  <div className="font-semibold text-amber-300">KYC Verification Required</div>
                  <p className="mt-1 text-sm text-amber-200/80">
                    You must complete KYC verification before joining a SuSu group.{" "}
                    <button onClick={() => router.push("/admin/kyc")} className="underline">
                      Verify now
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === "select" && isKYCApproved && (
            <>
              <motion.h2 variants={itemVariants} className="text-lg font-bold text-[color:var(--color-foreground)]">
                Select Your Group Type
              </motion.h2>

              <div className="grid gap-4">
                {groupOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    variants={itemVariants}
                    onClick={() => handleGroupSelect(option)}
                    className={`rounded-2xl border bg-gradient-to-br p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br ${option.color} border-${option.borderColor}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl bg-white/15 p-3 ${option.textColor}`}>{option.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[color:var(--color-foreground)]">{option.name}</h3>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-foreground)]">
                            {option.cycle} cycle
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[color:var(--color-muted)]">{option.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {step === "form" && selectedGroup && (
            <>
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.10)]"
              >
                <div className="mb-6 flex items-center gap-3">
                  <button onClick={() => setStep("select")} className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-xl font-extrabold text-[color:var(--color-foreground)]">
                      Join {selectedGroup.name}
                    </h2>
                    <p className="text-sm text-[color:var(--color-muted)]">
                      {selectedGroup.cycle} contribution cycle
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">
                      Daily Contribution Amount (GHS) *
                    </label>
                    <input
                      type="number"
                      value={formData.daily_contribution}
                      onChange={(e) => setFormData({ ...formData, daily_contribution: e.target.value })}
                      placeholder="Enter daily amount"
                      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">
                      Payment Method *
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                    >
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[color:var(--color-foreground)]">
                      Mobile Money Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.momo_number}
                      onChange={(e) => setFormData({ ...formData, momo_number: e.target.value })}
                      placeholder="0551234567"
                      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                    />
                  </div>

                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                    <h4 className="text-sm font-semibold text-[color:var(--color-foreground)]">Acceptor (Collector)</h4>
                    <p className="mb-3 text-xs text-[color:var(--color-muted)]">
                      The collector who will receive and record your contributions
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={formData.acceptor_name}
                        onChange={(e) => setFormData({ ...formData, acceptor_name: e.target.value })}
                        placeholder="Acceptor Name"
                        className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                      />
                      <input
                        type="tel"
                        value={formData.acceptor_phone}
                        onChange={(e) => setFormData({ ...formData, acceptor_phone: e.target.value })}
                        placeholder="Acceptor Phone"
                        className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                    <h4 className="text-sm font-semibold text-[color:var(--color-foreground)]">Guarantors (Optional)</h4>
                    <p className="mb-3 text-xs text-[color:var(--color-muted)]">
                      Two guarantors may be required for loan eligibility
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--color-muted)]">
                          Guarantor 1
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={formData.guarantor_1_name}
                            onChange={(e) => setFormData({ ...formData, guarantor_1_name: e.target.value })}
                            placeholder="Name"
                            className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                          />
                          <input
                            type="tel"
                            value={formData.guarantor_1_phone}
                            onChange={(e) => setFormData({ ...formData, guarantor_1_phone: e.target.value })}
                            placeholder="Phone"
                            className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--color-muted)]">
                          Guarantor 2
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={formData.guarantor_2_name}
                            onChange={(e) => setFormData({ ...formData, guarantor_2_name: e.target.value })}
                            placeholder="Name"
                            className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                          />
                          <input
                            type="tel"
                            value={formData.guarantor_2_phone}
                            onChange={(e) => setFormData({ ...formData, guarantor_2_phone: e.target.value })}
                            placeholder="Phone"
                            className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-sage-green)]/30"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-4">
                    <h4 className="mb-2 text-sm font-semibold text-[color:var(--color-foreground)]">Agreement</h4>
                    <label className="flex items-start gap-2 text-xs text-[color:var(--color-muted)]">
                      <input type="checkbox" className="mt-0.5 rounded" />
                      <span>
                        I agree to the Susu group rules and commit to making daily contributions. I understand that
                        missing contributions may result in penalties or loss of payout priority.
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-6 w-full rounded-xl bg-[color:var(--color-sage-green)] px-4 py-4 text-sm font-extrabold text-[#2d3436] shadow-[0_14px_30px_rgba(0,0,0,0.14)] hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Join Group"}
                </button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}