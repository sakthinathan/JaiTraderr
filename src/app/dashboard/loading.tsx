import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-xl bg-slate-900/50 border border-slate-900 flex items-center justify-between p-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-800 rounded-md" />
          <div className="h-3 w-72 bg-slate-850 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-slate-800 rounded-lg" />
          <div className="h-9 w-28 bg-slate-850 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/40 border border-slate-900 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-800" />
            </div>
            <div className="h-6 w-24 bg-slate-800 rounded" />
            <div className="h-2 w-32 bg-slate-850 rounded" />
          </div>
        ))}
      </div>

      {/* Table / Details Skeleton */}
      <div className="h-72 rounded-xl bg-slate-900/30 border border-slate-900 p-6 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs font-medium tracking-wide text-slate-400">Loading operations context...</span>
      </div>
    </div>
  );
}
