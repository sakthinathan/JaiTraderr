"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */


import React, { useState, useTransition, useMemo } from "react";
import { 
  ArrowRight, 
  Calendar, 
  History, 
  ShieldAlert, 
  ChevronRight,
  ClipboardList,
  Share2
} from "lucide-react";
import { JobCard } from "@/app/actions/job-cards";
import { updateJobCardStatus, getStatusHistory, StatusHistory } from "@/app/actions/workflow";
import { recordPayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

function formatLocalDate(dateString: string | Date) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

interface WorkflowClientProps {
  jobCards: JobCard[];
  shelfLocations: { id: string; code: string }[];
}

export default function WorkflowClient({ jobCards: initialJobCards, shelfLocations }: WorkflowClientProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>(initialJobCards);
  const [selectedJc, setSelectedJc] = useState<JobCard | null>(null);
  const [historyLogs, setHistoryLogs] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Status Change Dialog State
  const [statusDialogJc, setStatusDialogJc] = useState<JobCard | null>(null);
  const [targetStatus, setTargetStatus] = useState<JobCard["status"] | "">("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("UPI");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Drag and Drop States
  const [draggedJc, setDraggedJc] = useState<JobCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobCard["status"] | null>(null);

  const handleDropOnColumn = (status: JobCard["status"]) => {
    if (!draggedJc) return;
    if (draggedJc.status === status) return;
    handleOpenStatusDialog(draggedJc, status);
    setDraggedJc(null);
    setDragOverColumn(null);
  };

  // 1. Group shelf locations by prefix (e.g. A-01 -> Rack A, B-01 -> Rack B)
  const groupedShelves = useMemo(() => {
    const groups: { [rack: string]: typeof shelfLocations } = {};
    shelfLocations.forEach(s => {
      const parts = s.code.split("-");
      const rack = parts[0] || "General";
      if (!groups[rack]) {
        groups[rack] = [];
      }
      groups[rack].push(s);
    });
    return groups;
  }, [shelfLocations]);

  // 2. Map occupied shelves to active job cards currently on them
  const occupiedShelves = useMemo(() => {
    const map: { [shelfCode: string]: JobCard[] } = {};
    jobCards.forEach(jc => {
      if (jc.shelf_location && jc.status === "READY_FOR_DELIVERY") {
        if (!map[jc.shelf_location]) {
          map[jc.shelf_location] = [];
        }
        map[jc.shelf_location].push(jc);
      }
    });
    return map;
  }, [jobCards]);

  const buildWhatsAppLink = (jc: JobCard) => {
    const name = jc.customer_name || "Customer";
    const num = jc.job_card_number;
    const balance = jc.balance_due.toFixed(2);
    const shelf = jc.shelf_location || "N/A";
    
    let text = `*JaiTraderr Laundry Order Update*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Your order *${num}* is currently in *${jc.status}* stage.\n`;
    if (jc.status === "READY_FOR_DELIVERY") {
      text += `\nYour clothes are *READY FOR PICKUP*! 🧺\n`;
      text += `• Shelf Location: *${shelf}*\n`;
      text += `• Balance Due: ₹${balance}\n`;
    } else if (jc.status === "DELIVERED") {
      text += `\nYour clothes have been *DELIVERED*. Thank you!\n`;
    } else {
      text += `\nWe are actively working on it. Expected completion date: ${formatLocalDate(jc.expected_delivery_date)}\n`;
    }
    text += `\nThank you for choosing JaiTraderr!`;

    const cleanMobile = (jc.customer_mobile || "").replace(/\D/g, "");
    const formattedMobile = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
    return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(text)}`;
  };

  const handleOpenStatusDialog = (jc: JobCard, status: JobCard["status"]) => {
    setStatusDialogJc(jc);
    setTargetStatus(status);
    setShelfLocation(jc.shelf_location || "");
    setCollectAmount(jc.balance_due);
    setPaymentMethod("UPI");
    setRemarks("");
    setFormError(null);
  };

  const handleUpdateStatus = () => {
    if (!statusDialogJc || !targetStatus) return;

    if (targetStatus === "READY_FOR_DELIVERY" && !shelfLocation) {
      setFormError("A shelf location is mandatory when transitioning to READY_FOR_DELIVERY.");
      return;
    }

    startTransition(async () => {
      // Record payment first if transitioning to DELIVERED and there is a balance
      if (targetStatus === "DELIVERED" && statusDialogJc.balance_due > 0 && collectAmount > 0) {
        const isFinal = collectAmount >= statusDialogJc.balance_due;
        const pRes = await recordPayment(statusDialogJc.id, {
          amount: collectAmount,
          payment_method: paymentMethod,
          payment_type: isFinal ? "FINAL" : "PARTIAL",
          remarks: remarks || "Settled directly on workflow pipeline board"
        });

        if (!pRes.success) {
          setFormError(pRes.error || "Failed to record payment on delivery.");
          return;
        }
      }

      const res = await updateJobCardStatus(statusDialogJc.id, targetStatus, shelfLocation, remarks);

      if (!res.success) {
        setFormError(res.error || "Failed to update status.");
      } else {
        // Update local state
        setJobCards(jobCards.map(j => {
          if (j.id === statusDialogJc.id) {
            const newBalance = targetStatus === "DELIVERED"
              ? Math.max(0, j.balance_due - collectAmount)
              : j.balance_due;
            return {
              ...j,
              status: targetStatus,
              shelf_location: targetStatus === "READY_FOR_DELIVERY" ? shelfLocation : j.shelf_location,
              balance_due: newBalance
            };
          }
          return j;
        }));

        // Close dialog
        setStatusDialogJc(null);
        setTargetStatus("");
        setShelfLocation("");
        setRemarks("");
      }
    });
  };

  const handleViewDetails = async (jc: JobCard) => {
    setSelectedJc(jc);
    setLoadingHistory(true);
    try {
      const history = await getStatusHistory(jc.id);
      setHistoryLogs(history);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getNextStatus = (status: JobCard["status"]): JobCard["status"] | null => {
    switch (status) {
      case "RECEIVED": return "WASHING";
      case "WASHING": return "IRONING";
      case "IRONING": return "READY_FOR_DELIVERY";
      case "READY_FOR_DELIVERY": return "DELIVERED";
      default: return null;
    }
  };

  const columns: { title: string; status: JobCard["status"]; color: string }[] = [
    { title: "Received / Queue", status: "RECEIVED", color: "from-blue-600 to-sky-500" },
    { title: "Washing Section", status: "WASHING", color: "from-indigo-600 to-violet-500" },
    { title: "Ironing & Press", status: "IRONING", color: "from-amber-600 to-orange-500" },
    { title: "Ready for Pickup", status: "READY_FOR_DELIVERY", color: "from-emerald-600 to-teal-500" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Operations Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor active jobs through workflow queues and update process checkpoints.
        </p>
      </div>

      {/* Board Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => {
          const colJobs = jobCards.filter(j => j.status === col.status);
          return (
            <div key={col.status} className="flex flex-col space-y-4">
              {/* Column Title Card */}
              <div className={`p-3 rounded-xl border border-slate-900 bg-slate-950/40 relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-1.5 bottom-0 bg-gradient-to-b ${col.color}`} />
                <div className="pl-3.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">{col.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-bold">
                    {colJobs.length}
                  </span>
                </div>
              </div>

              {/* Column Jobs List */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedJc && draggedJc.status !== col.status) {
                    setDragOverColumn(col.status);
                  }
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={() => handleDropOnColumn(col.status)}
                className={`flex-1 space-y-3.5 min-h-[450px] p-2 rounded-xl border transition-all duration-200 overflow-y-auto max-h-[500px] ${
                  dragOverColumn === col.status
                    ? "bg-indigo-600/5 border-indigo-500/40 ring-1 ring-indigo-500/10 shadow-[inset_0_0_12px_rgba(99,102,241,0.05)]"
                    : draggedJc && draggedJc.status !== col.status
                      ? "bg-slate-950/20 border-dashed border-slate-800/80"
                      : "bg-slate-950/10 border-slate-900/60"
                }`}
              >
                {colJobs.map((jc) => {
                  const next = getNextStatus(jc.status);
                  return (
                    <div 
                      key={jc.id}
                      draggable
                      onDragStart={() => setDraggedJc(jc)}
                      onDragEnd={() => {
                        setDraggedJc(null);
                        setDragOverColumn(null);
                      }}
                      className={`p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition duration-150 relative group cursor-grab active:cursor-grabbing ${
                        draggedJc?.id === jc.id ? "opacity-30 border-indigo-500/30 bg-indigo-950/10 select-none scale-[0.98]" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span 
                          onClick={() => handleViewDetails(jc)}
                          className="font-mono text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
                        >
                          {jc.job_card_number}
                        </span>
                        {jc.shelf_location && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                            Shelf: {jc.shelf_location}
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="text-xs font-semibold text-slate-200 truncate">{jc.customer_name}</p>
                        <p className="text-[10px] text-slate-500">{jc.customer_mobile}</p>
                      </div>

                      {/* Advance indicators */}
                      <div className="mt-3 text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-900/40 pt-2.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                           {formatLocalDate(jc.expected_delivery_date)}
                        </span>
                        {next && (
                          <Button
                            onClick={() => handleOpenStatusDialog(jc, next)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] px-2 h-6 gap-1"
                          >
                            Push
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colJobs.length === 0 && (
                  <div className="py-20 text-center text-xs text-slate-600">
                    Queue is empty.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog: Change Status Confirmation (Visual Shelf Mapping) */}
      <Dialog open={!!statusDialogJc} onOpenChange={() => setStatusDialogJc(null)}>
        <DialogContent className={`border-slate-800 bg-slate-900 text-slate-100 transition-all duration-300 ${targetStatus === "READY_FOR_DELIVERY" ? "max-w-md" : "max-w-sm"}`}>
          <DialogHeader>
            <DialogTitle className="text-white text-base">Update Order Stage</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Confirm moving job card <span className="font-semibold text-white">{statusDialogJc?.job_card_number}</span> to status **{targetStatus}**.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {targetStatus === "READY_FOR_DELIVERY" && (
              <div className="space-y-3">
                <Label className="text-slate-300 text-xs flex justify-between items-center">
                  <span>Visual Rack Layout & Shelf Allocation <span className="text-rose-500">*</span></span>
                  {shelfLocation && (
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                      Selected: {shelfLocation}
                    </span>
                  )}
                </Label>
                
                {/* Visual Rack Map */}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {Object.keys(groupedShelves).sort().map(rack => (
                    <div key={rack} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Rack {rack}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {groupedShelves[rack].map(s => {
                          const isSelected = s.code === shelfLocation;
                          const occupants = occupiedShelves[s.code] || [];
                          const isOccupied = occupants.length > 0;
                          
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setShelfLocation(s.code)}
                              disabled={isPending}
                              title={isOccupied 
                                ? `Slot ${s.code} - Occupied by ${occupants.map(o => `${o.customer_name} (#${o.job_card_number})`).join(", ")}` 
                                : `Slot ${s.code} - Empty/Available`}
                              className={`relative group flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer select-none h-14 ${
                                isSelected
                                  ? "bg-indigo-600/10 border-indigo-500 text-white ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-slate-900"
                                  : isOccupied
                                    ? "bg-amber-500/5 border-amber-500/30 text-amber-300 hover:border-amber-400"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              <span className={`text-xs font-mono font-bold ${isSelected ? "text-indigo-400" : isOccupied ? "text-amber-400" : "text-slate-300"}`}>
                                {s.code.split("-")[1] || s.code}
                              </span>
                              
                              {/* Small status indicator / dot */}
                              <div className="mt-1 flex items-center gap-1">
                                {isOccupied && !isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                )}
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                )}
                                <span className="text-[8px] opacity-60">
                                  {isOccupied ? `${occupants.length} order` : "Free"}
                                </span>
                              </div>
                              
                              {/* Hover tooltip for occupied slots */}
                              {isOccupied && (
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 scale-90 rounded bg-slate-950 p-2 text-left text-[9px] text-slate-300 opacity-0 shadow-xl border border-slate-800 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                                  <p className="font-semibold text-amber-400 border-b border-slate-800 pb-1 mb-1">Occupied Slot {s.code}</p>
                                  {occupants.map(o => (
                                    <div key={o.id} className="truncate">
                                      • {o.customer_name} ({o.job_card_number})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex gap-4 pt-1 justify-center text-[10px] text-slate-500 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-slate-950 border border-slate-800 inline-block" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30 inline-block" />
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600/10 border border-indigo-500 inline-block" />
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            )}

            {targetStatus === "DELIVERED" && statusDialogJc && statusDialogJc.balance_due > 0 && (
              <div className="space-y-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-600/5 animate-fade-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settle Payments Balance Due</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Remaining Balance:</span>
                  <span className="text-rose-400 font-extrabold">₹{statusDialogJc.balance_due}</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="collect" className="text-slate-300 text-xs">Amount Received (₹)</Label>
                  <Input
                    id="collect"
                    type="number"
                    value={collectAmount || ""}
                    onChange={(e) => setCollectAmount(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white h-9"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method" className="text-slate-300 text-xs">Payment Method</Label>
                  <select
                    id="method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isPending}
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {targetStatus === "DELIVERED" && statusDialogJc && statusDialogJc.balance_due <= 0 && (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-600/5 text-center text-xs">
                <p className="font-bold text-emerald-400">Balance Fully Cleared</p>
                <p className="text-[10px] text-slate-500 mt-1">This order was paid in full during drop-off/advance collection.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="remarks" className="text-slate-300 text-xs">Operational Remarks (Optional)</Label>
              <Input
                id="remarks"
                placeholder="e.g. Ironing complete, placed on hanger"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white h-9"
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setStatusDialogJc(null)}
              className="text-slate-400 hover:text-white"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isPending ? "Updating..." : "Update Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Order Inspect details & Transition History timeline */}
      <Dialog open={!!selectedJc} onOpenChange={() => setSelectedJc(null)}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
              Order Operations Log
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              History tracking for Job Card {selectedJc?.job_card_number}
            </DialogDescription>
          </DialogHeader>

          {selectedJc && (
            <div className="space-y-6 py-2">
              {/* Meta details */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-900 pb-3">
                <div>
                  <p className="text-slate-500 font-medium">Customer</p>
                  <p className="text-slate-200 mt-1 font-semibold">{selectedJc.customer_name}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Mobile</p>
                  <p className="text-slate-200 mt-1 font-mono">{selectedJc.customer_mobile}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Grand Total</p>
                  <p className="text-slate-200 mt-1 font-semibold">₹{selectedJc.grand_total}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Expected Delivery</p>
                   <p className="text-slate-200 mt-1 font-semibold">
                    {formatLocalDate(selectedJc.expected_delivery_date)}
                  </p>
                </div>
              </div>

              {/* Transition history logs */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  Workflow Transition Timeline
                </p>

                <div className="relative pl-6 space-y-5 border-l border-slate-900">
                  {loadingHistory ? (
                    <p className="text-xs text-slate-500 py-2">Loading pipeline timeline...</p>
                  ) : historyLogs.length > 0 ? (
                    historyLogs.map((log) => (
                      <div key={log.id} className="relative text-xs">
                        {/* Timeline point */}
                        <div className="absolute -left-[31px] top-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-slate-900" />
                        
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold text-slate-200 flex items-center gap-1">
                              {log.from_status ? log.from_status : "START"} 
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-indigo-400">{log.to_status}</span>
                            </p>
                            {log.remarks && (
                              <p className="text-slate-400 mt-1 text-[11px] italic bg-slate-950/20 p-1.5 rounded-md border border-slate-900/30">
                                &quot;{log.remarks}&quot;
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 text-right">
                            {new Date(log.changed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-2">No transitions recorded (Draft State).</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-900 flex sm:justify-between gap-2">
            {selectedJc && (
              <a
                href={buildWhatsAppLink(selectedJc)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg font-medium text-xs transition-all duration-200 h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 active:scale-98 flex-1"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp Alert
              </a>
            )}
            <Button
              onClick={() => setSelectedJc(null)}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 flex-1 h-10"
            >
              Close Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
