import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getJobCardsList } from "@/app/actions/job-cards";
import { getShelfLocations } from "@/app/actions/catalog";
import WorkflowClient from "@/components/workflow-client";

export default async function WorkflowPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [jobCards, shelfLocations] = await Promise.all([
    getJobCardsList(),
    getShelfLocations()
  ]);

  return <WorkflowClient jobCards={jobCards} shelfLocations={shelfLocations} />;
}
