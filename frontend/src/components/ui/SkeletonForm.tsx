"use client";

import { motion } from "framer-motion";

interface SkeletonFieldProps {
  label?: string;
  width?: "full" | "half" | "third";
}

function SkeletonField({ label, width = "full" }: SkeletonFieldProps) {
  const widthClass = {
    full: "w-full",
    half: "w-1/2",
    third: "w-1/3"
  };

  return (
    <div className={widthClass[width]}>
      {label && (
        <div className="h-3 w-12 bg-zinc-200 rounded mb-2 animate-pulse" />
      )}
      <div className="h-12 w-full bg-zinc-100 rounded-2xl animate-pulse" />
    </div>
  );
}

interface SkeletonFormProps {
  variant?: "login" | "register" | "otp";
}

export function SkeletonForm({ variant = "login" }: SkeletonFormProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const renderLoginForm = () => (
    <>
      {/* Badge */}
      <motion.div variants={itemVariants} className="h-6 w-28 bg-zinc-100 rounded-full mb-6" />
      
      {/* Title */}
      <motion.div variants={itemVariants} className="h-9 w-48 bg-zinc-200 rounded-lg mb-2" />
      <motion.div variants={itemVariants} className="h-4 w-64 bg-zinc-100 rounded mb-8" />

      {/* Email field */}
      <motion.div variants={itemVariants}>
        <div className="h-3 w-16 bg-zinc-100 rounded mb-2" />
        <div className="h-12 w-full bg-zinc-50 rounded-2xl" />
      </motion.div>

      {/* PIN field */}
      <motion.div variants={itemVariants} className="mt-4">
        <div className="h-3 w-8 bg-zinc-100 rounded mb-2" />
        <div className="h-12 w-full bg-zinc-50 rounded-2xl" />
      </motion.div>

      {/* Button */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="h-12 w-full bg-zinc-200 rounded-2xl" />
      </motion.div>
    </>
  );

  const renderRegisterForm = () => (
    <>
      {/* Progress steps */}
      <motion.div variants={itemVariants} className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 bg-zinc-100 rounded-full" />
        ))}
      </motion.div>

      {/* Title */}
      <motion.div variants={itemVariants} className="h-8 w-40 bg-zinc-200 rounded-lg mb-2" />
      <motion.div variants={itemVariants} className="h-4 w-56 bg-zinc-100 rounded mb-6" />

      {/* Fields */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <SkeletonField />
        <SkeletonField />
      </motion.div>

      <motion.div variants={itemVariants} className="mt-4">
        <SkeletonField />
      </motion.div>

      <motion.div variants={itemVariants} className="mt-4">
        <SkeletonField />
      </motion.div>

      {/* Button */}
      <motion.div variants={itemVariants} className="mt-6">
        <div className="h-12 w-full bg-zinc-200 rounded-2xl" />
      </motion.div>
    </>
  );

  const renderOtpForm = () => (
    <>
      {/* Back button */}
      <motion.div variants={itemVariants} className="h-5 w-20 bg-zinc-100 rounded mb-4" />

      {/* Icon */}
      <motion.div variants={itemVariants} className="h-16 w-16 bg-zinc-100 rounded-full mx-auto mb-4" />

      {/* Title */}
      <motion.div variants={itemVariants} className="h-8 w-40 bg-zinc-200 rounded-lg mx-auto mb-2" />
      <motion.div variants={itemVariants} className="h-4 w-56 bg-zinc-100 rounded mx-auto mb-6" />

      {/* OTP inputs */}
      <motion.div variants={itemVariants} className="flex justify-center gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 w-12 bg-zinc-100 rounded-xl" />
        ))}
      </motion.div>

      {/* Button */}
      <motion.div variants={itemVariants}>
        <div className="h-12 w-full bg-zinc-200 rounded-2xl" />
      </motion.div>

      {/* Resend */}
      <motion.div variants={itemVariants} className="mt-4 h-4 w-32 bg-zinc-100 rounded mx-auto" />
    </>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-md"
    >
      {variant === "login" && renderLoginForm()}
      {variant === "register" && renderRegisterForm()}
      {variant === "otp" && renderOtpForm()}
    </motion.div>
  );
}

export default SkeletonForm;