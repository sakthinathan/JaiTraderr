"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  FileText, 
  Search, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  User,
  Smartphone,
  Sparkles,
  IndianRupee,
  PackageCheck,
  ClipboardList,
  Share2,
  Zap
} from "lucide-react";
import { Customer } from "@/app/actions/customers";
import { Service, Item, Unit, ServiceItemRate } from "@/app/actions/catalog";
import { createDraftJobCard, addItemsToJobCard, closeAndLockJobCard, getJobCardDetails, unlockJobCard, requestJobCardUnlockOtp, verifyOtpAndUnlockJobCard, JobCard } from "@/app/actions/job-cards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface JobCardsClientProps {
  customers: Customer[];
  services: Service[];
  items: Item[];
  units: Unit[];
  rates: ServiceItemRate[];
  initialJobCards: JobCard[];
}

interface SelectedItemLine {
  item_id: string;
  item_name: string;
  unit_id: string;
  rate: number;
  quantity: number;
  remarks: string;
}

interface SelectedServiceGroup {
  service_id: string;
  service_name: string;
  items: SelectedItemLine[];
}

export default function JobCardsClient({ 
  customers, 
  services, 
  items, 
  units, 
  rates,
  initialJobCards
}: JobCardsClientProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>(initialJobCards);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Form State
  const [selectedServices, setSelectedServices] = useState<SelectedServiceGroup[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [expectedDate, setExpectedDate] = useState(() => {
    // Default to 2 days later
    const date = new Date(Date.now() + 172800000);
    return date.toISOString().split("T")[0];
  });
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [totalPcs, setTotalPcs] = useState<number>(0);
  const [totalBags, setTotalBags] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Detailed View State for Directory
  const [detailedJc, setDetailedJc] = useState<JobCard | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Date wise filter states for active directory
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterType, setFilterType] = useState<"booking" | "delivery">("delivery");

  // Editing state for existing cards
  const [editingJobCardId, setEditingJobCardId] = useState<string | null>(null);

  // OTP Unlocking States
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleViewJcDetails = async (jc: JobCard) => {
    setLoadingDetails(true);
    setDetailedJc(jc);
    try {
      const fullDetails = await getJobCardDetails(jc.id);
      if (fullDetails) {
        setDetailedJc(fullDetails);
      }
    } catch (err) {
      console.error("Failed to load nested job card items:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditJobCard = (jc: JobCard) => {
    setEditingJobCardId(jc.id);
    
    // 1. Find Customer
    const cust = customers.find(c => c.name === jc.customer_name || c.id === jc.customer_id);
    if (cust) {
      setSelectedCust(cust);
    } else {
      setSelectedCust({
        id: jc.customer_id,
        customer_code: "CUST-TEMP",
        name: jc.customer_name || "Guest Customer",
        mobile: jc.customer_mobile || "",
        whatsapp_number: jc.customer_mobile || "",
        same_as_mobile: true,
        place_address: "",
        email: "",
        is_active: true,
        branch_id: jc.branch_id || "",
        created_at: new Date().toISOString(),
      });
    }

    // 2. Map Services and Items snapshot
    const mappedServices: SelectedServiceGroup[] = (jc.services || []).map(svc => ({
      service_id: svc.service_id,
      service_name: svc.service_name_snapshot,
      items: (svc.items || []).map(item => ({
        item_id: item.item_id || "custom",
        item_name: item.item_name_snapshot,
        unit_id: item.unit_id_snapshot,
        rate: item.rate_snapshot,
        quantity: item.quantity,
        remarks: item.remarks || "",
      }))
    }));

    setSelectedServices(mappedServices);
    setDiscount(jc.discount);
    setTax(jc.tax_amount);
    setAdvance(jc.advance_paid);
    setRemarks(jc.remarks || "");
    setTotalWeight(jc.total_weight_kg || 0);
    setTotalPcs(jc.total_pcs || 0);
    setTotalBags(jc.total_bags || 0);
    if (jc.expected_delivery_date) {
      setExpectedDate(jc.expected_delivery_date.split('T')[0]);
    }
    
    // Switch to Step 2
    setStep(2);
    setDetailedJc(null); // Close details modal
  };

  const handleRequestUnlockOtp = (jc: JobCard) => {
    setOtpRequested(true);
    setOtpError(null);
    setOtpValue("");
    
    startTransition(async () => {
      const res = await requestJobCardUnlockOtp(jc.id);
      if (!res.success) {
        setOtpRequested(false);
        setOtpError(res.error || "Failed to dispatch OTP.");
        alert(res.error || "Failed to dispatch OTP.");
      }
    });
  };

  const handleVerifyAndUnlock = async (jc: JobCard) => {
    if (otpValue.length < 6) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }

    startTransition(async () => {
      const res = await verifyOtpAndUnlockJobCard(jc.id, otpValue);
      if (res.success) {
        setOtpRequested(false);
        setOtpError(null);
        
        // Trigger reload
        const fullDetails = await getJobCardDetails(jc.id);
        const updatedJc = fullDetails || { ...jc, is_locked: false };
        
        // Load into editor
        handleEditJobCard(updatedJc);
      } else {
        setOtpError(res.error || "Failed to unlock job card.");
      }
    });
  };

  const buildWhatsAppLink = (jc: JobCard) => {
    const name = jc.customer_name || "Customer";
    const num = jc.job_card_number;
    const total = jc.grand_total.toFixed(2);
    const advance = jc.advance_paid.toFixed(2);
    const balance = jc.balance_due.toFixed(2);
    const shelf = jc.shelf_location || "N/A";
    
    let text = `*JaiTraderr Laundry Billing Receipt*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Here is your summary for Order *${num}*:\n\n`;
    text += `• Total Billed: ₹${total}\n`;
    text += `• Advance Paid: ₹${advance}\n`;
    text += `• Balance Due: ₹${balance}\n`;
    if (jc.status === "READY_FOR_DELIVERY") {
      text += `• Status: *Ready for Pickup*\n`;
      text += `• Shelf Location: *${shelf}*\n`;
    } else {
      text += `• Status: *${jc.status}*\n`;
    }
    text += `\nThank you for choosing JaiTraderr! For questions, call us directly.`;

    const cleanMobile = (jc.customer_mobile || "").replace(/\D/g, "");
    const formattedMobile = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
    return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(text)}`;
  };

  // Search filter
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile.includes(searchQuery)
  );

  // Date-wise active job directory filtering
  const filteredJobCards = jobCards.filter(jc => {
    if (!filterDate) return true;
    const dateStr = filterType === "delivery" ? jc.expected_delivery_date : jc.created_at;
    if (!dateStr) return false;
    return dateStr.split("T")[0] === filterDate;
  });

  // Helpers
  const addServiceGroup = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (selectedServices.some(s => s.service_id === serviceId)) return;

    setSelectedServices([...selectedServices, {
      service_id: serviceId,
      service_name: service.name,
      items: []
    }]);
  };

  const removeServiceGroup = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.service_id !== serviceId));
  };

  const addItemRow = (serviceId: string) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id !== serviceId) return s;
      return {
        ...s,
        items: [...s.items, {
          item_id: "",
          item_name: "",
          unit_id: "pcs",
          rate: 0,
          quantity: 1,
          remarks: ""
        }]
      };
    }));
  };

  const removeItemRow = (serviceId: string, itemIdx: number) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id !== serviceId) return s;
      return {
        ...s,
        items: s.items.filter((_, idx) => idx !== itemIdx)
      };
    }));
  };

  const updateItemRow = (
    serviceId: string, 
    itemIdx: number, 
    field: keyof SelectedItemLine, 
    value: any
  ) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.service_id !== serviceId) return s;
      
      const newItems = s.items.map((item, idx) => {
        if (idx !== itemIdx) return item;

        const updated = { ...item, [field]: value };

        // Auto lookup rate if item, service, or unit changes
        if (field === "item_id" || field === "unit_id") {
          const itemId = field === "item_id" ? value : item.item_id;
          
          if (itemId === "custom") {
            updated.item_name = field === "item_id" ? "" : item.item_name;
            updated.rate = field === "item_id" ? 0 : item.rate;
          } else {
            const itemObj = items.find(i => i.id === itemId);
            if (itemObj) {
              updated.item_name = itemObj.name;
            }
            
            const unitId = field === "unit_id" ? value : item.unit_id;

            const matchRate = rates.find(r => 
              r.service_id === serviceId && 
              r.item_id === itemId && 
              r.unit_id === unitId && 
              r.is_active
            );

            updated.rate = matchRate ? matchRate.rate : 0;
          }
        }

        return updated;
      });

      return { ...s, items: newItems };
    }));
  };

  // Calculations
  const subtotal = selectedServices.reduce((acc, svc) => {
    return acc + svc.items.reduce((sAcc, item) => sAcc + (item.rate * item.quantity), 0);
  }, 0);

  const grandTotal = Math.max(0, subtotal - discount + tax);
  const balanceDue = grandTotal - advance;

  // Submit Operations
  const handleSaveJobCard = async (lock: boolean) => {
    setFormError(null);
    setFormSuccess(null);

    if (!selectedCust) {
      setFormError("Please select a customer.");
      return;
    }

    if (selectedServices.length === 0 || selectedServices.every(s => s.items.length === 0)) {
      setFormError("Please add at least one item row to bill.");
      return;
    }

    // Verify all rows have items selected
    for (const svc of selectedServices) {
      if (svc.items.some(i => !i.item_id)) {
        setFormError("Please select an item for all added rows.");
        return;
      }
    }

    startTransition(async () => {
      let jobCardId = editingJobCardId;

      if (!jobCardId) {
        // 1. Create Draft Job Card
        const dRes = await createDraftJobCard(selectedCust.id);
        if (!dRes.success || !dRes.jobCard) {
          setFormError(dRes.error || "Failed to initialize job card transaction.");
          return;
        }
        jobCardId = dRes.jobCard.id;
      }

      // 2. Add Items
      const itemsRes = await addItemsToJobCard(jobCardId, selectedServices);
      if (!itemsRes.success) {
        setFormError(itemsRes.error || "Failed to commit billing items.");
        return;
      }

      // 3. Close and Lock (if requested)
      if (lock) {
        const lockRes = await closeAndLockJobCard(jobCardId, {
          discount,
          tax_amount: tax,
          advance_paid: advance,
          expected_delivery_date: new Date(expectedDate).toISOString(),
          remarks,
          total_weight_kg: totalWeight,
          total_pcs: totalPcs,
          total_bags: totalBags,
        });

        if (!lockRes.success) {
          setFormError(lockRes.error || "Failed to close and lock transaction.");
          return;
        }

        setFormSuccess(`Job Card closed and locked successfully!`);
      } else {
        setFormSuccess(`Draft Job Card saved successfully.`);
      }

      // Refresh list
      const { getJobCardsList } = await import("@/app/actions/job-cards");
      const list = await getJobCardsList();
      setJobCards(list);

      // Reset
      setSelectedCust(null);
      setSelectedServices([]);
      setDiscount(0);
      setTax(0);
      setAdvance(0);
      setRemarks("");
      setTotalWeight(0);
      setTotalPcs(0);
      setTotalBags(0);
      setEditingJobCardId(null);
      setStep(1);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RECEIVED": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "WASHING": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "IRONING": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "READY_FOR_DELIVERY": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DELIVERED": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Job Cards Billing</h1>
        <p className="text-slate-400 text-sm mt-1">
          Create new orders, calculate line amounts automatically, and close transaction cards.
        </p>
      </div>

      {/* Main Grid: Left form steps, Right active cards list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Form steps */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader className="border-b border-slate-900/60 pb-5">
              {/* Step indicator bar */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  <CardTitle className="text-base font-extrabold text-white">
                    {step === 1 && "Select Customer Profile"}
                    {step === 2 && (editingJobCardId ? "Edit Job Card Details" : "Configure Services & Items")}
                    {step === 3 && "Review Billing & Close Card"}
                  </CardTitle>
                </div>
                
                {/* Horizontal Progress Path */}
                <div className="flex items-center justify-between w-full max-w-md mx-auto pt-2">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${step >= 1 ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900 text-slate-500 border border-slate-800"}`}>1</div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">Customer</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 transition duration-300 ${step >= 2 ? "bg-indigo-500" : "bg-slate-900"}`} />
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${step >= 2 ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900 text-slate-500 border border-slate-800"}`}>2</div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">Items</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 transition duration-300 ${step >= 3 ? "bg-indigo-500" : "bg-slate-900"}`} />
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition duration-300 ${step >= 3 ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-900 text-slate-500 border border-slate-800"}`}>3</div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">Review</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* STEP 1: Customer lookup */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Search Customer</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                      <Input
                        placeholder="Type customer mobile number or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-900 text-white placeholder-slate-700 h-10"
                      />
                    </div>
                  </div>

                  {/* Customer Search results list */}
                  {searchQuery && (
                    <div className="border border-slate-900 rounded-lg divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40 max-h-48 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(cust => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCust(cust);
                              setSearchQuery("");
                            }}
                            className="w-full p-3 text-left hover:bg-slate-900/40 text-slate-300 flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <p className="font-semibold text-slate-200">{cust.name}</p>
                              <p className="text-slate-500 mt-0.5">{cust.mobile} • {cust.customer_code}</p>
                            </div>
                            <span className="text-indigo-400 font-medium">Select</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No customer found.{" "}
                          <Link href="/dashboard/customers" className="text-indigo-400 hover:underline font-semibold">
                            Register new customer first
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected customer card */}
                  {selectedCust ? (
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-600/5 flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                          <User className="w-4.5 h-4.5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{selectedCust.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{selectedCust.mobile} • {selectedCust.customer_code}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setStep(2)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 h-9"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-10 border border-dashed border-slate-900 rounded-xl text-center">
                      <Smartphone className="w-10 h-10 text-slate-800 mx-auto stroke-1" />
                      <p className="text-slate-500 text-xs mt-3">Perform lookup above to link a customer profile to this billing card.</p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Catalog additions */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Select Service header dropdown */}
                  <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-slate-400">Select Service Group to Add:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addServiceGroup(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="bg-slate-950 border border-slate-900 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none"
                    >
                      <option value="">-- Choose Service --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Added Service Blocks */}
                  {selectedServices.map((svcGroup) => (
                    <div key={svcGroup.service_id} className="p-4 rounded-xl border border-slate-900 bg-slate-950/10 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-sm font-bold text-white uppercase tracking-wider">{svcGroup.service_name}</span>
                        <button
                          type="button"
                          onClick={() => removeServiceGroup(svcGroup.service_id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Remove service group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Items rows */}
                      <div className="space-y-4">
                        {svcGroup.items.map((row, rowIdx) => (
                          <div key={rowIdx} className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 p-4 rounded-xl space-y-3 sm:space-y-0 sm:grid sm:grid-cols-6 sm:gap-4 sm:items-center transition duration-200">
                            
                            {/* Item name selector */}
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Item</Label>
                              <select
                                value={row.item_id}
                                onChange={(e) => updateItemRow(svcGroup.service_id, rowIdx, "item_id", e.target.value)}
                                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:outline-none"
                              >
                                <option value="">-- Choose Item --</option>
                                {items.map(i => (
                                  <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                                <option value="custom">-- Custom Item (Type Name) --</option>
                              </select>

                              {row.item_id === "custom" && (
                                <Input
                                  placeholder="Type custom item..."
                                  value={row.item_name || ""}
                                  onChange={(e) => updateItemRow(svcGroup.service_id, rowIdx, "item_name", e.target.value)}
                                  className="h-9 mt-1.5 bg-slate-950 border-slate-800 text-xs text-white focus:border-indigo-500"
                                />
                              )}
                            </div>

                            {/* Billing Unit */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unit</Label>
                              <select
                                value={row.unit_id}
                                onChange={(e) => updateItemRow(svcGroup.service_id, rowIdx, "unit_id", e.target.value)}
                                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:outline-none"
                              >
                                {units.map(u => (
                                  <option key={u.id} value={u.id}>{u.id}</option>
                                ))}
                              </select>
                            </div>

                            {/* Rate Display */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rate</Label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-500">₹</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.rate || ""}
                                  onChange={(e) => updateItemRow(svcGroup.service_id, rowIdx, "rate", Number(e.target.value))}
                                  className="h-9 pl-6 bg-slate-950 border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                                  disabled={isPending}
                                />
                              </div>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qty</Label>
                              <Input
                                type="number"
                                step="any"
                                value={row.quantity}
                                onChange={(e) => updateItemRow(svcGroup.service_id, rowIdx, "quantity", Number(e.target.value))}
                                className="h-9 bg-slate-950 border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                              />
                            </div>

                            {/* Line Subtotal & Delete */}
                            <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0 border-t border-slate-800/45 sm:border-0">
                              <div className="text-right flex-1 pr-1">
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Line Total</p>
                                <p className="text-sm font-black text-indigo-400">₹{(row.rate * row.quantity).toFixed(2)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItemRow(svcGroup.service_id, rowIdx)}
                                className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 transition shrink-0"
                                title="Delete row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => addItemRow(svcGroup.service_id)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-900/40 p-2 h-8 justify-start gap-1.5 w-full border border-dashed border-slate-900 rounded-lg mt-2"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Add item row
                        </Button>
                      </div>
                    </div>
                  ))}

                  {selectedServices.length === 0 && (
                    <div className="py-12 border border-dashed border-slate-900 rounded-xl text-center">
                      <Sparkles className="w-10 h-10 text-slate-800 mx-auto stroke-1" />
                      <p className="text-slate-500 text-xs mt-3">Select a service group from the selector above to start billing.</p>
                    </div>
                  )}

                  {/* Next Step Controls */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <Button
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-white gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={selectedServices.length === 0 || selectedServices.every(s => s.items.length === 0)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                    >
                      Review billing
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Review & Lock */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Financial inputs block */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount" className="text-slate-300 text-xs">Discount (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                        <Input
                          id="discount"
                          type="number"
                          value={discount || ""}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="pl-8 bg-slate-950 border-slate-900 text-white"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax" className="text-slate-300 text-xs">Tax / GST (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                        <Input
                          id="tax"
                          type="number"
                          value={tax || ""}
                          onChange={(e) => setTax(Number(e.target.value))}
                          className="pl-8 bg-slate-950 border-slate-900 text-white"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="advance" className="text-slate-300 text-xs">Advance Paid (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                        <Input
                          id="advance"
                          type="number"
                          value={advance || ""}
                          onChange={(e) => setAdvance(Number(e.target.value))}
                          className="pl-8 bg-slate-950 border-slate-900 text-white"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics (Kg, Pcs, Bags) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-900/60 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalWeight" className="text-slate-300 text-xs">Overall Weight (Kg)</Label>
                      <Input
                        id="totalWeight"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4.50"
                        value={totalWeight || ""}
                        onChange={(e) => setTotalWeight(Number(e.target.value))}
                        className="bg-slate-950 border-slate-900 text-white font-mono"
                        disabled={isPending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalPcs" className="text-slate-300 text-xs">Overall Dress Pieces (Qty)</Label>
                      <Input
                        id="totalPcs"
                        type="number"
                        placeholder="e.g. 12"
                        value={totalPcs || ""}
                        onChange={(e) => setTotalPcs(Number(e.target.value))}
                        className="bg-slate-950 border-slate-900 text-white font-mono"
                        disabled={isPending}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalBags" className="text-slate-300 text-xs">Overall Bags count</Label>
                      <Input
                        id="totalBags"
                        type="number"
                        placeholder="e.g. 2"
                        value={totalBags || ""}
                        onChange={(e) => setTotalBags(Number(e.target.value))}
                        className="bg-slate-950 border-slate-900 text-white font-mono"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expectedDate" className="text-slate-300 text-xs">Expected Delivery Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <Input
                          id="expectedDate"
                          type="date"
                          value={expectedDate}
                          onChange={(e) => setExpectedDate(e.target.value)}
                          className="pl-9 bg-slate-950 border-slate-900 text-white"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks" className="text-slate-300 text-xs">Remarks / Instructions</Label>
                      <Input
                        id="remarks"
                        placeholder="e.g. Silk saree handle gently, shirt collar stain..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="bg-slate-950 border-slate-900 text-white"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  {/* Summary receipt review */}
                  <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 space-y-3.5 text-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Summary Receipt Preview</p>
                    <div className="flex justify-between items-center border-b border-slate-900/60 pb-2">
                      <span className="text-slate-400">Total Billed Items Subtotal</span>
                      <span className="text-slate-200 font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Discount Applied</span>
                        <span className="text-rose-400 font-semibold">-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Tax / Surcharges</span>
                        <span className="text-slate-200 font-semibold">+₹{tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-b border-slate-900/80 py-2.5 font-bold">
                      <span className="text-white text-base">Grand Total</span>
                      <span className="text-indigo-400 text-base">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Advance Amount Paid</span>
                      <span className="text-emerald-400 font-semibold">-₹{advance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold border-t border-slate-900/40 pt-2 text-base">
                      <span className="text-slate-300">Balance Due</span>
                      <span className={balanceDue > 0 ? "text-rose-400" : "text-emerald-400"}>
                        ₹{balanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Form Submission Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-slate-900">
                    <Button
                      variant="ghost"
                      onClick={() => setStep(2)}
                      className="text-slate-400 hover:text-white gap-1.5"
                      disabled={isPending}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleSaveJobCard(false)}
                        disabled={isPending}
                        className="bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800"
                      >
                        Save Draft
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSaveJobCard(true)}
                        disabled={isPending}
                        className="bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium gap-1.5 shadow-lg shadow-indigo-600/10"
                      >
                        <PackageCheck className="w-4.5 h-4.5" />
                        Close & Lock
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Job Cards directory */}
        <div className="space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader className="space-y-3 border-b border-slate-900/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-indigo-400" />
                    Active Job Directory
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-[10px]">
                    Ongoing job cards inside processing queues.
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 items-center text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "booking" | "delivery")}
                  className="h-8 px-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-white focus:outline-none"
                >
                  <option value="delivery">Delivery Date</option>
                  <option value="booking">Booking Date</option>
                </select>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="h-8 text-[11px] bg-slate-950 border-slate-850 text-white font-mono flex-1"
                />
                {filterDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFilterDate("")}
                    className="h-7 px-2 text-[10px] text-rose-400 hover:text-rose-300 font-bold shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 pt-4">
              {filteredJobCards.map((jc) => (
                <div 
                  key={jc.id}
                  onClick={() => handleViewJcDetails(jc)}
                  className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition duration-150 relative group cursor-pointer hover:bg-slate-900/10 active:scale-99"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-white">{jc.job_card_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(jc.status)}`}>
                      {jc.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-200">{jc.customer_name}</p>
                    <p className="text-[10px] text-slate-500">{jc.customer_mobile}</p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      Del: {jc.expected_delivery_date ? jc.expected_delivery_date.split('T')[0].split('-').reverse().join('/') : ""}
                    </span>
                    <div>
                      {jc.balance_due > 0 ? (
                        <span className="text-rose-400 font-bold">Due: ₹{jc.balance_due}</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">Paid</span>
                      )}
                    </div>
                  </div>

                  {jc.is_locked && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" title="Locked" />
                  )}
                </div>
              ))}
              {filteredJobCards.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No active job cards matching current filters.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: Job Card Detailed Viewer */}
      <Dialog open={!!detailedJc} onOpenChange={(open) => { if (!open) setDetailedJc(null); }}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              <span>Job Card Summary</span>
              {detailedJc?.is_locked && (
                <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Locked</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Full transaction receipt and service tracking logic for {detailedJc?.job_card_number}
            </DialogDescription>
          </DialogHeader>

          {detailedJc && (
            <div className="space-y-5 py-2 max-h-[450px] overflow-y-auto pr-1">
              
              {/* Meta information */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Customer</p>
                  <p className="text-slate-200 mt-0.5 font-bold text-sm">{detailedJc.customer_name || "Guest Customer"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Mobile</p>
                  <p className="text-slate-200 mt-0.5 font-mono">{detailedJc.customer_mobile || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Expected Delivery</p>
                  <p className="text-slate-200 mt-0.5 font-semibold">
                    {detailedJc.expected_delivery_date ? detailedJc.expected_delivery_date.split('T')[0].split('-').reverse().join('/') : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Shelf Location</p>
                  <p className="text-slate-200 mt-0.5 font-semibold uppercase">{detailedJc.shelf_location || "Not assigned"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Staff Remarks</p>
                  <p className="text-slate-300 mt-0.5 italic">{detailedJc.remarks || "No remarks entered."}</p>
                </div>
                
                {/* Overall counts metrics */}
                <div className="col-span-2 grid grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-900/60 mt-1">
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">Overall Weight</p>
                    <p className="text-slate-200 font-mono mt-0.5 font-bold">{detailedJc.total_weight_kg ? `${detailedJc.total_weight_kg} Kg` : "0 Kg"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">Overall Pieces</p>
                    <p className="text-slate-200 mt-0.5 font-bold">{detailedJc.total_pcs ? `${detailedJc.total_pcs} Pcs` : "0 Pcs"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">Overall Bags</p>
                    <p className="text-slate-200 mt-0.5 font-bold">{detailedJc.total_bags ? `${detailedJc.total_bags} Bags` : "0 Bags"}</p>
                  </div>
                </div>
              </div>

              {/* Items details table */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Services & Items Checklist</p>
                
                {loadingDetails ? (
                  <p className="text-xs text-slate-500 py-3">Loading items checklist...</p>
                ) : detailedJc.services && detailedJc.services.length > 0 ? (
                  <div className="space-y-3">
                    {detailedJc.services.map((svc) => (
                      <div key={svc.id} className="p-3 bg-slate-950/20 rounded-xl border border-slate-900 space-y-2">
                        <p className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">{svc.service_name_snapshot}</p>
                        <div className="divide-y divide-slate-900/60">
                          {svc.items?.map((item) => (
                            <div key={item.id} className="py-2 flex justify-between text-xs items-center">
                              <div>
                                <p className="font-semibold text-slate-250">{item.item_name_snapshot}</p>
                                {item.remarks && <p className="text-[10px] text-slate-500 italic mt-0.5">&quot;{item.remarks}&quot;</p>}
                              </div>
                              <span className="font-mono text-slate-300 text-right">
                                {item.quantity} {item.unit_id_snapshot} × ₹{item.rate_snapshot} = <span className="font-bold text-white">₹{item.amount}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3">No items logged in this card.</p>
                )}
              </div>

              {/* Ledger/Financials Summary */}
              <div className="border-t border-slate-900 pt-4 space-y-2 text-xs bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{detailedJc.subtotal.toFixed(2)}</span>
                </div>
                {detailedJc.discount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount:</span>
                    <span className="font-mono text-rose-400">- ₹{detailedJc.discount.toFixed(2)}</span>
                  </div>
                )}
                {detailedJc.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Tax:</span>
                    <span className="font-mono text-emerald-400">+ ₹{detailedJc.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-950 border-t border-slate-900 pt-2.5">
                  <span>Grand Total:</span>
                  <span className="font-mono text-indigo-600">₹{detailedJc.grand_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Advance Paid:</span>
                  <span className="font-mono text-emerald-400">₹{detailedJc.advance_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-900 pt-2 text-slate-200">
                  <span>Balance Due:</span>
                  <span className="font-mono text-rose-400">₹{detailedJc.balance_due.toFixed(2)}</span>
                </div>
              </div>

              {/* Supervisor OTP bypass input when requested */}
              {otpRequested && (
                <div className="mt-4 p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Supervisor OTP Verification</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    A 6-digit approval OTP has been dispatched to Supervisor (Ravi Kumar: +919988776655). Enter the code below to unlock this job card.
                  </p>
                  <div className="space-y-2">
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-Digit OTP"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                      className="bg-slate-950 border-slate-800 text-center font-mono text-lg tracking-widest text-white h-10"
                    />
                    {otpError && <p className="text-[10px] text-rose-400 font-bold">{otpError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setOtpRequested(false)}
                      className="text-slate-400 hover:text-white flex-1 text-xs h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleVerifyAndUnlock(detailedJc)}
                      className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white flex-1 text-xs h-9 font-bold"
                    >
                      Verify & Unlock
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-900 flex sm:justify-between gap-2">
            {!otpRequested && detailedJc && (
              <>
                {detailedJc.is_locked ? (
                  <Button
                    onClick={() => handleRequestUnlockOtp(detailedJc)}
                    className="bg-amber-600 hover:bg-amber-500 text-white flex-1 h-10 gap-1.5 font-bold text-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Unlock Card (OTP)
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEditJobCard(detailedJc)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 h-10 gap-1.5 font-bold text-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Edit Job Card
                  </Button>
                )}
                <a
                  href={buildWhatsAppLink(detailedJc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg font-medium text-xs transition-all duration-200 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 active:scale-98 flex-1"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp Receipt
                </a>
              </>
            )}
            <Button
              onClick={() => {
                setDetailedJc(null);
                setOtpRequested(false);
              }}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 flex-1 h-10 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
