"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type UserProfile } from "@/lib/supabase/get-user";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import { getAllPayments, type Payment } from "@/app/actions/payments";
import { getExpensesList, type Expense } from "@/app/actions/expenses";
import { getCustomersList, type Customer } from "@/app/actions/customers";
import { getServicesReportData, type ServiceDetailReport } from "@/app/actions/reports";
import ReportsClient from "@/components/reports-client";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servicesData, setServicesData] = useState<ServiceDetailReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCurrentUser(),
      getJobCardsList().catch(() => []),
      getAllPayments().catch(() => []),
      getExpensesList().catch(() => []),
      getCustomersList().catch(() => []),
    ])
      .then(async ([u, jc, pmt, exp, cust]) => {
        if (!mounted) return;
        if (!u || (u.role !== "admin" && u.role !== "billing_staff")) {
          router.replace("/dashboard");
          return;
        }
        setUser(u);
        setJobCards(jc);
        setPayments(pmt);
        setExpenses(exp);
        setCustomers(cust);

        // Compute/fetch service line reports
        try {
          const sData = await getServicesReportData(jc);
          if (mounted) setServicesData(sData);
        } catch (e) {
          console.warn("Failed to get services report data:", e);
        }
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
        <p className="text-xs text-slate-400">Compiling analytics and business intelligence reports...</p>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "billing_staff")) return null;

  return (
    <ReportsClient
      jobCards={jobCards}
      payments={payments}
      expenses={expenses}
      customers={customers}
      servicesData={servicesData}
    />
  );
}
