"use client";

import React, { useEffect, useState } from "react";
import { getCustomersList, type Customer } from "@/app/actions/customers";
import { getServices, getItems, getUnits, getCatalogRates, type Service, type Item, type Unit, type ServiceItemRate } from "@/app/actions/catalog";
import { getJobCardsList, type JobCard } from "@/app/actions/job-cards";
import JobCardsClient from "@/components/job-cards-client";
import { Loader2 } from "lucide-react";

export default function JobCardsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [rates, setRates] = useState<ServiceItemRate[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCustomersList().catch(() => []),
      getServices().catch(() => []),
      getItems().catch(() => []),
      getUnits().catch(() => []),
      getCatalogRates().catch(() => []),
      getJobCardsList().catch(() => []),
    ])
      .then(([c, s, itm, u, r, jc]) => {
        if (!mounted) return;
        setCustomers(c);
        setServices(s);
        setItems(itm);
        setUnits(u);
        setRates(r);
        setJobCards(jc);
      })
      .catch((err) => {
        console.error("Failed to load job cards data:", err);
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
        <p className="text-xs text-slate-400">Loading job card operations...</p>
      </div>
    );
  }

  return (
    <JobCardsClient
      customers={customers}
      services={services}
      items={items}
      units={units}
      rates={rates}
      initialJobCards={jobCards}
    />
  );
}
