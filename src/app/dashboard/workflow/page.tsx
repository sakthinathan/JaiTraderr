"use client";

import React, { useEffect, useState } from "react";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import { getShelfLocations, type ShelfLocation } from "@/app/actions/catalog";
import WorkflowClient from "@/components/workflow-client";
import { Loader2 } from "lucide-react";

export default function WorkflowPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [shelfLocations, setShelfLocations] = useState<ShelfLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getJobCardsList().catch(() => []),
      getShelfLocations().catch(() => []),
    ])
      .then(([jcs, shelves]) => {
        if (!mounted) return;
        setJobCards(jcs);
        setShelfLocations(shelves);
      })
      .catch((err) => {
        console.error("Failed to load workflow data:", err);
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
        <p className="text-xs text-slate-400">Loading workflow pipeline...</p>
      </div>
    );
  }

  return <WorkflowClient jobCards={jobCards} shelfLocations={shelfLocations} />;
}
