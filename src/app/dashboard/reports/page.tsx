import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getJobCardsList } from "@/app/actions/job-cards";
import { getAllPayments } from "@/app/actions/payments";
import { getExpensesList } from "@/app/actions/expenses";
import ReportsClient from "@/components/reports-client";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure role is admin
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [jobCards, payments, expenses] = await Promise.all([
    getJobCardsList(),
    getAllPayments(),
    getExpensesList()
  ]);

  return (
    <ReportsClient
      jobCards={jobCards}
      payments={payments}
      expenses={expenses}
    />
  );
}
