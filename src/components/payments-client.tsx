"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition } from "react";
import { 
  Search, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  ShieldAlert, 
  Printer,
  IndianRupee,
  Check,
  Share2
} from "lucide-react";
import { JobCard, getJobCardDetails } from "@/app/actions/job-cards";
import { recordPayment, getPaymentsHistory, Payment } from "@/app/actions/payments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface PaymentsClientProps {
  initialJobCards: JobCard[];
}

export default function PaymentsClient({ initialJobCards }: PaymentsClientProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>(initialJobCards);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJc, setSelectedJc] = useState<JobCard | null>(null);
  
  // Ledger state
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);
  const [loadingLedger, setLoadingHistory] = useState(false);

  // Collect Payment Form State
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<Payment["payment_method"]>("UPI");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Print Invoice Preview modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const buildWhatsAppLink = () => {
    if (!selectedJc) return "";
    const name = selectedJc.customer_name || "Customer";
    const num = selectedJc.job_card_number;
    const total = selectedJc.grand_total.toFixed(2);
    const advance = selectedJc.advance_paid.toFixed(2);
    const balance = selectedJc.balance_due.toFixed(2);
    const shelf = selectedJc.shelf_location || "N/A";
    
    let text = `*JaiTraderr Laundry Billing Receipt*\n\n`;
    text += `Dear *${name}*,\n`;
    text += `Here is your summary for Order *${num}*:\n\n`;
    text += `• Total Billed: ₹${total}\n`;
    text += `• Advance Paid: ₹${advance}\n`;
    text += `• Balance Due: ₹${balance}\n`;
    if (selectedJc.status === "READY_FOR_DELIVERY") {
      text += `• Status: *Ready for Pickup*\n`;
      text += `• Shelf Location: *${shelf}*\n`;
    } else {
      text += `• Status: *${selectedJc.status}*\n`;
    }
    text += `\nThank you for choosing JaiTraderr! For questions, call us directly.`;

    const cleanMobile = (selectedJc.customer_mobile || "").replace(/\D/g, "");
    const formattedMobile = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
    return `https://wa.me/${formattedMobile}?text=${encodeURIComponent(text)}`;
  };

  const handleSelectJobCard = async (jc: JobCard) => {
    // Re-fetch detail from server to get full nested services list
    const details = await getJobCardDetails(jc.id);
    if (!details) return;

    setSelectedJc(details);
    setCollectAmount(details.balance_due);
    setPaymentRemarks("");
    setFormError(null);
    setFormSuccess(null);
    
    setLoadingHistory(true);
    try {
      const history = await getPaymentsHistory(jc.id);
      setPaymentsList(history);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCollectPayment = () => {
    if (!selectedJc || collectAmount <= 0) return;

    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      // Determine if this is partial or final payment
      const isFinal = collectAmount >= selectedJc.balance_due;
      const paymentType = isFinal ? "FINAL" : "PARTIAL";

      const res = await recordPayment(selectedJc.id, {
        amount: collectAmount,
        payment_method: paymentMethod,
        payment_type: paymentType,
        remarks: paymentRemarks
      });

      if (!res.success) {
        setFormError(res.error || "Failed to record payment transaction.");
      } else {
        setFormSuccess(`Recorded payment of ₹${collectAmount} successfully!`);
        
        // Recompute local balance due
        const newBalance = selectedJc.balance_due - collectAmount;
        const updatedJc = {
          ...selectedJc,
          balance_due: newBalance,
          status: (isFinal && newBalance <= 0) ? "DELIVERED" as const : selectedJc.status
        };
        setSelectedJc(updatedJc);
        
        // Update jobCards list
        setJobCards(jobCards.map(j => j.id === selectedJc.id ? updatedJc : j));

        // Re-load payments ledger list
        const history = await getPaymentsHistory(selectedJc.id);
        setPaymentsList(history);

        // Reset collect amount input
        setCollectAmount(newBalance);
        setPaymentRemarks("");
      }
    });
  };

  const filteredJobCards = jobCards.filter(j => 
    j.job_card_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.customer_mobile?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payment Collections & Delivery</h1>
        <p className="text-slate-400 text-sm mt-1">
          Retrieve shelf placements, record remaining balances, and trigger print invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Lookup Job Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lookup Input Card */}
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Delivery Lookup
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                Look up order by Job Card ID, customer mobile, or name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <Input
                  placeholder="Enter Job Card Number (JC-...) or Customer Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-slate-950/60 border-slate-900 text-white placeholder-slate-700"
                />
              </div>

              {/* Instant list results */}
              {searchQuery && (
                <div className="mt-4 border border-slate-900 rounded-lg divide-y divide-slate-900/60 bg-slate-950/40 max-h-60 overflow-y-auto">
                  {filteredJobCards.length > 0 ? (
                    filteredJobCards.map((jc) => (
                      <button
                        key={jc.id}
                        onClick={() => {
                          handleSelectJobCard(jc);
                          setSearchQuery("");
                        }}
                        className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-900/30 text-slate-300 text-xs transition"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{jc.job_card_number} • {jc.customer_name}</p>
                          <p className="text-slate-500 mt-0.5">{jc.customer_mobile} • Status: {jc.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-200">Balance: ₹{jc.balance_due}</p>
                          {jc.shelf_location && <p className="text-emerald-400 text-[10px] mt-0.5">Shelf: {jc.shelf_location}</p>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">No active orders found matching your search.</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mapped Order details profile */}
          {selectedJc ? (
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md animate-fade-in">
              <CardHeader className="border-b border-slate-900/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white">{selectedJc.job_card_number}</CardTitle>
                  <CardDescription className="text-slate-500 text-xs">Customer: {selectedJc.customer_name}</CardDescription>
                </div>
                {selectedJc.shelf_location ? (
                  <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-medium">Retrieve Shelf</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">{selectedJc.shelf_location}</p>
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-medium">Shelf Code</p>
                    <p className="text-xs font-semibold text-amber-400 mt-0.5">Not Placed</p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Financial overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Grand Total</p>
                    <p className="text-xl font-bold text-white mt-1">₹{selectedJc.grand_total}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Advance Paid</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">₹{selectedJc.advance_paid}</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Remaining Due</p>
                    <p className={`text-xl font-bold mt-1 ${selectedJc.balance_due > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      ₹{selectedJc.balance_due}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Order Status</p>
                    <p className="text-xs font-bold text-slate-300 mt-2 uppercase">{selectedJc.status.replace(/_/g, " ")}</p>
                  </div>
                </div>

                {/* Services/Items lines catalog checklist */}
                <div className="space-y-3.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Billed Items Checklist</p>
                  <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40">
                    {selectedJc.services?.map((svc) => (
                      <div key={svc.id} className="p-4 space-y-2 bg-slate-950/20">
                        <p className="text-xs font-bold text-indigo-400 uppercase">{svc.service_name_snapshot}</p>
                        <div className="divide-y divide-slate-900/40">
                          {svc.items.map((item) => (
                            <div key={item.id} className="py-2 flex items-center justify-between text-xs text-slate-300">
                              <span>{item.item_name_snapshot} ({item.quantity} {item.unit_id_snapshot})</span>
                              <span className="font-medium text-slate-100">₹{item.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print modal action bar */}
                <div className="flex justify-end gap-3 pt-2">
                  <a
                    href={buildWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg font-medium text-xs transition-all duration-200 h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 active:scale-98"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                    WhatsApp Receipt
                  </a>
                  <Button
                    onClick={() => setShowPrintModal(true)}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 gap-2 h-10 px-5"
                  >
                    <Printer className="w-4.5 h-4.5" />
                    Print Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-20 border border-dashed border-slate-900 rounded-xl text-center">
              <CreditCard className="w-12 h-12 text-slate-800 mx-auto stroke-1" />
              <p className="text-slate-500 text-xs mt-3">Perform lookup above by order card or mobile number to trigger payment collections.</p>
            </div>
          )}
        </div>

        {/* Right Column: Collect payments card */}
        <div className="space-y-6">
          {selectedJc && (
            <>
              {/* Record Payment Ledger Card */}
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4.5 h-4.5 text-indigo-400" />
                    Collect Balance Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {selectedJc.balance_due > 0 ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="collect" className="text-slate-300 text-xs">Collect Amount (₹)</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                          <Input
                            id="collect"
                            type="number"
                            value={collectAmount || ""}
                            onChange={(e) => setCollectAmount(Number(e.target.value))}
                            className="pl-8 bg-slate-950 border-slate-800 text-white"
                            disabled={isPending}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="method" className="text-slate-300 text-xs">Payment Method</Label>
                        <select
                          id="method"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-850 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          disabled={isPending}
                        >
                          <option value="UPI">UPI / QR Code</option>
                          <option value="CASH">Cash</option>
                          <option value="CARD">Credit/Debit Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remarks" className="text-slate-300 text-xs">Remarks</Label>
                        <Input
                          id="remarks"
                          placeholder="e.g. Paid via GPay"
                          value={paymentRemarks}
                          onChange={(e) => setPaymentRemarks(e.target.value)}
                          className="bg-slate-950 border-slate-850 text-white h-9"
                          disabled={isPending}
                        />
                      </div>

                      <Button
                        onClick={handleCollectPayment}
                        disabled={isPending || collectAmount <= 0}
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white gap-2 mt-2 h-10"
                      >
                        Record Payment & Deliver
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-600/5 text-center py-6">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="font-bold text-emerald-400 text-sm mt-3">Balance Fully Cleared</p>
                      <p className="text-[10px] text-slate-500 mt-1">This order is paid and ready for delivery/already dispatched.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments Ledger History */}
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Check className="w-4.5 h-4.5 text-indigo-400" />
                    Payments History Ledger
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                  {loadingLedger ? (
                    <p className="text-xs text-slate-500">Loading ledger...</p>
                  ) : paymentsList.length > 0 ? (
                    paymentsList.map((pay) => (
                      <div 
                        key={pay.id}
                        className="p-2.5 rounded-lg border border-slate-900 bg-slate-950/40 text-xs flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{pay.payment_type} ({pay.payment_method})</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{pay.recorded_at ? pay.recorded_at.split('T')[0].split('-').reverse().join('/') : ""} {pay.remarks && `• ${pay.remarks}`}</p>
                        </div>
                        <span className="font-bold text-emerald-400">₹{pay.amount}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-600">
                      No payments ledger records found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Dialog: Invoice Thermal print preview mock */}
      {selectedJc && (
        <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 max-w-sm">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <DialogTitle className="text-white text-base">Receipt Preview</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">Formatted thermal receipt layout</DialogDescription>
            </DialogHeader>

            {/* Thermal layout preview panel */}
            <div className="p-5 bg-white text-slate-950 font-mono text-xs shadow-inner rounded-md space-y-4 max-h-[400px] overflow-y-auto">
              <div className="text-center space-y-1">
                <p className="text-sm font-extrabold tracking-wider">JAI TRADERR LAUNDRY</p>
                <p className="text-[10px] text-slate-600">123 Laundry St, Clean City</p>
                <p className="text-[10px] text-slate-600">Tel: +91 99887 76655</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                <p className="flex justify-between"><span>JC NUMBER:</span> <span className="font-bold">{selectedJc.job_card_number}</span></p>
                <p className="flex justify-between"><span>DATE:</span> <span>{selectedJc.created_at ? selectedJc.created_at.split('T')[0].split('-').reverse().join('/') : ""}</span></p>
                <p className="flex justify-between"><span>CUSTOMER:</span> <span>{selectedJc.customer_name}</span></p>
                <p className="flex justify-between"><span>MOBILE:</span> <span>{selectedJc.customer_mobile}</span></p>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1">
                  <span>ITEM / SVC</span>
                  <span className="w-16 text-right">QTY</span>
                  <span className="w-16 text-right">AMT</span>
                </div>
                {selectedJc.services?.map(svc => (
                  <div key={svc.id} className="space-y-1">
                    <p className="font-bold text-[10px] text-slate-600 uppercase">{svc.service_name_snapshot}</p>
                    {svc.items.map(item => (
                      <div key={item.id} className="flex justify-between pl-2">
                        <span className="truncate max-w-[120px]">{item.item_name_snapshot}</span>
                        <span className="w-16 text-right">{item.quantity}</span>
                        <span className="w-16 text-right">₹{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Summary calculations */}
              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px] text-right">
                <p className="flex justify-between"><span>Subtotal:</span> <span>₹{selectedJc.subtotal.toFixed(2)}</span></p>
                {selectedJc.discount > 0 && <p className="flex justify-between"><span>Discount:</span> <span>-₹{selectedJc.discount.toFixed(2)}</span></p>}
                {selectedJc.tax_amount > 0 && <p className="flex justify-between"><span>Tax / GST:</span> <span>+₹{selectedJc.tax_amount.toFixed(2)}</span></p>}
                <p className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1">
                  <span>Grand Total:</span> <span>₹{selectedJc.grand_total.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-slate-600"><span>Paid:</span> <span>-₹{selectedJc.grand_total - selectedJc.balance_due}</span></p>
                <p className="flex justify-between font-bold">
                  <span>Balance Due:</span> <span>₹{selectedJc.balance_due.toFixed(2)}</span>
                </p>
              </div>

              <div className="text-center text-[10px] text-slate-600 border-t border-dashed border-slate-400 pt-3 space-y-1">
                <p>THANK YOU FOR YOUR PATRONAGE</p>
                <p className="font-bold">JaiTraderr Portal</p>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-900">
              <Button
                variant="ghost"
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                <Printer className="w-4 h-4" />
                Trigger Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
