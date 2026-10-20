"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition, useMemo, useEffect } from "react";
import { 
  IndianRupee, 
  PlusCircle, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  ShieldAlert,
  ArrowDownCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Coins,
  History,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  CheckCheck,
  RefreshCw,
  Wallet,
  Clock
} from "lucide-react";
import { 
  Expense, 
  ExpenseCategory, 
  DailyClosingRecord, 
  recordExpense, 
  saveDailyClosing 
} from "@/app/actions/expenses";
import { Payment } from "@/app/actions/payments";
import { JobCard } from "@/app/actions/job-cards";
import { UserProfile } from "@/lib/supabase/get-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  payments: Payment[];
  jobCards: JobCard[];
  initialClosings?: DailyClosingRecord[];
  currentUser?: UserProfile | null;
}

export default function ExpensesClient({ 
  initialExpenses, 
  categories,
  payments,
  jobCards,
  initialClosings = [],
  currentUser
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [closings, setClosings] = useState<DailyClosingRecord[]>(initialClosings);
  const [activeTab, setActiveTab] = useState<"register" | "expenses">("register");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  // Daily Tally & Cash Register State
  const [tallyDate, setTallyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [floatSavedNotice, setFloatSavedNotice] = useState(false);

  // Day Closing Form States
  const [actualClosingCash, setActualClosingCash] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState("");
  const [closingError, setClosingError] = useState<string | null>(null);
  const [closingSuccess, setClosingSuccess] = useState<string | null>(null);

  // Quick Expense Modal from Register
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);

  // Print Daily Closing Slip Modal
  const [printClosingSlip, setPrintClosingSlip] = useState<DailyClosingRecord | null>(null);

  // Load opening cash from localStorage when date changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`opening-cash-${tallyDate}`);
      setOpeningCash(saved ? Number(saved) : 0);
    }
    setClosingError(null);
    setClosingSuccess(null);
  }, [tallyDate]);

  // Check if selected date already has a saved closing record
  const existingClosing = useMemo(() => {
    return closings.find(c => c.closing_date === tallyDate) || null;
  }, [closings, tallyDate]);

  const handleOpeningCashChange = (val: number) => {
    setOpeningCash(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`opening-cash-${tallyDate}`, val.toString());
      setFloatSavedNotice(true);
      setTimeout(() => setFloatSavedNotice(false), 2500);
    }
  };

  // Add Expense Form State (for both standard tab and quick modal)
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<Expense["payment_method"]>("CASH");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleRecordExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!categoryId || amount <= 0) {
      setFormError("Please select a valid expense category and positive amount.");
      return;
    }

    startTransition(async () => {
      const res = await recordExpense({
        category_id: categoryId,
        amount,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        description
      });

      if (!res.success) {
        setFormError(res.error || "Failed to log expense entry.");
      } else {
        setFormSuccess("Expense recorded successfully!");
        
        const matchedCat = categories.find(c => c.id === categoryId);
        const newExp: Expense = {
          id: `exp-${Date.now()}`,
          category_id: categoryId,
          category_name: matchedCat ? matchedCat.name : "Category",
          description: description || null,
          amount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          branch_id: "default-branch",
          created_at: new Date().toISOString()
        };
        setExpenses([newExp, ...expenses]);

        // Reset
        setCategoryId("");
        setAmount(0);
        setDescription("");
        if (showQuickExpenseModal) {
          setTimeout(() => setShowQuickExpenseModal(false), 1200);
        }
      }
    });
  };

  // Filter day payments and day expenses
  const dayPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.recorded_at) return false;
      return p.recorded_at.split("T")[0] === tallyDate;
    });
  }, [payments, tallyDate]);

  const dayExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!e.expense_date) return false;
      return e.expense_date.split("T")[0] === tallyDate;
    });
  }, [expenses, tallyDate]);

  // Daily Inflow / Outflow Calculations
  const cashCollected = dayPayments
    .filter(p => p.payment_method === "CASH")
    .reduce((sum, p) => sum + p.amount, 0);

  const upiCollected = dayPayments
    .filter(p => p.payment_method === "UPI")
    .reduce((sum, p) => sum + p.amount, 0);

  const cardCollected = dayPayments
    .filter(p => p.payment_method === "CARD" || p.payment_method === "BANK_TRANSFER")
    .reduce((sum, p) => sum + p.amount, 0);

  const otherCollected = dayPayments
    .filter(p => p.payment_method !== "CASH" && p.payment_method !== "UPI" && p.payment_method !== "CARD" && p.payment_method !== "BANK_TRANSFER")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCollectedRevenue = dayPayments.reduce((sum, p) => sum + p.amount, 0);

  const cashExpenses = dayExpenses
    .filter(e => e.payment_method === "CASH")
    .reduce((sum, e) => sum + e.amount, 0);

  const nonCashExpenses = dayExpenses
    .filter(e => e.payment_method !== "CASH")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalDayExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Expected Cash in Drawer Formula:
  const expectedCashInDrawer = openingCash + cashCollected - cashExpenses;

  // Live variance for closing form
  const actualCountedNum = actualClosingCash.trim() !== "" ? Number(actualClosingCash) : expectedCashInDrawer;
  const liveVariance = actualCountedNum - expectedCashInDrawer;

  // Handle Day Closing Submission
  const handleFinalDayClosing = () => {
    setClosingError(null);
    setClosingSuccess(null);

    if (actualClosingCash.trim() === "") {
      setClosingError("Please enter the actual cash counted in the drawer.");
      return;
    }

    const counted = Number(actualClosingCash);
    if (isNaN(counted) || counted < 0) {
      setClosingError("Please enter a valid cash amount (zero or positive).");
      return;
    }

    startTransition(async () => {
      const variance = counted - expectedCashInDrawer;
      const status: DailyClosingRecord["status"] = 
        Math.abs(variance) < 0.01 ? "BALANCED" : variance > 0 ? "SURPLUS" : "DEFICIT";

      const closingPayload: Omit<DailyClosingRecord, "id" | "closed_at"> = {
        closing_date: tallyDate,
        opening_cash: openingCash,
        cash_collections: cashCollected,
        upi_collections: upiCollected,
        card_collections: cardCollected,
        other_collections: otherCollected,
        total_revenue: totalCollectedRevenue,
        cash_expenses: cashExpenses,
        other_expenses: nonCashExpenses,
        total_expenses: totalDayExpenses,
        expected_cash: expectedCashInDrawer,
        actual_cash: counted,
        variance,
        notes: closingNotes.trim() || null,
        closed_by: currentUser?.name || currentUser?.email || "Shift Cashier",
        status
      };

      const res = await saveDailyClosing(closingPayload);
      if (res.success && res.data) {
        setClosingSuccess(`Day closing for ${tallyDate} finalized and locked successfully!`);
        // Update closings list
        setClosings(prev => [res.data!, ...prev.filter(c => c.closing_date !== tallyDate)]);
        setPrintClosingSlip(res.data);
      } else {
        setClosingError(res.error || "Failed to finalize daily closing.");
      }
    });
  };

  // Monthly Expenses Calculations
  const totalSpentMonthly = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const categoryTotals = expenses.reduce((acc: Record<string, number>, exp) => {
    const name = exp.category_name || "Unknown";
    acc[name] = (acc[name] || 0) + exp.amount;
    return acc;
  }, {});

  const filteredExpenses = expenses.filter(exp => 
    !categoryFilter || exp.category_id === categoryFilter
  );

  // Combined Daily Cash Register Timeline
  const dailyLedgerMovements = useMemo(() => {
    return [
      ...dayPayments.map(p => {
        const jc = jobCards.find(j => j.id === p.job_card_id);
        return {
          id: p.id,
          type: "INFLOW" as const,
          title: `Billing Payment (${p.payment_method})`,
          subtitle: `Order #${jc?.job_card_number || "Direct"} • Customer: ${jc?.customer_name || "Customer"}`,
          method: p.payment_method,
          amount: p.amount,
          time: p.recorded_at
        };
      }),
      ...dayExpenses.map(e => {
        return {
          id: e.id,
          type: "OUTFLOW" as const,
          title: `Expense Paid (${e.payment_method})`,
          subtitle: `Category: ${e.category_name} ${e.description ? `• "${e.description}"` : ""}`,
          method: e.payment_method,
          amount: e.amount,
          time: e.created_at || e.expense_date
        };
      })
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [dayPayments, dayExpenses, jobCards]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-lime-600" />
            Daily Cash Register & Expense Tracking
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Maintain day-to-day till balance from morning opening cash, customer billing, petty cash expenses, and final day closing.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-300 shrink-0">
          <button
            onClick={() => setActiveTab("register")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "register"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200 font-semibold"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Daily Cash Register & Day Closing
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "expenses"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200 font-semibold"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Operational Expenses & Vouchers
          </button>
        </div>
      </div>

      {activeTab === "register" ? (
        /* DAILY CASH REGISTER & DAY CLOSING VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Date Selector & Day Status Header Banner */}
          <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900">Daily Cash Register</p>
                    {existingClosing ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> DAY CLOSED &amp; RECONCILED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                        <Unlock className="w-3 h-3" /> REGISTER OPEN (ACTIVE SHIFT)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {existingClosing 
                      ? `Reconciled by ${existingClosing.closed_by} on ${existingClosing.closed_at.split('T')[0]} at ${existingClosing.closed_at.split('T')[1]?.slice(0, 5)}`
                      : "Live tracking cash float, customer billing inflows, and petty expenses"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="tallyDate" className="text-xs font-bold text-slate-300 uppercase shrink-0">
                  Register Date:
                </Label>
                <Input
                  id="tallyDate"
                  type="date"
                  value={tallyDate}
                  onChange={(e) => setTallyDate(e.target.value)}
                  className="h-9 w-38 text-xs bg-slate-950 border-slate-800 text-white font-mono rounded-xl"
                />
                <Button
                  onClick={() => setShowQuickExpenseModal(true)}
                  className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 h-9 px-3 text-xs font-bold rounded-xl gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  + Petty Expense
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4 Financial Flow Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Morning Opening Cash */}
            <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Step 1 • Morning</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Opening Cash Float</p>
                  </div>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">₹</span>
                    <Input
                      type="number"
                      value={openingCash || ""}
                      onChange={(e) => handleOpeningCashChange(Math.max(0, Number(e.target.value)))}
                      placeholder="0.00"
                      className="h-9 pl-6 bg-slate-950 border-slate-800 text-sm font-bold text-white font-mono rounded-xl"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-600">Drawer starting balance</span>
                    {floatSavedNotice ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Saved!
                      </span>
                    ) : (
                      <span className="text-slate-600">Auto-saved for date</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Billing Cash Collections */}
            <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Step 2 • Inflow</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">+ Cash Billing Collected</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono">+ ₹{cashCollected.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    From {dayPayments.filter(p => p.payment_method === "CASH").length} cash orders
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>UPI Collections:</span>
                    <span className="text-indigo-400 font-bold">₹{upiCollected.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Day Revenue:</span>
                    <span className="text-slate-900 font-bold">₹{totalCollectedRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Cash Expenses Paid */}
            <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Step 3 • Outflow</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">- Cash Expenses Paid</p>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-extrabold text-rose-400 font-mono">- ₹{cashExpenses.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {dayExpenses.filter(e => e.payment_method === "CASH").length} cash vouchers logged
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Non-cash Expenses:</span>
                    <span className="text-slate-300 font-bold">₹{nonCashExpenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Day Expenses:</span>
                    <span className="text-rose-400 font-bold">₹{totalDayExpenses.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Expected Drawer Balance */}
            <Card className="border-slate-900 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-lime-500" />
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider">Step 4 • Expected</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">= Expected Cash in Till</p>
                  </div>
                  <div className="p-2 rounded-xl bg-lime-500/10 text-lime-400">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-extrabold text-lime-400 font-mono">₹{expectedCashInDrawer.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Opening + Cash In - Cash Out
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-400 flex justify-between">
                  <span>Register State:</span>
                  <span className={`font-bold ${expectedCashInDrawer >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {expectedCashInDrawer >= 0 ? "Positive Till" : "Negative Till Alert"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Formula Banner */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium">Daily Drawer Cash Formula:</span>
            <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-white">
              <span className="text-cyan-400">Opening (₹{openingCash.toFixed(2)})</span>
              <span className="text-slate-500">+</span>
              <span className="text-emerald-400">Cash Billing (+₹{cashCollected.toFixed(2)})</span>
              <span className="text-slate-500">-</span>
              <span className="text-rose-400">Cash Expenses (-₹{cashExpenses.toFixed(2)})</span>
              <span className="text-slate-500">=</span>
              <span className="text-lime-400 text-sm">Expected Till: ₹{expectedCashInDrawer.toFixed(2)}</span>
            </div>
          </div>

          {/* Two Columns: Left Day Closing Form | Right Today's Movements Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: End-of-Day Closing Form / Settlement Status */}
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
              <CardHeader className="border-b border-slate-900/60 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4.5 h-4.5 text-indigo-400" />
                    Final Day Closing &amp; Settlement
                  </span>
                  {existingClosing && (
                    <Button
                      onClick={() => setPrintClosingSlip(existingClosing)}
                      size="sm"
                      className="h-8 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-400" />
                      Print Closing Slip
                    </Button>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-600 text-xs">
                  Physically count the cash drawer at end of shift/day and verify against system tally.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {closingError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{closingError}</span>
                  </div>
                )}
                {closingSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{closingSuccess}</span>
                  </div>
                )}

                {existingClosing ? (
                  /* Existing Closing Summary Certificate */
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-600/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCheck className="w-6 h-6 text-emerald-400" />
                        <div>
                          <p className="font-extrabold text-emerald-400 text-sm">Day Closed &amp; Settled</p>
                          <p className="text-[11px] text-slate-400">Date: {existingClosing.closing_date}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        existingClosing.status === "BALANCED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : existingClosing.status === "SURPLUS"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {existingClosing.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-900/60">
                      <div>
                        <span className="text-slate-500">Expected Till:</span>
                        <p className="font-mono font-bold text-white mt-0.5">₹{existingClosing.expected_cash.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Actual Counted:</span>
                        <p className="font-mono font-bold text-emerald-400 mt-0.5">₹{existingClosing.actual_cash.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Difference / Variance:</span>
                        <p className={`font-mono font-bold mt-0.5 ${
                          existingClosing.variance === 0 
                            ? "text-emerald-400" 
                            : existingClosing.variance > 0 
                            ? "text-amber-400" 
                            : "text-rose-400"
                        }`}>
                          {existingClosing.variance >= 0 ? "+" : ""}₹{existingClosing.variance.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Verified By:</span>
                        <p className="font-semibold text-slate-300 mt-0.5 truncate">{existingClosing.closed_by}</p>
                      </div>
                    </div>

                    {existingClosing.notes && (
                      <div className="text-xs border-t border-slate-900/60 pt-2 text-slate-400">
                        <span className="text-slate-500">Notes:</span> &ldquo;{existingClosing.notes}&rdquo;
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => setPrintClosingSlip(existingClosing)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 rounded-xl gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Day Closing Thermal Slip
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Form to complete day closing */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="actualCash" className="text-xs font-bold text-slate-200">
                          Actual Cash Counted in Till (₹) <span className="text-rose-400">*</span>
                        </Label>
                        <button
                          type="button"
                          onClick={() => setActualClosingCash(expectedCashInDrawer.toString())}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Fill Expected (₹{expectedCashInDrawer.toFixed(2)})
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">₹</span>
                        <Input
                          id="actualCash"
                          type="number"
                          placeholder="e.g. 5200"
                          value={actualClosingCash}
                          onChange={(e) => setActualClosingCash(e.target.value)}
                          className="pl-7 h-10 bg-slate-950 border-slate-850 text-white text-base font-bold font-mono rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Live Variance Preview Pill */}
                    {actualClosingCash.trim() !== "" && (
                      <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        Math.abs(liveVariance) < 0.01
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : liveVariance > 0
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                        <div className="flex items-center gap-2">
                          {Math.abs(liveVariance) < 0.01 ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                          <span className="font-bold">
                            {Math.abs(liveVariance) < 0.01
                              ? "Perfect Match! Cash drawer is fully balanced."
                              : liveVariance > 0
                              ? `Cash Surplus (Excess in till): +₹${liveVariance.toFixed(2)}`
                              : `Cash Shortage (Deficit in till): -₹${Math.abs(liveVariance).toFixed(2)}`}
                          </span>
                        </div>
                        <span className="font-mono font-extrabold text-sm">
                          {liveVariance >= 0 ? "+" : ""}₹{liveVariance.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="closingNotes" className="text-xs font-bold text-slate-200">
                        Closing Notes / Handover Remarks
                      </Label>
                      <Input
                        id="closingNotes"
                        placeholder="e.g. Denominations verified, handed to Shift 2"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        className="h-9 bg-slate-950 border-slate-850 text-white text-xs rounded-xl"
                      />
                    </div>

                    <Button
                      onClick={handleFinalDayClosing}
                      disabled={isPending || actualClosingCash.trim() === ""}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-lg"
                    >
                      <Lock className="w-4 h-4" />
                      Save &amp; Finalize Day Closing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Daily Ledger Movement Timeline */}
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
              <CardHeader className="border-b border-slate-900/60 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4.5 h-4.5 text-indigo-400" />
                    Today&apos;s Cash &amp; Payment Ledger ({dailyLedgerMovements.length})
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-xs">
                    Chronological inflow &amp; outflow activity for {tallyDate}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 bg-slate-950/40 max-h-80 overflow-y-auto p-1.5 space-y-1.5">
                  {dailyLedgerMovements.length > 0 ? (
                    dailyLedgerMovements.map((move) => (
                      <div
                        key={move.id}
                        className="p-2.5 rounded-lg border border-slate-900/50 bg-slate-950/20 text-xs flex justify-between items-center gap-3 hover:bg-slate-900/30 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {move.type === "INFLOW" ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span className="font-bold text-slate-100 truncate">{move.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{move.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono font-bold text-xs ${move.type === "INFLOW" ? "text-emerald-400" : "text-rose-400"}`}>
                            {move.type === "INFLOW" ? "+" : "-"} ₹{move.amount.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-slate-500">{move.time?.slice(11, 16) || ""}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      No billing payments or expenses recorded yet on this date.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Past Daily Closings History Table */}
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader className="border-b border-slate-900/60 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-indigo-400" />
                Past Daily Closings &amp; Settlement History ({closings.length})
              </CardTitle>
              <CardDescription className="text-slate-600 text-xs">
                Audit trail of completed day register settlements and cash variance records.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              {closings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-900">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Opening Float</th>
                        <th className="py-2.5 px-3">Cash Inflow</th>
                        <th className="py-2.5 px-3">Cash Outflow</th>
                        <th className="py-2.5 px-3">Expected Till</th>
                        <th className="py-2.5 px-3">Actual Counted</th>
                        <th className="py-2.5 px-3">Variance</th>
                        <th className="py-2.5 px-3">Settled By</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {closings.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/20 transition">
                          <td className="py-3 px-3 font-bold text-white">{c.closing_date}</td>
                          <td className="py-3 px-3 font-mono">₹{c.opening_cash.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400">+₹{c.cash_collections.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono text-rose-400">-₹{c.cash_expenses.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono text-white">₹{c.expected_cash.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400">₹{c.actual_cash.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.variance === 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : c.variance > 0
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {c.variance >= 0 ? "+" : ""}₹{c.variance.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">{c.closed_by}</td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              onClick={() => setPrintClosingSlip(c)}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Slip
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No finalized day closings logged yet. Complete today&apos;s settlement above to generate the first log!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* OPERATIONAL EXPENSES & VOUCHERS VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Expenditures</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1.5">₹{totalSpentMonthly.toFixed(2)}</p>
                </div>
                <ArrowDownCircle className="w-10 h-10 text-rose-500/20" />
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Top Cost Category</p>
                  {Object.keys(categoryTotals).length > 0 ? (
                    (() => {
                      const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
                      return (
                        <>
                          <p className="text-lg font-bold text-slate-900 mt-1.5 truncate max-w-[150px]">{sorted[0][0]}</p>
                          <p className="text-xs text-slate-400 mt-0.5">₹{sorted[0][1].toFixed(2)} spent</p>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-sm font-semibold text-slate-400 mt-2">No expenses logged</p>
                  )}
                </div>
                <TrendingUp className="w-10 h-10 text-indigo-500/20" />
              </CardContent>
            </Card>

            <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
              <CardContent className="pt-6 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Avg Cost per Voucher</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                    ₹{expenses.length > 0 ? (totalSpentMonthly / expenses.length).toFixed(2) : "0.00"}
                  </p>
                </div>
                <Receipt className="w-10 h-10 text-cyan-500/20" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Form: Add Expense */}
            <div className="space-y-6">
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
                    Record Expenditure Voucher
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRecordExpense} className="space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-300 text-xs font-bold">
                        Expense Category <span className="text-rose-400">*</span>
                      </Label>
                      <select
                        id="category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-850 text-white text-xs focus:border-indigo-500 focus:outline-none"
                        disabled={isPending}
                      >
                        <option value="">Select Category...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expAmount" className="text-slate-300 text-xs font-bold">
                        Amount (₹) <span className="text-rose-400">*</span>
                      </Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                        <Input
                          id="expAmount"
                          type="number"
                          placeholder="0.00"
                          value={amount || ""}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="pl-8 bg-slate-950 border-slate-850 text-white text-xs rounded-xl"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="expDate" className="text-slate-300 text-xs font-bold">Date</Label>
                        <Input
                          id="expDate"
                          type="date"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="bg-slate-950 border-slate-850 text-white text-xs rounded-xl h-9"
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expMethod" className="text-slate-300 text-xs font-bold">Payment Method</Label>
                        <select
                          id="expMethod"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full h-9 px-2 rounded-xl bg-slate-950 border border-slate-850 text-white text-xs focus:border-indigo-500 focus:outline-none"
                          disabled={isPending}
                        >
                          <option value="CASH">Cash Drawer</option>
                          <option value="UPI">UPI / GPay</option>
                          <option value="CARD">Card</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expDesc" className="text-slate-300 text-xs font-bold">Description / Vendor Notes</Label>
                      <Input
                        id="expDesc"
                        placeholder="e.g. Purchase of 50L detergent"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-slate-950 border-slate-850 text-white text-xs rounded-xl h-9"
                        disabled={isPending}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs h-10 rounded-xl gap-2 mt-2"
                    >
                      Log Expenditure
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: Expenses History Table */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900/60 pb-4">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4.5 h-4.5 text-indigo-400" />
                      Recorded Expenditures History
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-xs">
                      {filteredExpenses.length} voucher records
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-48">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-300 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 bg-slate-950/40 overflow-hidden">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((exp) => (
                        <div key={exp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/20 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{exp.category_name}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                exp.payment_method === "CASH" ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                              }`}>
                                {exp.payment_method}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {exp.description || "Operational cost"}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{exp.expense_date}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-rose-400">- ₹{exp.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No expenses logged for this filter.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Log Petty Expense */}
      <Dialog open={showQuickExpenseModal} onOpenChange={setShowQuickExpenseModal}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md w-full p-6 shadow-2xl">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-rose-400" />
              <DialogTitle className="text-white text-base font-bold">Log Quick Cash Expense</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              Directly deduct small store/petty expenses from the active cash drawer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordExpense} className="space-y-4 pt-2">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                {formSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Category *</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-indigo-600 shadow-sm"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="pl-8 bg-white border-slate-300 text-slate-900 text-xs rounded-xl font-bold shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Payment Mode</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold focus:border-indigo-600 shadow-sm"
              >
                <option value="CASH">Cash Drawer (Deducts from Till)</option>
                <option value="UPI">UPI / Online</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Purpose / Remarks</Label>
              <Input
                placeholder="e.g. Tea for staff, Detergent refill, Transport"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 text-xs rounded-xl h-9 font-medium shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQuickExpenseModal(false)}
                className="h-9 text-xs bg-white hover:bg-slate-100 border-slate-300 text-slate-700 font-semibold shadow-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Deduct &amp; Log
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Thermal Print Daily Closing Slip */}
      {printClosingSlip && (
        <Dialog open={!!printClosingSlip} onOpenChange={() => setPrintClosingSlip(null)}>
          <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md w-full p-6 shadow-2xl">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-indigo-400" />
                <DialogTitle className="text-white text-base sm:text-lg font-bold">Daily Cash Settlement Slip</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                Thermal register tally slip for date: {printClosingSlip.closing_date}
              </DialogDescription>
            </DialogHeader>

            {/* Thermal Slip Content */}
            <div className="p-6 bg-white text-slate-950 font-mono text-xs shadow-xl rounded-xl space-y-3 max-h-[550px] overflow-y-auto border border-slate-200">
              <div className="text-center space-y-1">
                <p className="text-sm font-extrabold tracking-wider">JAI TRADERR LAUNDRY</p>
                <p className="text-[10px] text-slate-600">DAILY CASH DRAWER CLOSING REPORT</p>
                <p className="text-[10px] text-slate-600">Tel: +91 99887 76655</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[11px]">
                <p className="flex justify-between"><span>DATE:</span> <span className="font-bold">{printClosingSlip.closing_date}</span></p>
                <p className="flex justify-between"><span>CLOSED AT:</span> <span>{printClosingSlip.closed_at.replace('T', ' ').slice(0, 19)}</span></p>
                <p className="flex justify-between"><span>SETTLED BY:</span> <span>{printClosingSlip.closed_by}</span></p>
                <p className="flex justify-between"><span>STATUS:</span> <span className="font-bold">{printClosingSlip.status}</span></p>
              </div>

              <div className="space-y-1.5 py-1 text-[11px]">
                <p className="flex justify-between">
                  <span>(+) OPENING FLOAT:</span>
                  <span className="font-bold">₹{printClosingSlip.opening_cash.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-emerald-700">
                  <span>(+) CASH BILLING COLLECTIONS:</span>
                  <span className="font-bold">+ ₹{printClosingSlip.cash_collections.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-indigo-700">
                  <span>(+) UPI / DIGITAL BILLING:</span>
                  <span>₹{printClosingSlip.upi_collections.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-slate-700 border-t border-slate-200 pt-1">
                  <span>TOTAL BILLING REVENUE:</span>
                  <span className="font-bold">₹{printClosingSlip.total_revenue.toFixed(2)}</span>
                </p>
                <p className="flex justify-between text-rose-700 border-t border-slate-200 pt-1">
                  <span>(-) CASH DRAWER EXPENSES:</span>
                  <span className="font-bold">- ₹{printClosingSlip.cash_expenses.toFixed(2)}</span>
                </p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1.5 text-[11px]">
                <p className="flex justify-between font-bold">
                  <span>EXPECTED DRAWER CASH:</span>
                  <span>₹{printClosingSlip.expected_cash.toFixed(2)}</span>
                </p>
                <p className="flex justify-between font-extrabold text-sm text-emerald-700">
                  <span>ACTUAL CASH COUNTED:</span>
                  <span>₹{printClosingSlip.actual_cash.toFixed(2)}</span>
                </p>
                <p className={`flex justify-between font-bold text-xs ${
                  printClosingSlip.variance === 0 
                    ? "text-emerald-700" 
                    : printClosingSlip.variance > 0 
                    ? "text-amber-700" 
                    : "text-rose-700"
                }`}>
                  <span>VARIANCE / DIFFERENCE:</span>
                  <span>{printClosingSlip.variance >= 0 ? "+" : ""}₹{printClosingSlip.variance.toFixed(2)}</span>
                </p>
              </div>

              {printClosingSlip.notes && (
                <div className="text-[10px] text-slate-600 py-1">
                  <span>REMARKS: {printClosingSlip.notes}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-400 pt-6 mt-4 grid grid-cols-2 text-center text-[10px] text-slate-600">
                <div>
                  <p>_______________________</p>
                  <p className="mt-1">Cashier Signature</p>
                </div>
                <div>
                  <p>_______________________</p>
                  <p className="mt-1">Manager Verified</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 px-6 h-10 rounded-xl"
              >
                <Printer className="w-4 h-4" />
                Print Slip
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
