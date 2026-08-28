"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sliders, 
  Tag, 
  Layers, 
  PlusCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Info,
  IndianRupee,
  Briefcase
} from "lucide-react";
import { 
  Service, 
  Item, 
  Unit, 
  ServiceItemRate, 
  addCatalogRate, 
  addService, 
  addItem 
} from "@/app/actions/catalog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface RatesClientProps {
  initialRates: ServiceItemRate[];
  services: Service[];
  items: Item[];
  units: Unit[];
  isAdmin: boolean;
}

const rateSchema = z.object({
  service_id: z.string().min(1, { message: "Please select a service" }),
  item_id: z.string().min(1, { message: "Please select an item" }),
  unit_id: z.string().min(1, { message: "Please select a unit" }),
  rate: z.number().min(0.01, { message: "Rate must be greater than zero" }),
});

type RateFormValues = z.infer<typeof rateSchema>;

export default function RatesClient({ 
  initialRates, 
  services: initialServices, 
  items: initialItems, 
  units, 
  isAdmin 
}: RatesClientProps) {
  const [rates, setRates] = useState<ServiceItemRate[]>(initialRates);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [items, setItems] = useState<Item[]>(initialItems);
  
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newItemName, setNewItemName] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      service_id: "",
      item_id: "",
      unit_id: "pcs",
      rate: 0,
    },
  });

  const handleAddRate = async (values: RateFormValues) => {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const res = await addCatalogRate(values);

      if (!res.success) {
        setFormError(res.error || "Failed to configure rate.");
      } else if (res.rate) {
        setFormSuccess(`Rate card configured successfully!`);
        // Remove duplicate active rate if existing and append new
        const updated = rates.map(r => 
          r.service_id === values.service_id && 
          r.item_id === values.item_id && 
          r.unit_id === values.unit_id 
            ? { ...r, is_active: false } 
            : r
        );
        setRates([res.rate, ...updated.filter(r => r.is_active)]);
        reset();
      }
    });
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName) return;

    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const res = await addService(newServiceName, newServiceDesc);
      if (res.success && res.service) {
        setFormSuccess(`Service "${res.service.name}" created successfully!`);
        setServices([...services, res.service]);
        setNewServiceName("");
        setNewServiceDesc("");
      } else {
        setFormError(res.error || "Failed to create service.");
      }
    });
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const res = await addItem(newItemName);
      if (res.success && res.item) {
        setFormSuccess(`Item "${res.item.name}" created successfully!`);
        setItems([...items, res.item]);
        setNewItemName("");
      } else {
        setFormError(res.error || "Failed to create item.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pricing & Services Rates Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure rates for specific Service + Item + Unit combinations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rates Matrix Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Active Rate Cards
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Prices matching operations for active laundry jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 font-semibold text-xs uppercase bg-slate-950/30">
                      <th className="px-6 py-3">Service</th>
                      <th className="px-6 py-3">Item Name</th>
                      <th className="px-6 py-3">Billing Unit</th>
                      <th className="px-6 py-3 text-right">Standard Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {rates.filter(r => r.is_active).map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-900/10 text-slate-300 transition">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-100">{rate.service_name}</span>
                        </td>
                        <td className="px-6 py-4">{rate.item_name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                            {rate.unit_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-400">
                          ₹{rate.rate.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {rates.filter(r => r.is_active).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500">
                          No pricing configurations defined.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Admin Management Panels */}
        <div className="space-y-6">
          {isAdmin ? (
            <>
              {/* Add New Rate Form */}
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-indigo-400" />
                    Configure Rate Card
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-xs">
                    Create or update pricing combination.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(handleAddRate)} className="space-y-4">
                    {formError && (
                      <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                    {formSuccess && (
                      <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{formSuccess}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="service_id" className="text-slate-300 text-xs">Select Service</Label>
                      <select
                        id="service_id"
                        className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-900 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        {...register("service_id")}
                        disabled={isPending}
                      >
                        <option value="">-- Choose Service --</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {errors.service_id && <p className="text-rose-500 text-[10px]">{errors.service_id.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="item_id" className="text-slate-300 text-xs">Select Item</Label>
                      <select
                        id="item_id"
                        className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-900 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        {...register("item_id")}
                        disabled={isPending}
                      >
                        <option value="">-- Choose Item --</option>
                        {items.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      {errors.item_id && <p className="text-rose-500 text-[10px]">{errors.item_id.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit_id" className="text-slate-300 text-xs">Billing Unit</Label>
                        <select
                          id="unit_id"
                          className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-900 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          {...register("unit_id")}
                          disabled={isPending}
                        >
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                          ))}
                        </select>
                        {errors.unit_id && <p className="text-rose-500 text-[10px]">{errors.unit_id.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rate" className="text-slate-300 text-xs">Rate (₹)</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                          <Input
                            id="rate"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-slate-950 border-slate-900 text-white"
                            {...register("rate", { valueAsNumber: true })}
                            disabled={isPending}
                          />
                        </div>
                        {errors.rate && <p className="text-rose-500 text-[10px]">{errors.rate.message}</p>}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-lg"
                    >
                      {isPending ? "Configuring..." : "Configure Rate"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Create Service Form */}
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Create New Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateService} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="serviceName" className="text-slate-300 text-xs">Service Name</Label>
                      <Input
                        id="serviceName"
                        placeholder="e.g. Dry Cleaning"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="bg-slate-950 border-slate-900 text-white h-8 text-xs"
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="serviceDesc" className="text-slate-300 text-xs">Description</Label>
                      <Input
                        id="serviceDesc"
                        placeholder="Optional details"
                        value={newServiceDesc}
                        onChange={(e) => setNewServiceDesc(e.target.value)}
                        className="bg-slate-950 border-slate-900 text-white h-8 text-xs"
                        disabled={isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isPending || !newServiceName}
                      className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs py-1.5 rounded-lg"
                    >
                      {isPending ? "Creating..." : "Create Service"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Create Item Form */}
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-indigo-400" />
                    Create New Item
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateItem} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="itemName" className="text-slate-300 text-xs">Item Name</Label>
                      <Input
                        id="itemName"
                        placeholder="e.g. Kurti"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="bg-slate-950 border-slate-900 text-white h-8 text-xs"
                        disabled={isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isPending || !newItemName}
                      className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white text-xs py-1.5 rounded-lg"
                    >
                      {isPending ? "Creating..." : "Create Item"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  Authorization Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-400 leading-relaxed">
                <div className="flex gap-2">
                  <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    Your current role (<span className="text-indigo-400 font-semibold">Staff User</span>) is restricted to catalog view access.
                  </p>
                </div>
                <p>
                  To configure pricing, services, or catalog rate items, you must be logged in as an authorized **System Administrator**.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
