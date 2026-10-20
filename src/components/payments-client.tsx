"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition, useMemo } from "react";
import { 
  Search, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  ShieldAlert, 
  Printer,
  IndianRupee,
  Check,
  Share2,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCheck
} from "lucide-react";
import { JobCard, getJobCardDetails } from "@/app/actions/job-cards";
import { recordPayment, getPaymentsHistory, Payment } from "@/app/actions/payments";
import { buildReceiptWhatsAppUrl } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PaymentsClientProps {
  initialJobCards: JobCard[];
  initialPayments?: Payment[];
}

export default function PaymentsClient({ initialJobCards, initialPayments = [] }: PaymentsClientProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>(initialJobCards);
  const [allPayments, setAllPayments] = useState<Payment[]>(initialPayments);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJc, setSelectedJc] = useState<JobCard | null>(null);
  
  // Filter tab: "pending" | "collected" | "all" | "ledger"
  const [activeTab, setActiveTab] = useState<"pending" | "collected" | "all" | "ledger">("pending");
  
  // Ledger state for selected JobCard
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
    return buildReceiptWhatsAppUrl(selectedJc);
  };

  const handleSelectJobCard = async (jc: JobCard) => {
    const details = await getJobCardDetails(jc.id);
    if (!details) return;

    setSelectedJc(details);
    setCollectAmount(details.balance_due > 0 ? details.balance_due : 0);
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
        
        const newBalance = Math.max(0, selectedJc.balance_due - collectAmount);
        const updatedJc: JobCard = {
          ...selectedJc,
          balance_due: newBalance,
          status: (isFinal && newBalance <= 0) ? "DELIVERED" as const : selectedJc.status
        };
        setSelectedJc(updatedJc);
        
        // Update jobCards list
        setJobCards(prev => prev.map(j => j.id === selectedJc.id ? updatedJc : j));

        // Create new local payment record to update feeds immediately
        const newPaymentRecord: Payment = {
          id: `pay-${Date.now()}`,
          job_card_id: selectedJc.id,
          amount: collectAmount,
          payment_method: paymentMethod,
          payment_type: paymentType,
          recorded_by: "Current Staff",
          recorded_at: new Date().toISOString(),
          remarks: paymentRemarks || null
        };
        setAllPayments(prev => [newPaymentRecord, ...prev]);

        // Re-load payments ledger list for this card
        const history = await getPaymentsHistory(selectedJc.id);
        setPaymentsList(history.length > 0 ? history : [newPaymentRecord, ...paymentsList]);

        // Reset collect amount input
        setCollectAmount(newBalance);
        setPaymentRemarks("");
      }
    });
  };

  // KPI Metrics Calculations
  const stats = useMemo(() => {
    const totalPendingAmount = jobCards.reduce((acc, j) => acc + (j.balance_due > 0 ? j.balance_due : 0), 0);
    const pendingCount = jobCards.filter(j => j.balance_due > 0).length;

    const totalCollectedAmount = jobCards.reduce((acc, j) => acc + (j.grand_total - (j.balance_due > 0 ? j.balance_due : 0)), 0);
    const collectedCount = jobCards.filter(j => j.balance_due <= 0).length;

    const todayDate = new Date().toISOString().split("T")[0];
    const todayPayments = allPayments.filter(p => p.recorded_at?.startsWith(todayDate));
    const todayCash = todayPayments.filter(p => p.payment_method === "CASH").reduce((s, p) => s + p.amount, 0);
    const todayUpi = todayPayments.filter(p => p.payment_method === "UPI").reduce((s, p) => s + p.amount, 0);
    const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);

    return {
      totalPendingAmount,
      pendingCount,
      totalCollectedAmount,
      collectedCount,
      todayCash,
      todayUpi,
      todayTotal,
      allCount: jobCards.length,
      txCount: allPayments.length
    };
  }, [jobCards, allPayments]);

  // Filtered Job Cards List
  const displayedJobCards = useMemo(() => {
    let list = jobCards;

    if (activeTab === "pending") {
      list = jobCards.filter(j => j.balance_due > 0);
    } else if (activeTab === "collected") {
      list = jobCards.filter(j => j.balance_due <= 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        j.job_card_number?.toLowerCase().includes(q) ||
        j.customer_name?.toLowerCase().includes(q) ||
        j.customer_mobile?.includes(q) ||
        j.shelf_location?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [jobCards, activeTab, searchQuery]);

  // Filtered Payments Ledger List (for transactions tab)
  const displayedTransactions = useMemo(() => {
    let list = allPayments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const jc = jobCards.find(j => j.id === p.job_card_id);
        return (
          jc?.job_card_number?.toLowerCase().includes(q) ||
          jc?.customer_name?.toLowerCase().includes(q) ||
          jc?.customer_mobile?.includes(q) ||
          p.payment_method?.toLowerCase().includes(q) ||
          p.payment_type?.toLowerCase().includes(q) ||
          p.remarks?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [allPayments, jobCards, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Payments & Collections
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track collected payments, follow up on pending bills, settle balances, and issue invoices.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Collections */}
        <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Balance</p>
                <p className="text-xl sm:text-2xl font-extrabold text-rose-400 mt-1">₹{stats.totalPendingAmount.toFixed(2)}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {stats.pendingCount} Bills
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Awaiting customer clearance</p>
          </CardContent>
        </Card>

        {/* Collected / Settled Bills */}
        <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</p>
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1">₹{stats.totalCollectedAmount.toFixed(2)}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {stats.collectedCount} Paid
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Fully cleared & settled bills</p>
          </CardContent>
        </Card>

        {/* Today's Cash Collections */}
        <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Cash Flow</p>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1">₹{stats.todayCash.toFixed(2)}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Cash Till
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Physical cash collected today</p>
          </CardContent>
        </Card>

        {/* Today's Digital / UPI Collections */}
        <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Digital / UPI</p>
                <p className="text-xl sm:text-2xl font-extrabold text-indigo-400 mt-1">₹{stats.todayUpi.toFixed(2)}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                UPI / Bank
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Online payments recorded today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Pending Balance */}
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Pending Bills</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300">
              {stats.pendingCount}
            </span>
          </button>

          {/* Tab 2: Payment Collected */}
          <button
            onClick={() => setActiveTab("collected")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "collected"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-900"
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Payments Collected (Paid)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
              {stats.collectedCount}
            </span>
          </button>

          {/* Tab 3: All Bills */}
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-900"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Orders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
              {stats.allCount}
            </span>
          </button>

          {/* Tab 4: Transactions Ledger */}
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-900"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>Collected Transactions Feed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300">
              {stats.txCount}
            </span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input
            placeholder={
              activeTab === "ledger"
                ? "Filter transactions by JC, customer, method..."
                : "Search JC#, Customer Name, Mobile, Shelf..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-slate-950 border-slate-850 text-xs text-white placeholder-slate-600 rounded-xl"
          />
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeTab === "ledger" ? (
        /* TRANSACTIONS LEDGER FULL FEED */
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
          <CardHeader className="border-b border-slate-900/80 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-cyan-400" />
              Recent Payment Transactions Feed
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Every cash, UPI, and card payment recorded across all customer orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 bg-slate-950/40 overflow-hidden">
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((pay) => {
                  const jc = jobCards.find(j => j.id === pay.job_card_id);
                  return (
                    <div
                      key={pay.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/30 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          pay.payment_method === "CASH" 
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : pay.payment_method === "UPI"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}>
                          <IndianRupee className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {jc ? jc.job_card_number : "Direct Order"}
                            </span>
                            <span className="text-slate-400 text-xs">
                              • {jc ? jc.customer_name : "Customer"}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pay.payment_method === "CASH"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : pay.payment_method === "UPI"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}>
                              {pay.payment_method}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                              {pay.payment_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>{pay.recorded_at ? pay.recorded_at.split('T')[0].split('-').reverse().join('/') : ""} {pay.recorded_at ? pay.recorded_at.split('T')[1]?.slice(0, 5) : ""}</span>
                            {pay.remarks && <span>• &ldquo;{pay.remarks}&rdquo;</span>}
                            {jc?.customer_mobile && <span>• Mobile: {jc.customer_mobile}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-base font-extrabold text-emerald-400">+ ₹{pay.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500">Collected</p>
                        </div>
                        {jc && (
                          <Button
                            onClick={() => {
                              handleSelectJobCard(jc);
                              setActiveTab("all");
                            }}
                            variant="outline"
                            className="h-8 text-xs bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200 gap-1.5"
                          >
                            View Order
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No payment transactions found matching criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* STANDARD 2-COLUMN VIEW: BILLS LIST & SELECTED ORDER DETAILS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bills Roster & Detail View */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bills List Card */}
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-900/60">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    {activeTab === "pending" && <Clock className="w-4.5 h-4.5 text-rose-400" />}
                    {activeTab === "collected" && <CheckCheck className="w-4.5 h-4.5 text-emerald-400" />}
                    {activeTab === "all" && <Filter className="w-4.5 h-4.5 text-indigo-400" />}
                    {activeTab === "pending" ? "Pending Bills (Action Required)" : activeTab === "collected" ? "Paid & Settled Bills" : "All Laundry Orders"}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-0.5">
                    {displayedJobCards.length} order{displayedJobCards.length !== 1 ? "s" : ""} listed
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 bg-slate-950/40 max-h-80 overflow-y-auto">
                  {displayedJobCards.length > 0 ? (
                    displayedJobCards.map((jc) => {
                      const isPendingDue = jc.balance_due > 0;
                      return (
                        <button
                          key={jc.id}
                          onClick={() => handleSelectJobCard(jc)}
                          className={`w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-900/30 text-slate-300 text-xs transition ${
                            selectedJc?.id === jc.id ? "bg-indigo-600/10 border-l-4 border-indigo-500" : ""
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-100">{jc.job_card_number}</p>
                              <span className="text-slate-400">• {jc.customer_name}</span>
                            </div>
                            <p className="text-slate-500 mt-1 flex items-center gap-2 text-[11px]">
                              <span>{jc.customer_mobile}</span>
                              <span>• Stage: <strong className="text-slate-300 font-normal">{jc.status.replace(/_/g, " ")}</strong></span>
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            {isPendingDue ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                ₹{jc.balance_due} Due
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" /> ₹{jc.grand_total} Paid
                              </span>
                            )}
                            {jc.shelf_location ? (
                              <p className="text-emerald-400 text-[10px] font-semibold">Shelf: {jc.shelf_location}</p>
                            ) : (
                              <p className="text-slate-600 text-[10px]">No shelf</p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      {searchQuery
                        ? "No orders found matching your search query."
                        : activeTab === "pending"
                        ? "Great job! All customer orders are fully cleared with zero pending balance."
                        : "No orders found in this category."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Order Detail Profile */}
            {selectedJc ? (
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md animate-fade-in">
                <CardHeader className="border-b border-slate-900/80 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-white">{selectedJc.job_card_number}</CardTitle>
                      {selectedJc.balance_due <= 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> PAID IN FULL
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          PENDING PAYMENT
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-slate-400 text-xs mt-1">
                      Customer: <span className="text-white font-medium">{selectedJc.customer_name}</span> ({selectedJc.customer_mobile})
                    </CardDescription>
                  </div>
                  {selectedJc.shelf_location ? (
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Shelf Rack</p>
                      <p className="text-base font-extrabold text-emerald-400 mt-0.5">{selectedJc.shelf_location}</p>
                    </div>
                  ) : (
                    <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Shelf Rack</p>
                      <p className="text-xs font-semibold text-amber-400 mt-0.5">Not Assigned</p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Financial overview 4-pack */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Grand Total</p>
                      <p className="text-xl font-bold text-white mt-1">₹{selectedJc.grand_total}</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Advance Paid</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">₹{selectedJc.advance_paid}</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Remaining Due</p>
                      <p className={`text-xl font-bold mt-1 ${selectedJc.balance_due > 0 ? "text-rose-400 font-extrabold" : "text-emerald-400"}`}>
                        ₹{selectedJc.balance_due}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Order Stage</p>
                      <p className="text-xs font-bold text-slate-200 mt-2 uppercase">{selectedJc.status.replace(/_/g, " ")}</p>
                    </div>
                  </div>

                  {/* Services/Items lines catalog checklist */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Billed Items Checklist</p>
                    <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40">
                      {selectedJc.services?.map((svc) => (
                        <div key={svc.id} className="p-3.5 space-y-2 bg-slate-950/20">
                          <p className="text-xs font-bold text-indigo-400 uppercase">{svc.service_name_snapshot}</p>
                          <div className="divide-y divide-slate-900/40">
                            {svc.items.map((item) => (
                              <div key={item.id} className="py-1.5 flex items-center justify-between text-xs text-slate-300">
                                <span>{item.item_name_snapshot} ({item.quantity} {item.unit_id_snapshot})</span>
                                <span className="font-semibold text-slate-100">₹{item.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Print & Share Action Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <a
                      href={buildWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl font-bold text-xs transition-all h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg active:scale-98"
                    >
                      <Share2 className="w-4 h-4" />
                      WhatsApp Receipt
                    </a>
                    <Button
                      onClick={() => setShowPrintModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 gap-2 h-10 px-5 rounded-xl font-bold text-xs"
                    >
                      <Printer className="w-4 h-4 text-indigo-400" />
                      Print Tax Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-16 border border-dashed border-slate-900 rounded-2xl text-center bg-slate-950/20">
                <CreditCard className="w-12 h-12 text-slate-700 mx-auto stroke-1" />
                <p className="text-slate-400 text-xs mt-3 font-medium">Select any bill from the list above to view details, collect balance, or print receipt.</p>
              </div>
            )}
          </div>

          {/* Right Column: Collect Payment & Transaction History */}
          <div className="space-y-6">
            {selectedJc ? (
              <>
                {/* Collect Balance Payment Card */}
                <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                  <CardHeader className="border-b border-slate-900/60 pb-3">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Wallet className="w-4.5 h-4.5 text-indigo-400" />
                      Collect Balance Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {formError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                    {formSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{formSuccess}</span>
                      </div>
                    )}

                    {selectedJc.balance_due > 0 ? (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="collect" className="text-slate-300 text-xs font-bold">Collect Amount (₹)</Label>
                            <button
                              type="button"
                              onClick={() => setCollectAmount(selectedJc.balance_due)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                            >
                              Fill Full Balance (₹{selectedJc.balance_due})
                            </button>
                          </div>
                          <div className="relative">
                            <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                            <Input
                              id="collect"
                              type="number"
                              value={collectAmount || ""}
                              onChange={(e) => setCollectAmount(Number(e.target.value))}
                              className="pl-8 bg-slate-950 border-slate-800 text-white font-mono font-bold"
                              disabled={isPending}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="method" className="text-slate-300 text-xs font-bold">Payment Method</Label>
                          <select
                            id="method"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-850 text-white text-xs font-medium focus:border-indigo-500 focus:outline-none"
                            disabled={isPending}
                          >
                            <option value="UPI">UPI / QR Code</option>
                            <option value="CASH">Cash Drawer</option>
                            <option value="CARD">Credit / Debit Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="remarks" className="text-slate-300 text-xs font-bold">Remarks / Transaction Ref</Label>
                          <Input
                            id="remarks"
                            placeholder="e.g. GPay / PhonePe ref or Cash received"
                            value={paymentRemarks}
                            onChange={(e) => setPaymentRemarks(e.target.value)}
                            className="bg-slate-950 border-slate-850 text-white text-xs h-9 rounded-xl"
                            disabled={isPending}
                          />
                        </div>

                        <Button
                          onClick={handleCollectPayment}
                          disabled={isPending || collectAmount <= 0}
                          className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs gap-2 mt-2 h-10 rounded-xl shadow-lg"
                        >
                          <Wallet className="w-4 h-4" />
                          Record Payment & Settle
                        </Button>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-600/5 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                        <p className="font-extrabold text-emerald-400 text-base mt-3">Balance Fully Cleared</p>
                        <p className="text-xs text-slate-400 mt-1">This order has zero outstanding balance. Ready for delivery handover.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payments Ledger History For Selected JC */}
                <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                  <CardHeader className="border-b border-slate-900/60 pb-3">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Order Payment History Ledger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2.5 max-h-56 overflow-y-auto">
                    {loadingLedger ? (
                      <p className="text-xs text-slate-500 py-3">Loading ledger...</p>
                    ) : paymentsList.length > 0 ? (
                      paymentsList.map((pay) => (
                        <div 
                          key={pay.id}
                          className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{pay.payment_type}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                pay.payment_method === "CASH" ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                              }`}>
                                {pay.payment_method}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {pay.recorded_at ? pay.recorded_at.split('T')[0].split('-').reverse().join('/') : ""} {pay.remarks && `• ${pay.remarks}`}
                            </p>
                          </div>
                          <span className="font-extrabold text-emerald-400 font-mono">₹{pay.amount.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        {selectedJc.advance_paid > 0 ? (
                          <div className="p-2.5 rounded-xl border border-slate-900 bg-slate-950/40 text-xs flex justify-between items-center text-left">
                            <div>
                              <p className="font-bold text-slate-200">ADVANCE AT BOOKING</p>
                              <p className="text-[10px] text-slate-500">Collected during order creation</p>
                            </div>
                            <span className="font-extrabold text-emerald-400 font-mono">₹{selectedJc.advance_paid.toFixed(2)}</span>
                          </div>
                        ) : (
                          "No advance or payment ledger entries yet."
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md p-6 text-center text-slate-500 text-xs">
                Select an order to record payments or view collection history.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Invoice Thermal Print Preview Modal */}
      {selectedJc && (
        <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
          <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md lg:max-w-lg w-full p-6 shadow-2xl">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-indigo-400" />
                <DialogTitle className="text-white text-base sm:text-lg font-bold">Tax Invoice & Receipt Preview</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                Formatted thermal slip for {selectedJc.job_card_number}
              </DialogDescription>
            </DialogHeader>

            {/* Thermal Slip Content */}
            <div className="p-6 bg-white text-slate-950 font-mono text-xs shadow-xl rounded-xl space-y-4 max-h-[550px] overflow-y-auto border border-slate-200">
              <div className="text-center space-y-1">
                <p className="text-sm font-extrabold tracking-wider">JAI TRADERR LAUNDRY</p>
                <p className="text-[10px] text-slate-600">Premium Fabric Care & Dry Cleaning</p>
                <p className="text-[10px] text-slate-600">Tel: +91 99887 76655</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                <p className="flex justify-between"><span>JC NUMBER:</span> <span className="font-bold">{selectedJc.job_card_number}</span></p>
                <p className="flex justify-between"><span>DATE:</span> <span>{selectedJc.created_at ? selectedJc.created_at.split('T')[0].split('-').reverse().join('/') : ""}</span></p>
                <p className="flex justify-between"><span>CUSTOMER:</span> <span>{selectedJc.customer_name}</span></p>
                <p className="flex justify-between"><span>MOBILE:</span> <span>{selectedJc.customer_mobile}</span></p>
                {selectedJc.shelf_location && (
                  <p className="flex justify-between"><span>SHELF RACK:</span> <span className="font-bold text-indigo-700">{selectedJc.shelf_location}</span></p>
                )}
              </div>

              <div className="space-y-1.5 py-1">
                <p className="font-bold border-b border-slate-200 pb-1 text-[11px]">ORDER ITEMS</p>
                {selectedJc.services?.map(s => (
                  <div key={s.id} className="space-y-1">
                    <p className="font-bold text-[10px] text-slate-700">{s.service_name_snapshot}</p>
                    {s.items?.map(it => (
                      <div key={it.id} className="flex justify-between text-[10px]">
                        <span>{it.quantity}x {it.item_name_snapshot}</span>
                        <span>₹{it.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
                <p className="flex justify-between font-bold"><span>GRAND TOTAL:</span> <span>₹{selectedJc.grand_total}</span></p>
                <p className="flex justify-between text-emerald-700"><span>ADVANCE PAID:</span> <span>₹{selectedJc.advance_paid}</span></p>
                <p className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1">
                  <span>BALANCE DUE:</span> <span>₹{selectedJc.balance_due}</span>
                </p>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-3 text-center space-y-1 text-[10px] text-slate-600">
                <p>Status: {selectedJc.balance_due <= 0 ? "PAID IN FULL" : "PAYMENT PENDING"}</p>
                <p>Thank you for choosing Jai Traderr Laundry!</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 px-6 h-10 rounded-xl"
              >
                <Printer className="w-4 h-4" />
                Send to Printer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
