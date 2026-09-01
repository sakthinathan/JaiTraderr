"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, X, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { verifyAdminPasscodeAndUnlock } from "@/app/actions/job-cards";

interface AdminUnlockModalProps {
  isOpen: boolean;
  jobCardId: string;
  jobCardNumber: string;
  customerName: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function AdminUnlockModal({
  isOpen,
  jobCardId,
  jobCardNumber,
  customerName,
  onVerified,
  onClose,
}: AdminUnlockModalProps) {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPasscode("");
      setError(null);
      setSuccess(false);
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the Admin Unlock PIN.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await verifyAdminPasscodeAndUnlock(jobCardId, passcode.trim());
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerified();
        }, 500);
      } else {
        setError(res.error || "Incorrect Admin Passcode.");
        setPasscode("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Failed to verify passcode. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden z-10"
        style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />

        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: "#f1f5f9" }}>
                Admin PIN Unlock
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
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>Passcode Verified!</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Unlocking job card...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-300">
                  Enter the Admin Passcode to override and unlock this job card for modifications.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold" style={{ color: "#cbd5e1" }}>
                  Admin Passcode / PIN
                </Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type={showPasscode ? "text" : "password"}
                    maxLength={10}
                    placeholder="Enter Admin PIN (Default: 889900)"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    className="pr-10 h-10 rounded-xl text-sm border bg-slate-950 border-slate-800 text-white font-mono tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && <p className="text-rose-400 text-xs mt-1 font-semibold">{error}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-10 rounded-xl font-semibold text-sm gap-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white"
                disabled={loading || !passcode.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? "Verifying PIN..." : "Verify & Unlock Job Card"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
