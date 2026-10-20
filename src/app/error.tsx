"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Something went wrong</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            An unexpected error occurred while processing your request. The issue has been logged.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-500 mt-2 bg-slate-950/60 py-1 px-2 rounded border border-slate-800 inline-block">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </Button>

          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "border-slate-800 text-slate-300 hover:bg-slate-800 gap-2 text-xs",
            })}
          >
            <Home className="w-3.5 h-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
