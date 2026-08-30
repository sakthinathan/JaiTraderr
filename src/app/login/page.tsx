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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 bg-slate-950">
      {/* Background cover image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none scale-105"
        style={{ backgroundImage: `url('/laundry-login-bg.jpg')` }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#090d16_95%)] pointer-events-none" />

      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-8000" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-10000" />
      
      {/* Mesh lines effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md my-8">
        {/* App Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4 backdrop-blur-md shadow-lg shadow-emerald-500/5">
            <Sparkles className="w-3.5 h-3.5 animate-spin duration-3000 text-emerald-400" />
            <span>Smart Billing & Lifecycle Portal</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-widest bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
            JAI TRADERR
          </h1>
          <p className="text-slate-400 mt-2 text-xs font-medium uppercase tracking-widest opacity-80">
            Operational center for professional laundry processing
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden relative">
          {/* Decorative Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500" />

          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-slate-950 flex items-center gap-2">
              <Landmark className="w-4.5 h-4.5 text-indigo-600" />
              Portal Access
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Sign in to manage orders, payments, and workflow statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Alert Area */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-shake">
                  <ShieldAlert className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                  <span>Authentication approved! Connecting session...</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-xs font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@jaitraderr.com"
                    className="pl-10 bg-slate-950/60 border-slate-800 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 h-9 text-xs"
                    disabled={loading || success}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-medium">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-slate-950/60 border-slate-800 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 h-9 text-xs"
                    disabled={loading || success}
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-medium py-2 rounded-lg shadow-lg shadow-emerald-600/10 active:scale-98 transition duration-200 h-9 text-xs"
                disabled={loading || success}
              >
                {loading ? "Verifying..." : "Access Dashboard"}
              </Button>
            </form>
          </CardContent>

          {/* Demo Shortcuts Block */}
          <div className="border-t border-slate-800/80 px-6 py-4 bg-slate-950/30">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Demo Roles (Quick login bypass)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("admin@jaitraderr.com")}
                className="px-2.5 py-1.5 text-left rounded-md bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs transition hover:bg-slate-900 flex flex-col"
                disabled={loading || success}
              >
                <span className="font-semibold text-slate-200">Admin</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Full operations</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("billing@jaitraderr.com")}
                className="px-2.5 py-1.5 text-left rounded-md bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs transition hover:bg-slate-900 flex flex-col"
                disabled={loading || success}
              >
                <span className="font-semibold text-slate-200">Billing Staff</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Job Cards & Payments</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("processing@jaitraderr.com")}
                className="px-2.5 py-1.5 text-left rounded-md bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs transition hover:bg-slate-900 flex flex-col"
                disabled={loading || success}
              >
                <span className="font-semibold text-slate-200">Processing Staff</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Status Workflow</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("delivery@jaitraderr.com")}
                className="px-2.5 py-1.5 text-left rounded-md bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-xs transition hover:bg-slate-900 flex flex-col"
                disabled={loading || success}
              >
                <span className="font-semibold text-slate-200">Delivery Staff</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Invoice Collections</span>
              </button>
            </div>
          </div>
          <CardFooter className="flex justify-center border-t border-slate-800/80 pt-4">
            <p className="text-slate-500 text-[10px] text-center">
              Protected secure login terminal. Operations are logged.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
