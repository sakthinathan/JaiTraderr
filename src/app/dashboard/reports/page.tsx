"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type UserProfile } from "@/lib/supabase/get-user";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import { getAllPayments, type Payment } from "@/app/actions/payments";
import { getExpensesList, type Expense } from "@/app/actions/expenses";
import ReportsClient from "@/components/reports-client";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCurrentUser(),
      getJobCardsList().catch(() => []),
      getAllPayments().catch(() => []),
      getExpensesList().catch(() => []),
    ])
      .then(([u, jc, pmt, exp]) => {
        if (!mounted) return;
        if (!u || u.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setUser(u);
        setJobCards(jc);
        setPayments(pmt);
        setExpenses(exp);
      })
      .catch((err) => {
        console.error("Failed to load reports data:", err);
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
        <p className="text-xs text-slate-400">Generating analytics reports...</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <ReportsClient
      jobCards={jobCards}
      payments={payments}
      expenses={expenses}
    />
  );
}
