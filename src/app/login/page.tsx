"use client";
/* eslint-disable react-hooks/immutability, @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, Mail, Lock, ShieldAlert, CheckCircle2, User, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const isPlaceholderEnv = 
        !process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

      if (isPlaceholderEnv) {
        // Enable mock demo login for evaluation purposes
        setSuccess(true);
        // Set a mock session cookie
        const role = data.email.split("@")[0] || "billing_staff";
        document.cookie = `sb-mock-token=${role}; path=/; max-age=86400;`;
        
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
        return;
      }

      // Real Supabase Authentication
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (email: string) => {
    setValue("email", email);
    setValue("password", "demo123456");
    handleSubmit(onSubmit)();
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-[#0a0f14]">

      {/* === LEFT PANEL — Full-bleed boutique photo === */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url('/laundry-login-bg.jpg')` }}
        />
        {/* Darkening gradient to bleed into right panel */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-[#0a0f14]" />
        {/* Bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f14]/80 via-transparent to-transparent" />

        {/* Floating brand badge bottom-left */}
        <div className="absolute bottom-10 left-10 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-amber-500/40 backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-300 text-xs font-semibold uppercase tracking-widest">Premium Dry Cleaning & Laundry</span>
          </div>
          <p className="text-[#94a3b8] text-[10px] mt-3 ml-1 uppercase tracking-wider">
            Since 2023 · Erode, Tamil Nadu
          </p>
        </div>
      </div>

      {/* === RIGHT PANEL — Login Card === */}
      <div className="relative z-10 w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 flex flex-col justify-center min-h-screen px-8 xl:px-12 py-10 bg-[#0a0f14]/95 lg:bg-[#0a0f14] border-l border-slate-800/60">

        {/* Subtle glowing background orb */}
        <div className="absolute top-1/3 -left-24 w-64 h-64 bg-teal-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            {/* Logo mark */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 flex-shrink-0">
              <span className="text-white font-black text-xl leading-none drop-shadow">J</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none" style={{ color: '#ffffff' }}>
                JaiLaundry
              </h1>
              <p className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: '#34d399' }}>
                Erode
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>
              Welcome back
            </h2>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
              Sign in to access the operations dashboard
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Alert Area */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Authentication approved! Redirecting...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: '#64748b' }} />
              <Input
                id="email"
                type="email"
                placeholder="you@jailaundry.com"
                className="pl-10 h-11 rounded-xl border text-sm"
                style={{ backgroundColor: 'rgba(15,23,42,0.7)', borderColor: '#334155', color: '#e2e8f0' }}
                disabled={loading || success}
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-rose-400 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: '#64748b' }} />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-11 rounded-xl border text-sm"
                style={{ backgroundColor: 'rgba(15,23,42,0.7)', borderColor: '#334155', color: '#e2e8f0' }}
                disabled={loading || success}
                {...register("password")}
              />
            </div>
            {errors.password && <p className="text-rose-400 text-xs">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-teal-700/20 transition-all duration-200 active:scale-[0.98] text-sm"
            disabled={loading || success}
          >
            {loading ? "Verifying credentials..." : "Sign in to Dashboard"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#475569' }}>Demo access</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
        </div>

        {/* Demo role shortcuts */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Admin", sub: "Full operations", email: "admin@jaitraderr.com" },
            { label: "Billing Staff", sub: "Job Cards & Payments", email: "billing@jaitraderr.com" },
            { label: "Processing", sub: "Status Workflow", email: "processing@jaitraderr.com" },
            { label: "Delivery", sub: "Invoice Collections", email: "delivery@jaitraderr.com" },
          ].map((role) => (
            <button
              key={role.email}
              type="button"
              onClick={() => handleDemoLogin(role.email)}
              disabled={loading || success}
              className="p-3 text-left rounded-xl border transition-all duration-150 group"
              style={{ backgroundColor: 'rgba(15,23,42,0.6)', borderColor: '#1e293b' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#0d9488')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
            >
              <span className="block text-xs font-semibold transition-colors" style={{ color: '#e2e8f0' }}>{role.label}</span>
              <span className="block text-[10px] mt-0.5" style={{ color: '#64748b' }}>{role.sub}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-center mt-8 uppercase tracking-wider" style={{ color: '#334155' }}>
          Secured access · Operations are logged
        </p>
      </div>
    </div>
  );
}
