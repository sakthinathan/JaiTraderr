"use client";

import React, { useEffect, useState } from "react";
import { getCustomersList, type Customer } from "@/app/actions/customers";
import CustomersClient from "@/components/customers-client";
import { Loader2 } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCustomersList()
      .then((data) => {
        if (mounted) setCustomers(data);
      })
      .catch((err) => {
        console.error("Failed to load customers:", err);
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
        <p className="text-xs text-slate-400">Loading customer directory...</p>
      </div>
    );
  }

  return <CustomersClient initialCustomers={customers} />;
}
