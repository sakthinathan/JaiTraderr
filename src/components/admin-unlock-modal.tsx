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
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
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
        className="relative w-full sm:max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden z-10 bg-slate-950"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />

        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Admin Security Unlock
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {jobCardNumber} · <span className="text-slate-300 font-semibold">{customerName || "Customer"}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="font-extrabold text-base text-slate-900">Passcode Verified!</p>
              <p className="text-xs text-slate-600 font-medium">Unlocking job card for staff edits...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 leading-relaxed font-medium">
                Enter the supervisor passcode to override lock restrictions and edit clothes, rates, or notes.
                <div className="mt-1 font-mono text-[11px] text-amber-950 font-bold">Default PIN: 889900</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  Enter 6-Digit Admin Passcode
                </Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type={showPasscode ? "text" : "password"}
                    maxLength={10}
                    placeholder="••••••"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    className="pr-12 h-12 rounded-xl text-xl text-center border bg-white border-slate-300 text-[#033d29] font-mono tracking-[0.3em] font-extrabold shadow-sm focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800"
                  >
                    {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && <p className="text-rose-600 text-xs mt-1.5 font-bold text-center">{error}</p>}
              </div>

              {/* Quick Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPasscode((prev) => (prev.length < 8 ? prev + num : prev))}
                    className="h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-extrabold text-base transition active:scale-95 shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPasscode("")}
                  className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs transition active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setPasscode((prev) => (prev.length < 8 ? prev + "0" : prev))}
                  className="h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-extrabold text-base transition active:scale-95 shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPasscode((prev) => prev.slice(0, -1))}
                  className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs transition active:scale-95"
                >
                  ⌫
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-bold text-sm gap-2 bg-gradient-to-r from-amber-600 via-emerald-600 to-emerald-500 hover:from-amber-500 hover:to-emerald-400 text-white shadow-lg shadow-amber-600/15"
                disabled={loading || !passcode.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? "Verifying PIN..." : "Unlock Job Card"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
