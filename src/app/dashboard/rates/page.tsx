"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser, type UserProfile } from "@/lib/supabase/get-user";
import { getServices, getItems, getUnits, getCatalogRates, type Service, type Item, type Unit, type ServiceItemRate } from "@/app/actions/catalog";
import RatesClient from "@/components/rates-client";
import { Loader2 } from "lucide-react";

export default function RatesPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rates, setRates] = useState<ServiceItemRate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCurrentUser(),
      getCatalogRates().catch(() => []),
      getServices().catch(() => []),
      getItems().catch(() => []),
      getUnits().catch(() => []),
    ])
      .then(([u, r, s, itm, un]) => {
        if (!mounted) return;
        setUser(u);
        setRates(r);
        setServices(s);
        setItems(itm);
        setUnits(un);
      })
      .catch((err) => {
        console.error("Failed to load catalog rates:", err);
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
        <p className="text-xs text-slate-400">Loading master price list...</p>
      </div>
    );
  }

  return (
    <RatesClient
      initialRates={rates}
      services={services}
      items={items}
      units={units}
      isAdmin={user?.role === "admin"}
    />
  );
}
