import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getExpensesList, getExpenseCategories } from "@/app/actions/expenses";
import { getAllPayments } from "@/app/actions/payments";
import { getJobCardsList } from "@/app/actions/job-cards";
import ExpensesClient from "@/components/expenses-client";

export default async function ExpensesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure role is admin
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [expenses, categories, payments, jobCards] = await Promise.all([
    getExpensesList(),
    getExpenseCategories(),
    getAllPayments(),
    getJobCardsList()
  ]);

  return (
    <ExpensesClient 
      initialExpenses={expenses} 
      categories={categories} 
      payments={payments}
      jobCards={jobCards}
    />
  );
}
