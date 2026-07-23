"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Camera, Info, CreditCard, User, ShieldCheck, Landmark } from "lucide-react";
import { GHANA_BANKS, getBankBySortCode } from "@/lib/bank-data";
import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

const ghanaCardRegex = /^GHA-\d{9}-\d$/;
const ghanaPostGpsRegex = /^[A-Z]{1,2}-\d{3}-\d{4}$/;
const coordinateRegex = /^-?\d{1,2}\.\d+,\s?-?\d{1,3}\.\d+$/;
const nationalVotersIdRegex = /^[A-Z0-9-]{5,30}$/;
const ghanaPhoneRegex = /^0\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeDigits = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

const isValidGhanaBankAccountNumber = (value: string) => /^\d{13}$/.test(value) || /^\d{16}$/.test(value);

const formatCardNumberDisplay = (digitsOnly: string) => {
  const digits = normalizeDigits(digitsOnly, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const formatTitleCaseInput = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trimStart()
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

const formatEmailInput = (value: string) => value.trim().toLowerCase();

const formatGhanaCardInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (!digits) return "";
  if (digits.length <= 9) return `GHA-${digits}`;

  return `GHA-${digits.slice(0, 9)}-${digits.slice(9)}`;
};

const formatGhanaPostGpsInput = (value: string) => {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = characters.match(/^([A-Z]{0,2})(\d{0,3})(\d{0,4})/);

  if (!match) return "";

  const [, regionCode, areaCode, uniqueAddress] = match;
  const parts = [regionCode];

  if (areaCode) parts.push(areaCode);
  if (uniqueAddress) parts.push(uniqueAddress);

  return parts.filter(Boolean).join("-");
};

const formatGhanaPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("233")) return `0${digits.slice(3, 12)}`.slice(0, 10);
  if (digits.startsWith("0")) return digits.slice(0, 10);

  return `0${digits.slice(0, 9)}`.slice(0, 10);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [documentPickerTarget, setDocumentPickerTarget] = useState<"passport" | "front" | "back" | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const idFrontInputRef = useRef<HTMLInputElement | null>(null);
  const idBackInputRef = useRef<HTMLInputElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Step 1: Bio
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [houseAddress, setHouseAddress] = useState("");
  const [gpsAddress, setGpsAddress] = useState("");
  const [cityTown, setCityTown] = useState("");
  const [hometown, setHometown] = useState("");
  const [idType, setIdType] = useState("Ghana Card");
  const [idNumber, setIdNumber] = useState("");

  // Step 2: Documents
  const [passportPicture, setPassportPicture] = useState<File | null>(null);
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);

  // Step 3: Payment Options
  const [momoNumber, setMomoNumber] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const [showBankFields, setShowBankFields] = useState(false);
  const [showCardFields, setShowCardFields] = useState(false);

  const bankAccountNumberInvalid =
    showBankFields && bankAccountNumber.length > 0 && !isValidGhanaBankAccountNumber(bankAccountNumber);

  const cardNumberInvalid = showCardFields && cardNumber.length > 0 && !/^\d{13,19}$/.test(cardNumber);

  // Step 4: Login Credentials
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGhanaCardSelected = idType === "Ghana Card";
  const idNumberPlaceholder = isGhanaCardSelected ? "GHA-123456789-0" : "National Voters ID Number";
  const idNumberHint = isGhanaCardSelected
    ? 'Format: GHA-123456789-0. Prefix must always start with "GHA".'
    : "Use the ID exactly as printed, with letters, numbers, and hyphens only.";
  const idNumberPattern = isGhanaCardSelected ? "GHA-[0-9]{9}-[0-9]" : "[A-Z0-9-]{5,30}";
  const idNumberTitle = isGhanaCardSelected
    ? 'Use the format GHA-123456789-0. Prefix must always start with "GHA".'
    : "Use 5 to 30 characters with letters, numbers, and hyphens only.";

  const fetchLocation = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (err) => {
          // Instead of console.error which triggers Next.js overlay, handle it gracefully
          let errorMessage = "Could not fetch location.";
          if (err.code === 1) errorMessage = "Location access denied. Please enable permissions or enter manually.";
          if (err.code === 2) errorMessage = "Location unavailable. Please enter manually.";
          if (err.code === 3) errorMessage = "Location request timed out. Please enter manually.";
          alert(errorMessage);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const closeDocumentPicker = () => {
    setDocumentPickerOpen(false);
    setDocumentPickerTarget(null);
    setCameraOpen(false);
  };

  useEffect(() => {
    setFieldErrors({});
  }, [step]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!cameraOpen) {
      stopCameraStream();
      return;
    }

    const startCamera = async () => {
      try {
        const facingMode = documentPickerTarget === "passport" ? "user" : "environment";
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : "Unable to access camera");
        setCameraOpen(false);
      }
    };

    void startCamera();

    return () => {
      stopCameraStream();
    };
  }, [cameraOpen, documentPickerTarget]);

  const openDocumentPicker = (target: "passport" | "front" | "back") => {
    setError("");
    setDocumentPickerTarget(target);
    setDocumentPickerOpen(true);
    setCameraOpen(false);
  };

  const triggerFilePicker = () => {
    if (!documentPickerTarget) return;
    const ref =
      documentPickerTarget === "passport"
        ? passportInputRef
        : documentPickerTarget === "front"
          ? idFrontInputRef
          : idBackInputRef;
    ref.current?.click();
  };

  const onFileSelected = (target: "passport" | "front" | "back", file: File | null) => {
    if (target === "passport") setPassportPicture(file);
    if (target === "front") setIdCardFront(file);
    if (target === "back") setIdCardBack(file);

    if (file) {
      const key = target === "passport" ? "passportPicture" : target === "front" ? "idCardFront" : "idCardBack";
      setFieldErrors((prev) => ({ ...prev, [key]: false }));
      setError("");
    }

    closeDocumentPicker();
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !documentPickerTarget) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture image");
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Unable to capture image");
      return;
    }

    const filename =
      documentPickerTarget === "passport"
        ? "passport.jpg"
        : documentPickerTarget === "front"
          ? "id-front.jpg"
          : "id-back.jpg";
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    onFileSelected(documentPickerTarget, file);
  };

  const validateStep1 = () => {
    const nextFieldErrors: Record<string, boolean> = {};
    const missingFields: string[] = [];
    if (!fullName) {
      missingFields.push("Full Name");
      nextFieldErrors.fullName = true;
    }
    if (!email) {
      missingFields.push("Email Address");
      nextFieldErrors.email = true;
    }
    if (!phoneNumber) {
      missingFields.push("Phone Number");
      nextFieldErrors.phoneNumber = true;
    }
    if (!dateOfBirth) {
      missingFields.push("Date of Birth");
      nextFieldErrors.dateOfBirth = true;
    }
    if (!houseAddress) {
      missingFields.push("House Address");
      nextFieldErrors.houseAddress = true;
    }
    if (!gpsAddress) {
      missingFields.push("Ghana Post GPS");
      nextFieldErrors.gpsAddress = true;
    }
    if (!cityTown) {
      missingFields.push("City/Town");
      nextFieldErrors.cityTown = true;
    }
    if (!hometown) {
      missingFields.push("Hometown");
      nextFieldErrors.hometown = true;
    }
    if (!idNumber) {
      missingFields.push(idType);
      nextFieldErrors.idNumber = true;
    }
    if (missingFields.length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please complete: ${missingFields.join(", ")}.`);
      return false;
    }
    if (!emailRegex.test(email)) {
      setFieldErrors({ ...nextFieldErrors, email: true });
      setError("Enter a valid email address (e.g. name@example.com).");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      setFieldErrors({ ...nextFieldErrors, dateOfBirth: true });
      setError("Use a valid date of birth (YYYY-MM-DD).");
      return false;
    }
    if (!ghanaPhoneRegex.test(phoneNumber)) {
      setFieldErrors({ ...nextFieldErrors, phoneNumber: true });
      setError("Use a valid Ghana phone number in the format 0241234567.");
      return false;
    }
    if (!ghanaPostGpsRegex.test(gpsAddress) && !coordinateRegex.test(gpsAddress)) {
      setFieldErrors({ ...nextFieldErrors, gpsAddress: true });
      setError("Use a valid Ghana Post GPS address like GA-183-8164, or use the pin to capture coordinates.");
      return false;
    }
    if (isGhanaCardSelected && !ghanaCardRegex.test(idNumber)) {
      setFieldErrors({ ...nextFieldErrors, idNumber: true });
      setError('Ghana Card numbers must use the format GHA-123456789-0.');
      return false;
    }
    if (!isGhanaCardSelected && !nationalVotersIdRegex.test(idNumber)) {
      setFieldErrors({ ...nextFieldErrors, idNumber: true });
      setError("National Voters ID must contain only letters, numbers, and hyphens.");
      return false;
    }
    setFieldErrors({});
    setError("");
    return true;
  };

  const validateStep2 = () => {
    const nextFieldErrors: Record<string, boolean> = {};
    const missingFields: string[] = [];
    if (!passportPicture) {
      missingFields.push("Passport Picture");
      nextFieldErrors.passportPicture = true;
    }
    if (!idCardFront) {
      missingFields.push(`${idType} (Front)`);
      nextFieldErrors.idCardFront = true;
    }
    if (!idCardBack) {
      missingFields.push(`${idType} (Back)`);
      nextFieldErrors.idCardBack = true;
    }
    if (missingFields.length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(`Please upload: ${missingFields.join(", ")}.`);
      return false;
    }
    setFieldErrors({});
    setError("");
    return true;
  };

  const validateStep3 = () => {
    if (showBankFields && bankAccountNumber && !isValidGhanaBankAccountNumber(bankAccountNumber)) {
      setError("Bank account numbers must be 13 digits (universal banks) or 16 digits (rural banks).");
      return false;
    }

    if (showCardFields && cardNumber && !/^\d{13,19}$/.test(cardNumber)) {
      setError("Card numbers must be 13 to 19 digits.");
      return false;
    }

    setError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
    setError("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 4) return;
    
    if (!pin) {
      setFieldErrors({ pin: true });
      setError("Please complete: PIN.");
      return;
    }

    if (pin.length < 4 || pin.length > 6) {
      setFieldErrors({ pin: true });
      setError("PIN must be 4 to 6 digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const passportDataUrl = await readFileAsDataUrl(passportPicture!);
      const idCardFrontDataUrl = await readFileAsDataUrl(idCardFront!);
      const idCardBackDataUrl = await readFileAsDataUrl(idCardBack!);

      const response = await fetch(
        `/api/backend/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fullName, 
            email, 
            phoneNumber, 
            dateOfBirth,
            pin,
            momoNumber,
            bankAccountNumber: showBankFields ? bankAccountNumber : "",
            bankSortCode: showBankFields ? bankSortCode : "",
            bankName: showBankFields ? bankName : "",
            cardNumber: showCardFields ? cardNumber : "",
            houseAddress,
            gpsAddress,
            cityTown,
            hometown,
            passportPicture: passportDataUrl,
            idType,
            idNumber,
            idCardFront: idCardFrontDataUrl,
            idCardBack: idCardBackDataUrl
          })
        }
      );
      const data = (await response.json()) as {
        success: boolean;
        requiresOtp?: boolean;
        identifier?: string;
        message?: string;
        issues?: Array<{ path?: string; message?: string }>;
      };
      if (!response.ok || !data.success) {
        if (Array.isArray(data.issues) && data.issues.length > 0) {
          const details = data.issues
            .map((issue) => {
              const path = String(issue.path || "").trim();
              const message = String(issue.message || "").trim();
              return path ? `${path}: ${message}` : message;
            })
            .filter(Boolean)
            .join(" | ");
          setError(details || data.message || "Registration failed");
        } else {
          setError(data.message || "Registration failed");
        }
        setLoading(false);
        return;
      }
      if (!data.requiresOtp || !data.identifier) {
        setError("Registration started but OTP setup failed");
        setLoading(false);
        return;
      }
      router.push(`/verify-otp?flow=registration&identifier=${encodeURIComponent(data.identifier)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedLoader 
        isLoading={isPageLoading} 
        title="Susu-BG"
        subtitle="Creating Account"
        variant="default"
      />
    
      <div className="flex min-h-screen items-center justify-center p-6 bg-[#FFF5F5]">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }}
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] my-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#A8D5BA]/20 to-[#E8B4B8]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2d3436]">Register</h1>
            <p className="mt-1 text-sm text-zinc-500 font-medium">Step {step} of 4</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-2 w-8 rounded-full ${step >= i ? 'bg-[#A8D5BA]' : 'bg-zinc-100'}`} />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 min-h-[300px]">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="font-semibold text-sm text-[#2d3436] uppercase tracking-wider flex items-center gap-2"><User size={16} className="text-[#A8D5BA]" /> Bio & Contact Info</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input required value={fullName} onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, fullName: false }));
                  setError("");
                  setFullName(formatTitleCaseInput(e.target.value));
                }} placeholder="Full Name" className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.fullName ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`} />
                <input required value={email} onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, email: false }));
                  setError("");
                  setEmail(formatEmailInput(e.target.value));
                }} placeholder="Email Address" type="email" className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`} />
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone Number</span>
                    <span className="rounded-full bg-[#A8D5BA]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5d9270]">
                      0241234567
                    </span>
                  </div>
                  <input
                    required
                    value={phoneNumber}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, phoneNumber: false }));
                      setError("");
                      setPhoneNumber(formatGhanaPhoneInput(e.target.value));
                    }}
                    placeholder="0241234567"
                    inputMode="tel"
                    pattern="0[0-9]{9}"
                    title="Use a valid Ghana phone number in the format 0241234567."
                    maxLength={10}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.phoneNumber ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Auto-formats Ghana numbers to local format. You can paste 0241234567, 233241234567, or +233241234567.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Date of Birth</label>
                  <input
                    required
                    value={dateOfBirth}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, dateOfBirth: false }));
                      setError("");
                      setDateOfBirth(e.target.value);
                    }}
                    placeholder="YYYY-MM-DD"
                    type="date"
                    className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.dateOfBirth ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`}
                  />
                </div>
                <input required value={houseAddress} onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, houseAddress: false }));
                  setError("");
                  setHouseAddress(e.target.value);
                }} placeholder="House Address" className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.houseAddress ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`} />
                <div className="md:col-span-2">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ghana Post GPS</span>
                    <span className="rounded-full bg-[#A8D5BA]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5d9270]">
                      GA-183-8164
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      required
                      value={gpsAddress}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, gpsAddress: false }));
                        setError("");
                        const nextValue = e.target.value.trim();
                        const isCoordinateInput = /[.,]/.test(nextValue) || /^-?\d/.test(nextValue);

                        setGpsAddress(
                          isCoordinateInput
                            ? nextValue.replace(/\s+/g, "")
                            : formatGhanaPostGpsInput(nextValue)
                        );
                      }}
                      placeholder="GA-183-8164"
                      pattern="([A-Z]{1,2}-[0-9]{3}-[0-9]{4})|(-?[0-9]{1,2}\.[0-9]+,\s?-?[0-9]{1,3}\.[0-9]+)"
                      title="Use a Ghana Post GPS address like GA-183-8164, or use the pin to capture coordinates."
                      className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white pr-12 ${fieldErrors.gpsAddress ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`}
                    />
                    <button type="button" onClick={fetchLocation} className="absolute right-2 top-2 p-2 text-zinc-400 hover:text-[#A8D5BA] bg-white rounded-xl shadow-sm border border-zinc-100 transition-colors" title="Pin Current Location">
                      <MapPin size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Format: region code + area digits + unique digits, for example GA-183-8164.
                  </p>
                </div>
                <input required value={cityTown} onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, cityTown: false }));
                  setError("");
                  setCityTown(formatTitleCaseInput(e.target.value));
                }} placeholder="City/Town" className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.cityTown ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`} />
                <input required value={hometown} onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, hometown: false }));
                  setError("");
                  setHometown(formatTitleCaseInput(e.target.value));
                }} placeholder="Hometown" className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.hometown ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`} />
                <select value={idType} onChange={(e) => {
                  setIdType(e.target.value);
                  setIdNumber("");
                  setFieldErrors((prev) => ({ ...prev, idNumber: false }));
                  setError("");
                }} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white">
                  <option value="Ghana Card">Ghana Card</option>
                  <option value="National Voters ID">National Voters ID</option>
                </select>
                <div className="md:col-span-2">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{idType}</span>
                    <span className="rounded-full bg-[#E8B4B8]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b86d74]">
                      {isGhanaCardSelected ? "GHA-123456789-0" : "Letters, numbers, -"}
                    </span>
                  </div>
                  <input
                    required
                    value={idNumber}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, idNumber: false }));
                      setError("");
                      setIdNumber(
                        isGhanaCardSelected
                          ? formatGhanaCardInput(e.target.value)
                          : e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                      );
                    }}
                    placeholder={idNumberPlaceholder}
                    pattern={idNumberPattern}
                    title={idNumberTitle}
                    maxLength={isGhanaCardSelected ? 15 : 30}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white ${fieldErrors.idNumber ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`}
                  />
                  <p className="mt-2 text-xs text-zinc-500">{idNumberHint}</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="font-semibold text-sm text-[#2d3436] uppercase tracking-wider flex items-center gap-2"><Camera size={16} className="text-[#A8D5BA]" /> Document Uploads</h3>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800 flex gap-3 items-start">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Capture Guide:</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs opacity-80">
                    <li>Ensure good lighting and avoid glare on the ID card.</li>
                    <li>Passport picture should show your full face clearly.</li>
                    <li>Capture both the FRONT and BACK of your chosen ID ({idType}).</li>
                    <li>Use the camera button to take a live photo or upload from gallery.</li>
                  </ul>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">Passport Picture</label>
                  <div className="relative">
                    <input
                      ref={passportInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFileSelected("passport", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => openDocumentPicker("passport")}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-all ${fieldErrors.passportPicture ? "border-red-300" : "border-zinc-200"}`}
                    >
                      {passportPicture ? passportPicture.name : "Choose file"}
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">{idType} (Front)</label>
                  <div className="relative">
                    <input
                      ref={idFrontInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFileSelected("front", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => openDocumentPicker("front")}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-all ${fieldErrors.idCardFront ? "border-red-300" : "border-zinc-200"}`}
                    >
                      {idCardFront ? idCardFront.name : "Choose file"}
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">{idType} (Back)</label>
                  <div className="relative">
                    <input
                      ref={idBackInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFileSelected("back", e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => openDocumentPicker("back")}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-all ${fieldErrors.idCardBack ? "border-red-300" : "border-zinc-200"}`}
                    >
                      {idCardBack ? idCardBack.name : "Choose file"}
                    </button>
                  </div>
                </div>
              </div>

              {documentPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
                  <button type="button" className="absolute inset-0" onClick={closeDocumentPicker} aria-label="Close" />
                  <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
                    {!cameraOpen ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-[#2d3436]">Select an option</p>
                        <button
                          type="button"
                          onClick={() => triggerFilePicker()}
                          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
                        >
                          Upload from device
                        </button>
                        <button
                          type="button"
                          onClick={() => setCameraOpen(true)}
                          className="w-full rounded-2xl bg-[#2d3436] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 transition-all"
                        >
                          Take a picture
                        </button>
                        <button
                          type="button"
                          onClick={closeDocumentPicker}
                          className="w-full rounded-2xl border border-transparent bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
                          <video ref={videoRef} className="h-64 w-full object-cover" playsInline muted />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setCameraOpen(false)}
                            className="w-1/2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="w-1/2 rounded-2xl bg-[#A8D5BA] px-4 py-3 text-sm font-semibold text-[#2d3436] hover:opacity-95 transition-all"
                          >
                            Capture
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={closeDocumentPicker}
                          className="w-full rounded-2xl border border-transparent bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="font-semibold text-sm text-[#2d3436] uppercase tracking-wider flex items-center gap-2"><CreditCard size={16} className="text-[#A8D5BA]" /> Payment Options</h3>
              <p className="text-xs text-zinc-500">Provide at least one payment method for your transactions. (Optional for now)</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Mobile Money</label>
                  <input value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} placeholder="MoMo Number" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowBankFields((prev) => {
                        const next = !prev;
                        if (!next) {
                          setBankAccountNumber("");
                          setBankSortCode("");
                          setBankName("");
                          setError("");
                        }
                        return next;
                      })
                    }
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
                    aria-expanded={showBankFields}
                  >
                    Bank Account
                  </button>
                  {showBankFields && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <Landmark size={12} /> Sort Code
                          </label>
                          <input
                            value={bankSortCode}
                            onChange={(e) => {
                              const value = normalizeDigits(e.target.value, 6);
                              setBankSortCode(value);
                              if (value.length >= 2) {
                                const detectedBank = getBankBySortCode(value);
                                if (detectedBank) {
                                  setBankName(detectedBank);
                                }
                              }
                            }}
                            placeholder="6-digit sort code"
                            inputMode="numeric"
                            maxLength={6}
                            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                          />
                          <p className="mt-2 text-[10px] text-zinc-400">Enter the 6-digit sort code to identify your bank and branch.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Account Number</label>
                          <input
                            value={bankAccountNumber}
                            onChange={(e) => {
                              setError("");
                              setBankAccountNumber(normalizeDigits(e.target.value, 16));
                            }}
                            onBlur={() => {
                              if (bankAccountNumber && !isValidGhanaBankAccountNumber(bankAccountNumber)) {
                                setError(
                                  "Bank account numbers must be 13 digits (universal banks) or 16 digits (rural banks)."
                                );
                              }
                            }}
                            placeholder="13 or 16 digits"
                            inputMode="numeric"
                            pattern="\d{13}|\d{16}"
                            title="Enter 13 digits (universal banks) or 16 digits (rural banks). Digits only."
                            maxLength={16}
                            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                          />
                          <p className="mt-2 text-xs text-zinc-500">Example: 1234567890123 or 1234567890123456</p>
                          {bankAccountNumberInvalid && (
                            <p className="mt-2 text-xs font-semibold text-red-600">
                              Enter exactly 13 digits or 16 digits.
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Bank Name (Auto-filled)</label>
                        <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="E.g. GCB Bank" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowCardFields((prev) => {
                        const next = !prev;
                        if (!next) {
                          setCardNumber("");
                          setError("");
                        }
                        return next;
                      })
                    }
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
                    aria-expanded={showCardFields}
                  >
                    Credit/Debit Card
                  </button>
                  {showCardFields && (
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-zinc-500 uppercase tracking-wider">Card Number</label>
                      <input
                        value={formatCardNumberDisplay(cardNumber)}
                        onChange={(e) => {
                          setError("");
                          setCardNumber(normalizeDigits(e.target.value, 19));
                        }}
                        onBlur={() => {
                          if (cardNumber && !/^\d{13,19}$/.test(cardNumber)) {
                            setError("Card numbers must be 13 to 19 digits.");
                          }
                        }}
                        placeholder="1234 5678 9012 3456"
                        inputMode="numeric"
                        pattern="[0-9 ]{13,23}"
                        title="Enter 13 to 19 digits. Digits only (spaces will be added automatically)."
                        maxLength={23}
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-[#A8D5BA] focus:ring-2 focus:ring-[#A8D5BA]/20 transition-all bg-zinc-50 focus:bg-white"
                      />
                      <p className="mt-2 text-xs text-zinc-500">Example: 4242424242424242 (displays as 4242 4242 4242 4242)</p>
                      {cardNumberInvalid && (
                        <p className="mt-2 text-xs font-semibold text-red-600">Enter 13 to 19 digits.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="font-semibold text-sm text-[#2d3436] uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={16} className="text-[#A8D5BA]" /> Login Credentials</h3>
              
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-2 mb-6">
                <p className="text-sm font-medium text-zinc-700">Account identifiers retrieved from Step 1:</p>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-zinc-100">
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Email</span>
                  <span className="text-sm font-medium">{email}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-zinc-100">
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Phone</span>
                  <span className="text-sm font-medium">{phoneNumber}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">Set Secure PIN</label>
                <input
                  required
                  value={pin}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, pin: false }));
                    setError("");
                    setPin(e.target.value);
                  }}
                  placeholder="PIN (4-6 digits)"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full rounded-2xl border px-4 py-4 outline-none focus:ring-2 transition-all bg-zinc-50 focus:bg-white text-2xl tracking-widest font-semibold text-center ${fieldErrors.pin ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-zinc-200 focus:border-[#A8D5BA] focus:ring-[#A8D5BA]/20"}`}
                />
                <p className="text-xs text-center text-zinc-400 mt-2">This PIN will be used for login and transactions.</p>
              </div>
            </motion.div>
          )}
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mt-6 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
            {error}
          </motion.p>
        )}

        <div className="relative z-10 mt-8 flex gap-4">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="w-1/3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Back
            </button>
          )}
          
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 3 && (bankAccountNumberInvalid || cardNumberInvalid)}
              className="flex-1 rounded-2xl bg-[#2d3436] px-4 py-4 font-semibold text-white shadow-sm hover:shadow-md transition-all"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-[#A8D5BA] px-4 py-4 font-semibold text-[#2d3436] disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
            >
              {loading ? "Registering..." : "Complete Registration"}
            </button>
          )}
        </div>
        
        {step === 1 && (
          <p className="relative z-10 mt-6 text-center text-sm font-medium text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#A8D5BA] hover:text-[#2d3436] transition-colors">
              Login
            </Link>
          </p>
        )}
      </motion.form>
    </div>
    </>
  );
}
