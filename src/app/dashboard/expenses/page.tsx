"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type UserProfile } from "@/lib/supabase/get-user";
import { getExpensesList, getExpenseCategories, getDailyClosings, type Expense, type ExpenseCategory, type DailyClosingRecord } from "@/app/actions/expenses";
import { getAllPayments, type Payment } from "@/app/actions/payments";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import ExpensesClient from "@/components/expenses-client";
import { Loader2 } from "lucide-react";

export default function ExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [closings, setClosings] = useState<DailyClosingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCurrentUser(),
      getExpensesList().catch(() => []),
      getExpenseCategories().catch(() => []),
      getAllPayments().catch(() => []),
      getJobCardsList().catch(() => []),
      getDailyClosings().catch(() => []),
    ])
      .then(([u, exp, cat, pmt, jc, cls]) => {
        if (!mounted) return;
        if (!u || (u.role !== "admin" && u.role !== "billing_staff")) {
          router.replace("/dashboard");
          return;
        }
        setUser(u);
        setExpenses(exp);
        setCategories(cat);
        setPayments(pmt);
        setJobCards(jc);
        setClosings(cls);
      })
      .catch((err) => {
        console.error("Failed to load expenses and register data:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading daily cash register & expenses...</p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "billing_staff")) return null;

  return (
    <ExpensesClient 
      initialExpenses={expenses} 
      categories={categories} 
      payments={payments}
      jobCards={jobCards}
      initialClosings={closings}
      currentUser={user}
    />
  );
}
