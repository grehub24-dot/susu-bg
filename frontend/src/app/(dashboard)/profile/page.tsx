"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ArrowLeft, Camera, CreditCard, LogOut, Pencil, X, Landmark } from "lucide-react";
import { GHANA_BANKS, getBankBySortCode } from "@/lib/bank-data";

type ProfileUser = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  momo_number?: string | null;
  bank_account_number?: string | null;
  bank_sort_code?: string | null;
  bank_name?: string | null;
  card_number?: string | null;
  house_address?: string | null;
  gps_address?: string | null;
  region?: string | null;
  hometown?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  passport_picture_url?: string | null;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  pin_reset_selfie_url?: string | null;
};

type ProfileResponse = {
  success: boolean;
  user?: ProfileUser;
  message?: string;
};

const detectCardType = (value: string | null | undefined) => {
  const normalized = String(value || "").replace(/\D/g, "");
  if (/^4\d{12}(\d{3})?$/.test(normalized)) return "Visa";
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7([01]\d{12}|20\d{12})))$/.test(normalized)) return "Mastercard";
  if (/^3[47]\d{13}$/.test(normalized)) return "American Express";
  if (/^(6011\d{12}|65\d{14}|64[4-9]\d{13})$/.test(normalized)) return "Discover";
  return "";
};

