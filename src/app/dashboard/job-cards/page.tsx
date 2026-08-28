import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getCustomersList } from "@/app/actions/customers";
import { getServices, getItems, getUnits, getCatalogRates } from "@/app/actions/catalog";
import { getJobCardsList } from "@/app/actions/job-cards";
import JobCardsClient from "@/components/job-cards-client";

export default async function JobCardsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [customers, services, items, units, rates, jobCards] = await Promise.all([
    getCustomersList(),
    getServices(),
    getItems(),
    getUnits(),
    getCatalogRates(),
    getJobCardsList(),
  ]);

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
