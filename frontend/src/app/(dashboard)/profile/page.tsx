"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, ArrowLeft, Camera, CreditCard, Image as ImageIcon } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    momoNumber: "",
    houseAddress: "",
    gpsAddress: "",
    region: "",
    hometown: "",
    bio: "",
  });

  const [files, setFiles] = useState({
    passportPicture: null as File | null,
    ghanaCard: null as File | null,
    selfiePicture: null as File | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFiles(prev => ({ ...prev, [e.target.name]: e.target.files![0] }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      // Placeholder for profile update API
      setTimeout(() => {
        setMessage("Profile updated successfully!");
        setLoading(false);
      }, 1000);
    } catch {
      setMessage("Failed to update profile");
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
          <Link href="/dashboard">
            <motion.div whileHover={{ x: -2 }} className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#2d3436] transition-colors">
              <ArrowLeft size={16} /> Back
            </motion.div>
          </Link>
        </motion.div>
        
        <motion.form 
          variants={itemVariants}
          onSubmit={onSubmit}
          className="relative rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E8B4B8]/10 to-[#A8D5BA]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">Full Name</label>
              <input required name="fullName" value={formData.fullName} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">MoMo Number</label>
              <input required name="momoNumber" value={formData.momoNumber} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">House Address</label>
              <input required name="houseAddress" value={formData.houseAddress} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">GPS Address</label>
              <input required name="gpsAddress" value={formData.gpsAddress} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">Region</label>
              <input required name="region" value={formData.region} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-zinc-600">Hometown</label>
              <input required name="hometown" value={formData.hometown} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
            </div>
          </div>

          <div className="relative z-10">
            <label className="block text-sm font-medium mb-1 text-zinc-600">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" rows={3} />
          </div>

          <div className="relative z-10 space-y-4 border-t border-zinc-100 pt-6">
            <h3 className="font-semibold text-[#2d3436] flex items-center gap-2"><Camera size={18} className="text-[#E8B4B8]" /> KYC Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider flex items-center gap-1"><ImageIcon size={14}/> Passport</label>
                <input type="file" accept="image/*" name="passportPicture" onChange={handleFileChange} className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[#A8D5BA]/20 file:text-[#2d3436] hover:file:bg-[#A8D5BA]/30 transition-all cursor-pointer" />
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider flex items-center gap-1"><CreditCard size={14}/> Ghana Card</label>
                <input type="file" accept="image/*,application/pdf" name="ghanaCard" onChange={handleFileChange} className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-[#E8B4B8]/20 file:text-[#2d3436] hover:file:bg-[#E8B4B8]/30 transition-all cursor-pointer" />
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider flex items-center gap-1"><Camera size={14}/> Selfie</label>
                <input type="file" accept="image/*" name="selfiePicture" onChange={handleFileChange} className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-zinc-200 file:text-[#2d3436] hover:file:bg-zinc-300 transition-all cursor-pointer" />
              </div>
            </div>
          </div>

          {message && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
              {message}
            </motion.p>
          )}

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading} 
            className="relative z-10 w-full rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
          >
            {loading ? "Saving Profile..." : "Save Profile"}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}