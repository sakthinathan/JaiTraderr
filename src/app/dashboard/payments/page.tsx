import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getJobCardsList } from "@/app/actions/job-cards";
import PaymentsClient from "@/components/payments-client";

export default async function PaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const jobCards = await getJobCardsList();

  return <PaymentsClient initialJobCards={jobCards} />;
}
