"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition } from "react";
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
  History
} from "lucide-react";
import { Expense, ExpenseCategory, recordExpense } from "@/app/actions/expenses";
import { Payment } from "@/app/actions/payments";
import { JobCard } from "@/app/actions/job-cards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  payments: Payment[];
  jobCards: JobCard[];
}

export default function ExpensesClient({ 
  initialExpenses, 
  categories,
  payments,
  jobCards
}: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  // Daily Tally States
  const [tallyDate, setTallyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [openingCash, setOpeningCash] = useState<number>(0);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`opening-cash-${today}`);
      if (saved) {
        setTimeout(() => {
          setOpeningCash(Number(saved));
        }, 0);
      }
    }
  }, []);

  const handleDateChange = (date: string) => {
    setTallyDate(date);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`opening-cash-${date}`);
      setOpeningCash(saved ? Number(saved) : 0);
    }
  };

  const handleOpeningCashChange = (val: number) => {
    setOpeningCash(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`opening-cash-${tallyDate}`, val.toString());
    }
  };

  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<Expense["payment_method"]>("UPI");
  const [description, setDescription] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!categoryId || amount <= 0) {
      setFormError("Please select a category and enter a valid positive amount.");
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
        
        // Append locally to list
        const matchedCat = categories.find(c => c.id === categoryId);
        const newExp: Expense = {
          id: `mock-exp-${Date.now()}`,
          category_id: categoryId,
          category_name: matchedCat ? matchedCat.name : "Category",
          description: description || null,
          amount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          branch_id: "b1111111-1111-1111-1111-111111111111",
          created_at: new Date().toISOString()
        };
        setExpenses([newExp, ...expenses]);

        // Reset inputs
        setCategoryId("");
        setAmount(0);
        setDescription("");
      }
    });
  };

  // Calculations
  const totalSpent = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const categoryTotals = expenses.reduce((acc: Record<string, number>, exp) => {
    const name = exp.category_name || "Unknown";
    acc[name] = (acc[name] || 0) + exp.amount;
    return acc;
  }, {});

  const filteredExpenses = expenses.filter(exp => 
    !categoryFilter || exp.category_id === categoryFilter
  );

  // Daily Tally Calculations
  const dayPayments = payments.filter(p => {
    if (!p.recorded_at) return false;
    return p.recorded_at.split("T")[0] === tallyDate;
  });

  const dayExpenses = expenses.filter(e => {
    if (!e.expense_date) return false;
    return e.expense_date.split("T")[0] === tallyDate;
  });

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

  const totalCollected = dayPayments.reduce((sum, p) => sum + p.amount, 0);

  const cashExpenses = dayExpenses
    .filter(e => e.payment_method === "CASH")
    .reduce((sum, e) => sum + e.amount, 0);

  const nonCashExpenses = dayExpenses
    .filter(e => e.payment_method !== "CASH")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expectedCashInDrawer = openingCash + cashCollected - cashExpenses;

  // Combined Daily Cash Register Timeline
  const dailyLedgerMovements = [
    ...dayPayments.map(p => {
      const jc = jobCards.find(j => j.id === p.job_card_id);
      return {
        id: p.id,
        type: "INFLOW" as const,
        title: `Payment Received (${p.payment_method})`,
        subtitle: `Order #${jc?.job_card_number || "JC"} • Customer: ${jc?.customer_name || "Guest"}`,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Expenses Ledger</h1>
        <p className="text-slate-400 text-sm mt-1">
          Record operational expenditures, salaries, utility bills, and monitor branch outflows.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Monthly Expenditures</p>
              <p className="text-2xl font-extrabold text-white mt-1.5">₹{totalSpent.toFixed(2)}</p>
            </div>
            <ArrowDownCircle className="w-10 h-10 text-rose-500/20" />
          </CardContent>
        </Card>

        {/* Highest category spender card */}
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Cost Category</p>
              {Object.keys(categoryTotals).length > 0 ? (
                (() => {
                  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
                  return (
                    <>
                      <p className="text-lg font-bold text-white mt-1.5 truncate max-w-[150px]">{sorted[0][0]}</p>
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

        {/* Average transaction card */}
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Cost per Voucher</p>
              <p className="text-2xl font-extrabold text-white mt-1.5">
                ₹{expenses.length > 0 ? (totalSpent / expenses.length).toFixed(2) : "0.00"}
              </p>
            </div>
            <Receipt className="w-10 h-10 text-cyan-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* Daily Cash Drawer & Tally Section */}
      <Card className="border border-slate-900 bg-slate-950/20 backdrop-blur-md">
        <CardHeader className="border-b border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-lime-500" />
            <div>
              <CardTitle className="text-base font-bold text-slate-950">Daily Cash Drawer & Reconciliation Tally</CardTitle>
              <CardDescription className="text-slate-500 text-[10px]">Verify drawer cash levels against digital logs.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Label htmlFor="tallyDate" className="text-xs text-slate-400 font-bold uppercase shrink-0">Select Date:</Label>
            <Input
              id="tallyDate"
              type="date"
              value={tallyDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 w-36 text-xs bg-slate-950 border-slate-850 text-white font-mono"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Box: Drawer Status & Opening Cash */}
            <div className="space-y-4 bg-slate-950/30 p-4.5 rounded-xl border border-slate-900/60">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                Drawer Cash Reconciliation
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="openingCash" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Opening Cash (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-bold">₹</span>
                  <Input
                    id="openingCash"
                    type="number"
                    value={openingCash}
                    onChange={(e) => handleOpeningCashChange(Math.max(0, Number(e.target.value)))}
                    className="h-9 pl-6 bg-slate-950 border-slate-850 text-xs text-white font-mono font-bold"
                  />
                </div>
                <p className="text-[9px] text-slate-500">Cash in drawer at start of selected day.</p>
              </div>

              <div className="border-t border-slate-900 pt-3 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Opening Cash:</span>
                  <span className="font-mono">₹{openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>+ Cash Collections:</span>
                  <span className="font-mono text-emerald-600">+ ₹{cashCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>- Cash Expenses:</span>
                  <span className="font-mono text-rose-400">- ₹{cashExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-950 border-t border-slate-900 pt-2.5">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-lime-600">₹{expectedCashInDrawer.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Middle Box: Collections Breakdown by Payment Method */}
            <div className="space-y-4 bg-slate-950/30 p-4.5 rounded-xl border border-slate-900/60">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                Payments Summary
              </p>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400 border-b border-slate-900 pb-1.5">
                  <span>Cash Collections:</span>
                  <span className="font-semibold text-slate-800">₹{cashCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-slate-900 pb-1.5">
                  <span>UPI Transactions:</span>
                  <span className="font-semibold text-slate-800">₹{upiCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-slate-900 pb-1.5">
                  <span>Card / NetBanking:</span>
                  <span className="font-semibold text-slate-800">₹{cardCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-slate-900 pb-1.5">
                  <span>Other Methods:</span>
                  <span className="font-semibold text-slate-800">₹{otherCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Day Non-Cash Expenses:</span>
                  <span className="font-mono text-rose-400">- ₹{nonCashExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Day Expenditures:</span>
                  <span className="font-mono text-rose-500">- ₹{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-950 border-t border-slate-900 pt-2">
                  <span>Total Day Revenue:</span>
                  <span className="font-mono text-indigo-600">₹{totalCollected.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Box: Combined Cash Register Register log */}
            <div className="space-y-3 flex flex-col h-[230px]">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4" />
                Ledger Timeline ({dailyLedgerMovements.length})
              </p>
              
              <div className="flex-1 border border-slate-900 rounded-xl divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40 overflow-y-auto p-1.5 space-y-2">
                {dailyLedgerMovements.map((move, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-900/40 bg-slate-950/20 text-xs flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        {move.type === "INFLOW" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 truncate">{move.title}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate">{move.subtitle}</p>
                    </div>
                    <span className={`font-bold shrink-0 text-xs ${move.type === "INFLOW" ? "text-emerald-500" : "text-rose-500"}`}>
                      {move.type === "INFLOW" ? "+" : "-"} ₹{move.amount}
                    </span>
                  </div>
                ))}
                {dailyLedgerMovements.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-10">
                    No transactions recorded on this date.
                  </div>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add Expense */}
        <div className="space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
                Record Expenditure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordExpense} className="space-y-4">
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
                  <Label htmlFor="category" className="text-slate-300 text-xs">Expense Category <span className="text-rose-500">*</span></Label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-850 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isPending}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-300 text-xs">Amount (₹) <span className="text-rose-500">*</span></Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                    <Input
                      id="amount"
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="pl-8 bg-slate-950 border-slate-850 text-white h-9"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-slate-300 text-xs">Voucher Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <Input
                      id="date"
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-850 text-white h-9 text-xs"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payMethod" className="text-slate-300 text-xs">Payment Method</Label>
                  <select
                    id="payMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-850 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    disabled={isPending}
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-slate-300 text-xs">Voucher Description</Label>
                  <Input
                    id="desc"
                    placeholder="e.g. Liquid soap 20L can..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-950 border-slate-850 text-white h-9 text-xs"
                    disabled={isPending}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-9 mt-2 text-xs"
                >
                  {isPending ? "Logging..." : "Log Voucher Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Expenses Logs List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-3">
              <div>
                <CardTitle className="text-base font-bold text-white">Expenditure Vouchers Ledger</CardTitle>
                <CardDescription className="text-slate-500 text-[10px]">Track historical cash/bank outflows.</CardDescription>
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-900 text-[10px] px-2 py-1 rounded-lg text-white focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border border-slate-900 rounded-xl divide-y divide-slate-900/60 overflow-hidden bg-slate-950/40 max-h-[350px] overflow-y-auto pr-1">
                {filteredExpenses.map((exp) => (
                  <div key={exp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/10 transition text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-200">{exp.category_name}</p>
                      {exp.description && <p className="text-slate-400 text-[11px]">&quot;{exp.description}&quot;</p>}
                      <p className="text-[10px] text-slate-500 font-mono">
                        {exp.expense_date ? exp.expense_date.split('T')[0].split('-').reverse().join('/') : ""} • Method: {exp.payment_method}
                      </p>
                    </div>
                    <span className="font-extrabold text-rose-400 shrink-0 text-sm">₹{exp.amount}</span>
                  </div>
                ))}
                {filteredExpenses.length === 0 && (
                  <div className="py-20 text-center text-slate-500 text-xs">No expense records found.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
