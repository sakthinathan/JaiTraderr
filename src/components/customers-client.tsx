"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Search, 
  UserPlus, 
  Smartphone, 
  User, 
  MapPin, 
  Mail, 
  CheckCircle2, 
  UserCheck, 
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Bookmark
} from "lucide-react";
import { Customer, registerCustomer } from "@/app/actions/customers";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface CustomersClientProps {
  initialCustomers: Customer[];
}

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  mobile: z.string().min(10, { message: "Please enter a valid mobile number" }),
  whatsapp_number: z.string().optional(),
  same_as_mobile: z.boolean(),
  place_address: z.string().optional(),
  email: z.string().email({ message: "Invalid email" }).or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      whatsapp_number: "",
      same_as_mobile: true,
      place_address: "",
      email: "",
    },
  });

  const sameAsMobile = watch("same_as_mobile");

  const handleRegister = async (values: CustomerFormValues) => {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const res = await registerCustomer({
        name: values.name,
        mobile: values.mobile,
        whatsapp_number: values.same_as_mobile ? values.mobile : values.whatsapp_number,
        same_as_mobile: values.same_as_mobile,
        place_address: values.place_address,
        email: values.email || undefined,
      });

      if (!res.success) {
        setFormError(res.error || "Failed to register customer.");
      } else if (res.customer) {
        setFormSuccess(`Registered ${res.customer.name} successfully! Code: ${res.customer.customer_code}`);
        setCustomers([res.customer, ...customers]);
        setSelectedCustomer(res.customer);
        reset();
      }
    });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile.includes(searchQuery) ||
    c.customer_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Customer Database</h1>
        <p className="text-slate-400 text-sm mt-1">
          Perform live mobile lookups, inspect visit histories, or register new accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Lookup & Registration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lookup Card */}
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Live Mobile Lookup
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Type name, mobile number, or customer ID to search.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <Input
                  placeholder="Enter mobile number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-slate-950/60 border-slate-900 text-white placeholder-slate-600 focus:border-indigo-500"
                />
              </div>

              {/* Dynamic Instant Results */}
              {searchQuery && (
                <div className="mt-4 border border-slate-900 rounded-lg divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => setSelectedCustomer(cust)}
                        className={`w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-900/40 transition duration-150 ${
                          selectedCustomer?.id === cust.id ? "bg-indigo-600/10 border-l-2 border-indigo-500" : ""
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-sm text-slate-200">{cust.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{cust.mobile} • {cust.customer_code}</p>
                        </div>
                        <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                          View profile
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-slate-500 text-sm">No customers found matching &quot;{searchQuery}&quot;.</p>
                      <button
                        onClick={() => {
                          setValue("mobile", searchQuery.replace(/\D/g, ""));
                          const regForm = document.getElementById("registration-form");
                          if (regForm) regForm.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-xs text-indigo-400 mt-1 hover:underline font-semibold"
                      >
                        Register new customer with this mobile number
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Form Card */}
          <Card id="registration-form" className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                Register New Customer
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Create new operational account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2 animate-shake">
                    <ShieldAlert className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 text-sm">Full Name <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-9 bg-slate-950/40 border-slate-900 text-white placeholder-slate-700"
                        {...register("name")}
                        disabled={isPending}
                      />
                    </div>
                    {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-slate-300 text-sm">Mobile Number <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        id="mobile"
                        placeholder="9876543210"
                        className="pl-9 bg-slate-950/40 border-slate-900 text-white placeholder-slate-700"
                        {...register("mobile")}
                        disabled={isPending}
                      />
                    </div>
                    {errors.mobile && <p className="text-rose-500 text-xs">{errors.mobile.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2 border-y border-slate-900">
                  <input
                    type="checkbox"
                    id="same_as_mobile"
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 accent-indigo-600"
                    {...register("same_as_mobile")}
                    disabled={isPending}
                  />
                  <Label htmlFor="same_as_mobile" className="text-slate-400 text-xs cursor-pointer">
                    WhatsApp number is same as mobile number
                  </Label>
                </div>

                {!sameAsMobile && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="whatsapp_number" className="text-slate-300 text-sm">WhatsApp Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        id="whatsapp_number"
                        placeholder="9876543210"
                        className="pl-9 bg-slate-950/40 border-slate-900 text-white placeholder-slate-700"
                        {...register("whatsapp_number")}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        id="email"
                        placeholder="john@gmail.com"
                        className="pl-9 bg-slate-950/40 border-slate-900 text-white placeholder-slate-700"
                        {...register("email")}
                        disabled={isPending}
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="place_address" className="text-slate-300 text-sm">Place / Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        id="place_address"
                        placeholder="Flat, Road, Area..."
                        className="pl-9 bg-slate-950/40 border-slate-900 text-white placeholder-slate-700"
                        {...register("place_address")}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg active:scale-98 transition shadow-lg shadow-indigo-600/10"
                  >
                    {isPending ? "Registering..." : "Register Customer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Selected Customer Profile & History */}
        <div className="space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader className="border-b border-slate-900 pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Customer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {selectedCustomer ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                      <span className="text-base font-extrabold text-indigo-400">
                        {selectedCustomer.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-base leading-tight">{selectedCustomer.name}</p>
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-400 uppercase tracking-wider">
                        {selectedCustomer.customer_code}
                      </span>
                    </div>
                  </div>

                  {/* Details list */}
                  <div className="space-y-3.5 text-sm border-t border-slate-900 pt-4">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Mobile</span>
                      <span className="text-slate-300 font-medium">{selectedCustomer.mobile}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">WhatsApp</span>
                      <span className="text-slate-300 font-medium">
                        {selectedCustomer.whatsapp_number || "Same as mobile"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Email</span>
                      <span className="text-slate-300 font-medium truncate max-w-[150px]">
                        {selectedCustomer.email || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Address</span>
                      <span className="text-slate-300 font-medium text-right max-w-[180px]">
                        {selectedCustomer.place_address || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Financial Stats Summary (Phase 2 placeholder data) */}
                  {selectedCustomer.stats && (
                    <div className="border-t border-slate-900 pt-4 space-y-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                        Account Statistics
                      </p>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-900 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Total Orders</p>
                          <p className="text-xl font-bold text-white mt-0.5">{selectedCustomer.stats.totalJobCards}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-900 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Total Billed</p>
                          <p className="text-xl font-bold text-white mt-0.5">₹{selectedCustomer.stats.totalBilled}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-900 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Total Paid</p>
                          <p className="text-xl font-bold text-emerald-400 mt-0.5">₹{selectedCustomer.stats.totalPaid}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-900 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-medium">Outstanding</p>
                          <p className={`text-xl font-bold mt-0.5 ${
                            selectedCustomer.stats.outstandingBalance > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}>
                            ₹{selectedCustomer.stats.outstandingBalance}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Create order action shortcut */}
                  <div className="pt-2">
                    <Link 
                      href={`/dashboard/job-cards?customer=${selectedCustomer.id}`}
                      className={buttonVariants({ className: "w-full text-center bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium py-2 rounded-lg" })}
                    >
                      Create Job Card for {selectedCustomer.name.split(" ")[0]}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Bookmark className="w-12 h-12 text-slate-800 mx-auto stroke-1" />
                  <p className="text-slate-500 text-sm mt-3">Select a customer from the lookup list to inspect profile details.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
