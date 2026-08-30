"use client";

import React, { useState, useRef, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck, RotateCcw, X, Loader2, CheckCircle2, Zap } from "lucide-react";

interface FirebaseOtpModalProps {
  isOpen: boolean;
  jobCardId: string;
  jobCardNumber: string;
  customerName: string;
  customerPhone: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function FirebaseOtpModal({
  isOpen,
  jobCardId,
  jobCardNumber,
  customerName,
  customerPhone,
  onVerified,
  onClose,
}: FirebaseOtpModalProps) {
  const [phone, setPhone] = useState(customerPhone || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    if (isOpen) {
      setPhone(customerPhone ? customerPhone.replace(/\D/g, "").slice(-10) : "");
      setOtp(["", "", "", "", "", ""]);
      setStep("phone");
      setError(null);
      setVerified(false);
      setLoading(false);
    }
  }, [isOpen, customerPhone]);

  const setupRecaptcha = () => {
    if (recaptchaRef.current) return;
    try {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container-firebase", {
        size: "invisible",
        callback: () => {},
      });
    } catch (e: any) {
      console.error("reCAPTCHA setup error:", e);
    }
  };

  const handleSendOTP = async () => {
    setError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const fullPhone = `+91${cleaned}`;
      const result = await signInWithPhoneNumber(auth, fullPhone, recaptchaRef.current!);
      confirmationRef.current = result;
      setStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      console.error("Firebase sendOTP error:", err);
      setError(err?.message || "Failed to send OTP via Firebase. Ensure reCAPTCHA / Phone Auth is enabled.");
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    if (!confirmationRef.current) {
      setError("Session expired. Please resend OTP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmationRef.current.confirm(code);
      setVerified(true);
      setTimeout(() => {
        onVerified();
      }, 600);
    } catch (err: any) {
      console.error("Firebase verifyOTP error:", err);
      setError("Invalid OTP code. Please check and try again.");
      setOtp(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div id="recaptcha-container-firebase" />

      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden z-10"
        style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500" />

        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "#f1f5f9" }}>
                Firebase Phone OTP
              </h3>
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>
                {jobCardNumber} · {customerName || "Customer"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {verified ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>Firebase Verified!</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Unlocking job card...</p>
            </div>
          ) : step === "phone" ? (
            <>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-300">
                  Firebase will send a SMS OTP to the customer's phone to authorize unlock.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold" style={{ color: "#cbd5e1" }}>
                  Mobile Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-xs font-semibold text-slate-400">+91</span>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10 h-10 rounded-xl text-sm border bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
              </div>

              <Button
                className="w-full h-10 rounded-xl font-semibold text-sm gap-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white"
                onClick={handleSendOTP}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {loading ? "Sending Firebase OTP..." : "Send SMS via Firebase"}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-300">
                  OTP sent to <span className="text-emerald-400 font-semibold">+91 {phone}</span>
                </p>
                <button
                  className="text-[11px] underline text-slate-500"
                  onClick={() => { setStep("phone"); setError(null); }}
                >
                  Change number
                </button>
              </div>

              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpInputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-10 h-12 text-center text-lg font-bold rounded-xl border outline-none bg-slate-950 text-white border-slate-800 focus:border-amber-500"
                  />
                ))}
              </div>

              {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

              <Button
                className="w-full h-10 rounded-xl font-semibold text-sm gap-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white"
                onClick={handleVerifyOTP}
                disabled={loading || otp.join("").length !== 6}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? "Verifying..." : "Verify & Unlock"}
              </Button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-xs text-slate-500">Resend in {resendTimer}s</p>
                ) : (
                  <button className="text-xs text-amber-400 flex items-center gap-1 mx-auto" onClick={handleSendOTP}>
                    <RotateCcw className="w-3 h-3" /> Resend OTP
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
