"use client";

import React, { useEffect, useState } from "react";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import PaymentsClient from "@/components/payments-client";
import { Loader2 } from "lucide-react";

export default function PaymentsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getJobCardsList()
      .then((data) => {
        if (mounted) setJobCards(data);
      })
      .catch((err) => {
        console.error("Failed to load job cards for payments:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading payments ledger...</p>
      </div>
    );
  }

  return <PaymentsClient initialJobCards={jobCards} />;
}
