import React from "react";
import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
          <Search className="w-7 h-7" />
        </div>

        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">404 Error</span>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">Page Not Found</h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            The page or operational resource you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "default",
              size: "sm",
              className: "bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs",
            })}
          >
            <Home className="w-3.5 h-3.5" />
            Go to Dashboard
          </Link>

          <Link
            href="/login"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "border-slate-800 text-slate-300 hover:bg-slate-800 gap-2 text-xs",
            })}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
