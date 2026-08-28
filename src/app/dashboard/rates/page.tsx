import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getServices, getItems, getUnits, getCatalogRates } from "@/app/actions/catalog";
import RatesClient from "@/components/rates-client";

export default async function RatesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [rates, services, items, units] = await Promise.all([
    getCatalogRates(),
    getServices(),
    getItems(),
    getUnits(),
  ]);

  return (
    <RatesClient
      initialRates={rates}
      services={services}
      items={items}
      units={units}
      isAdmin={user.role === "admin"}
    />
  );
}