export default function ProfilePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Continue with logout
    }
    router.push("/login");
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.success || !data.user) {
          router.push("/login");
          return;
        }
        setUserId(data.user.id as string);
      } catch {
        router.push("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, [router]);

  const sessionUser = userId ? { id: userId } : null;

  const [profile, setProfile] = useState<ProfileUser | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    momoNumber: "",
    bankAccountNumber: "",
    bankSortCode: "",
    bankName: "",
    cardNumber: "",
    houseAddress: "",
    gpsAddress: "",
    region: "",
    hometown: ""
  });

  const hydrateForm = (user: ProfileUser | null | undefined) => {
    setFormData({
      fullName: String(user?.full_name || ""),
      momoNumber: String(user?.momo_number || ""),
      bankAccountNumber: String(user?.bank_account_number || ""),
      bankSortCode: String(user?.bank_sort_code || ""),
      bankName: String(user?.bank_name || ""),
      cardNumber: String(user?.card_number || ""),
      houseAddress: String(user?.house_address || ""),
      gpsAddress: String(user?.gps_address || ""),
      region: String(user?.region || ""),
      hometown: String(user?.hometown || "")
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    const load = async () => {
      if (!sessionUser?.id && !sessionUser?.email && !sessionUser?.phone_number && !sessionUser?.phoneNumber) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const initialUrl = sessionUser?.id
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/profile?userId=${encodeURIComponent(String(sessionUser.id))}`
          : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/profile?identifier=${encodeURIComponent(
              String(sessionUser.email || sessionUser.phone_number || sessionUser.phoneNumber || "")
            )}`;

        const response = await fetch(initialUrl);
        const data = (await response.json()) as ProfileResponse;

        if (!response.ok || !data.success || !data.user) {
          setError(data.message || "Failed to load profile");
          return;
        }

        setProfile(data.user);
        hydrateForm(data.user);

        if (data.user?.id) {
          setUserId(data.user.id);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router, userId]);

  const onSave = async () => {
    const targetUserId = sessionUser?.id || profile?.id;
    if (!targetUserId) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          fullName: formData.fullName,
          momoNumber: formData.momoNumber,
          bankAccountNumber: formData.bankAccountNumber,
          bankSortCode: formData.bankSortCode,
          bankName: formData.bankName,
          cardNumber: formData.cardNumber,
          houseAddress: formData.houseAddress,
          gpsAddress: formData.gpsAddress,
          region: formData.region,
          hometown: formData.hometown
        })
      });

      const data = (await response.json()) as ProfileResponse;
      if (!response.ok || !data.success || !data.user) {
        setError(data.message || "Failed to update profile");
        return;
      }

      setProfile(data.user);
      hydrateForm(data.user);
      setEditing(false);
      setMessage(data.message || "Profile updated");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const editableProfile = {
    ...profile,
    full_name: formData.fullName || profile?.full_name,
    momo_number: formData.momoNumber || profile?.momo_number,
    bank_account_number: formData.bankAccountNumber || profile?.bank_account_number,
    bank_sort_code: formData.bankSortCode || profile?.bank_sort_code,
    bank_name: formData.bankName || profile?.bank_name,
    card_number: formData.cardNumber || profile?.card_number,
    house_address: formData.houseAddress || profile?.house_address,
    gps_address: formData.gpsAddress || profile?.gps_address,
    region: formData.region || profile?.region,
    hometown: formData.hometown || profile?.hometown
  };
  const currentCardType = detectCardType(editableProfile.card_number);
  const editCardType = detectCardType(formData.cardNumber);

  return (
    <div className="min-h-screen p-6 md:p-8 bg-[#FFF5F5]">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-[#2d3436]">
            <User size={24} className="text-[#A8D5BA]" />
            Client Profile & KYC
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.div whileHover={{ x: -2 }} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
                <ArrowLeft size={16} /> Back
              </motion.div>
            </Link>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-[#2d3436] hover:bg-zinc-200 transition-colors"
            >
              <LogOut size={14} /> Logout
            </motion.button>
          </div>
        </motion.div>
        
        <motion.div
          variants={itemVariants}
          className="relative rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E8B4B8]/10 to-[#A8D5BA]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-zinc-100 overflow-hidden flex items-center justify-center">
                {profile?.pin_reset_selfie_url ? (
                  <img
                    src={profile.pin_reset_selfie_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={26} className="text-zinc-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#2d3436]">{editableProfile.full_name || "Profile"}</h2>
                <p className="text-sm text-zinc-500 font-medium">{profile?.email || profile?.phone_number || ""}</p>
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                hydrateForm(profile);
                setEditing(true);
                setMessage("");
                setError("");
              }}
              className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-sm font-medium text-[#2d3436] hover:bg-zinc-200 transition-colors"
            >
              <Pencil size={14} /> Edit
            </motion.button>
          </div>

          {loading ? (
            <p className="relative z-10 text-sm text-zinc-500">Loading profile...</p>
          ) : null}

          {error ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100"
            >
              {error}
            </motion.p>
          ) : null}

          {message ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100"
            >
              {message}
            </motion.p>
          ) : null}

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">MoMo Number</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.momo_number || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Region</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.region || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bank Sort Code</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.bank_sort_code || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bank Name</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.bank_name || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bank Account Number</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.bank_account_number || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Card Number</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.card_number || "-"}</p>
              <p className="mt-1 text-xs font-medium text-zinc-500">{currentCardType || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">House Address</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.house_address || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">GPS Address</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.gps_address || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hometown</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">{editableProfile.hometown || "-"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">ID Type / Number</p>
              <p className="mt-1 text-sm font-medium text-[#2d3436]">
                {profile?.id_type ? `${profile.id_type}${profile?.id_number ? ` - ${profile.id_number}` : ""}` : "-"}
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-4 border-t border-zinc-100 pt-6">
            <h3 className="font-semibold text-[#2d3436] flex items-center gap-2">
              <Camera size={18} className="text-[#E8B4B8]" /> KYC Documents
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={14} /> Ghana Card (Front)
                </label>
                {profile?.id_card_front_url ? (
                  <img src={profile.id_card_front_url} alt="Ghana Card Front" className="h-32 w-full object-cover rounded-xl border border-zinc-100" />
                ) : (
                  <p className="text-xs text-zinc-500">-</p>
                )}
              </div>

              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={14} /> Ghana Card (Back)
                </label>
                {profile?.id_card_back_url ? (
                  <img src={profile.id_card_back_url} alt="Ghana Card Back" className="h-32 w-full object-cover rounded-xl border border-zinc-100" />
                ) : (
                  <p className="text-xs text-zinc-500">-</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2d3436]">Edit Profile</h3>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full p-2 hover:bg-zinc-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">Full Name</label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">MoMo Number</label>
                  <input
                    name="momoNumber"
                    value={formData.momoNumber}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">House Address</label>
                  <input
                    name="houseAddress"
                    value={formData.houseAddress}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-600 flex items-center gap-1">
                      <Landmark size={14} /> Sort Code
                    </label>
                    <input
                      name="bankSortCode"
                      value={formData.bankSortCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setFormData((prev) => ({ ...prev, bankSortCode: value }));
                        if (value.length >= 2) {
                          const detectedBank = getBankBySortCode(value);
                          if (detectedBank) {
                            setFormData((prev) => ({ ...prev, bankName: detectedBank }));
                          }
                        }
                      }}
                      placeholder="6-digit sort code"
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-600">Bank Account Number</label>
                    <input
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 16);
                        setFormData((prev) => ({ ...prev, bankAccountNumber: digitsOnly }));
                      }}
                      inputMode="numeric"
                      pattern="^(\d{10,13}|\d{16})$"
                      title="Enter a valid Ghana bank account number (10-13 digits or 16 digits)."
                      maxLength={16}
                      className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">Bank Name (Auto-filled)</label>
                  <input
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">Card Number</label>
                  <input
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 16);
                      setFormData((prev) => ({ ...prev, cardNumber: digitsOnly }));
                    }}
                    inputMode="numeric"
                    pattern="^(\d{13}|\d{15}|\d{16})$"
                    title="Enter a valid card number (13, 15, or 16 digits)."
                    maxLength={16}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                  <p className="mt-1 text-xs text-zinc-500">{editCardType || "Unknown card type"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">GPS Address</label>
                  <input
                    name="gpsAddress"
                    value={formData.gpsAddress}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">Region</label>
                  <input
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-600">Hometown</label>
                  <input
                    name="hometown"
                    value={formData.hometown}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                  />
                </div>
              </div>

              {error ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100"
                >
                  {error}
                </motion.p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onSave}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-[#2d3436] px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 font-semibold text-[#2d3436] hover:bg-zinc-200"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
