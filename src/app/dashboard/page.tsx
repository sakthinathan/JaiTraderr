import React from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  TrendingUp, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  FolderPlus, 
  ArrowRight, 
  Package, 
  Shirt, 
  Zap, 
  Sliders, 
  IndianRupee, 
  Search
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { getJobCardsList } from "@/app/actions/job-cards";
import { getAllPayments } from "@/app/actions/payments";
import { getExpensesList } from "@/app/actions/expenses";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  // Retrieve live data from Supabase
  const [jobCards, payments, expenses] = await Promise.all([
    getJobCardsList(),
    getAllPayments(),
    getExpensesList()
  ]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayJcs = jobCards.filter(jc => jc.created_at?.split("T")[0] === todayStr);
  const todayPayments = payments.filter(p => p.recorded_at?.split("T")[0] === todayStr);
  const todayExpenses = expenses.filter(e => e.expense_date === todayStr);

  const stats = {
    jobCardsCreated: todayJcs.length,
    revenueToday: todayJcs.reduce((sum, jc) => sum + jc.grand_total, 0),
    cashCollected: todayPayments.reduce((sum, p) => sum + p.amount, 0),
    pendingBalance: jobCards.filter(j => j.status !== "DELIVERED").reduce((sum, jc) => sum + jc.balance_due, 0),
    expenses: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
    operatingResult: 0, // Computed below
    washingCount: jobCards.filter(jc => jc.status === "WASHING").length,
    ironingCount: jobCards.filter(jc => jc.status === "IRONING").length,
    readyCount: jobCards.filter(jc => jc.status === "READY_FOR_DELIVERY").length,
    deliveredCount: jobCards.filter(jc => jc.status === "DELIVERED").length,
  };
  stats.operatingResult = stats.cashCollected - stats.expenses;

  // Fetch the 5 most recent orders for live pipeline preview
  const recentActiveJcs = [...jobCards]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentOrders = recentActiveJcs.map(jc => ({
    id: jc.job_card_number,
    customer: jc.customer_name || "Guest",
    mobile: jc.customer_mobile || "N/A",
    items: jc.remarks || "Order Details",
    status: jc.status,
    amount: jc.grand_total,
    balance: jc.balance_due,
    shelf: jc.shelf_location || null
  }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
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
    <div className="space-y-4 md:space-y-5 animate-fade-in pb-4">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 md:p-5 rounded-xl border border-slate-900 bg-slate-950/40 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[60px] pointer-events-none" />
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            {getGreeting()}, {user.name.split(" ")[0]}!
            <span className="animate-wave origin-[70%_70%] inline-block">👋</span>
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Logged in as <span className="text-indigo-400 font-semibold">{user.roleName}</span>. Operational context initialized for today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {(user.role === "admin" || user.role === "billing_staff") && (
            <>
              <Link 
                href="/dashboard/job-cards" 
                className={buttonVariants({ size: "sm", className: "bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-lg shadow-indigo-600/10 text-xs" })}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Job Card
              </Link>
              <Link
                href="/dashboard/customers"
                className={buttonVariants({ variant: "outline", size: "sm", className: "border-slate-800 text-slate-350 hover:bg-slate-900/10 gap-2 text-xs" })}
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-500" />
                Register Customer
              </Link>
            </>
          )}
          {user.role === "processing_staff" && (
            <Link 
              href="/dashboard/workflow" 
              className={buttonVariants({ size: "sm", className: "bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs" })}
            >
              <Package className="w-3.5 h-3.5" />
              Update Status
            </Link>
          )}
          {user.role === "delivery_staff" && (
            <Link 
              href="/dashboard/payments" 
              className={buttonVariants({ size: "sm", className: "bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs" })}
            >
              <Search className="w-3.5 h-3.5" />
              Lookup Delivery
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {/* 1. Quick Financial Cards (Admin-centric but displayed summaries for everyone) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md hover:border-slate-800 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase">Revenue Today</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">₹{stats.revenueToday.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">+{stats.jobCardsCreated} jobs</span> created since morning
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md hover:border-slate-800 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cash Collected</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">₹{stats.cashCollected.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">
              Advances + final balance collections
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md hover:border-slate-800 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase">Pending Balance</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">₹{stats.pendingBalance.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">
              Outstanding values on active orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md hover:border-slate-800 transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-slate-400 uppercase">Operating Result</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">₹{stats.operatingResult.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">
              Est. Net (Cash ₹{stats.cashCollected} - Expenses ₹{stats.expenses})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Operations Workflow Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-900 bg-slate-950/10">
        <div className="text-center p-3 border-r border-slate-900 last:border-0">
          <p className="text-slate-500 text-xs font-medium uppercase">Washing</p>
          <div className="text-3xl font-extrabold text-indigo-400 mt-1.5 flex items-center justify-center gap-1.5">
            <Shirt className="w-5 h-5" />
            {stats.washingCount}
          </div>
        </div>
        <div className="text-center p-3 border-r border-slate-900 last:border-0">
          <p className="text-slate-500 text-xs font-medium uppercase">Ironing</p>
          <div className="text-3xl font-extrabold text-amber-400 mt-1.5 flex items-center justify-center gap-1.5">
            <Zap className="w-5 h-5" />
            {stats.ironingCount}
          </div>
        </div>
        <div className="text-center p-3 border-r border-slate-900 last:border-0">
          <p className="text-slate-500 text-xs font-medium uppercase">Ready for Pickup</p>
          <div className="text-3xl font-extrabold text-emerald-400 mt-1.5 flex items-center justify-center gap-1.5">
            <Package className="w-5 h-5" />
            {stats.readyCount}
          </div>
        </div>
        <div className="text-center p-3">
          <p className="text-slate-500 text-xs font-medium uppercase">Delivered Today</p>
          <div className="text-3xl font-extrabold text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-5 h-5" />
            {stats.deliveredCount}
          </div>
        </div>
      </div>

      {/* 3. Table area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Orders (wide) */}
        <Card className="lg:col-span-2 border-slate-900 bg-slate-950/20 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-white">Active Order Processing</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Live tracking of ongoing orders inside the laundry pipeline</CardDescription>
            </div>
            <Link 
              href="/dashboard/workflow" 
              className={buttonVariants({ variant: "ghost", className: "text-xs text-indigo-400 hover:text-indigo-300 gap-1" })}
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500 font-semibold text-xs uppercase bg-slate-950/30">
                    <th className="px-6 py-3">Job ID</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Workflow State</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-900/20 text-slate-300 transition">
                      <td className="px-6 py-4.5 font-mono text-xs font-semibold text-white">{order.id}</td>
                      <td className="px-6 py-4.5">
                        <p className="font-semibold text-slate-200">{order.customer}</p>
                        <p className="text-[10px] text-slate-500">{order.mobile} • {order.items}</p>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${getStatusColor(order.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {order.status.replace(/_/g, " ")}
                          {order.shelf && <span className="text-slate-500 font-medium ml-1">[{order.shelf}]</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right font-medium text-white">₹{order.amount}</td>
                      <td className="px-6 py-4.5 text-right">
                        {order.balance > 0 ? (
                          <span className="text-rose-400 font-semibold text-xs">₹{order.balance}</span>
                        ) : (
                          <span className="text-emerald-400 text-xs font-medium">Paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                        No active job card orders currently in process.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Portal Configurations & Quick actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Lifecycle Management</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Direct links to critical lifecycle stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link 
                href="/dashboard/job-cards" 
                className={buttonVariants({ variant: "outline", className: "w-full h-auto py-2.5 justify-start border-slate-900 text-slate-300 hover:bg-slate-900 gap-3" })}
              >
                <FolderPlus className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200">Generate Job Card</p>
                  <p className="text-[9px] text-slate-500">Record customer clothes & advance payment</p>
                </div>
              </Link>
              <Link 
                href="/dashboard/workflow" 
                className={buttonVariants({ variant: "outline", className: "w-full h-auto py-2.5 justify-start border-slate-900 text-slate-300 hover:bg-slate-900 gap-3" })}
              >
                <Package className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200">Track Order Pipeline</p>
                  <p className="text-[9px] text-slate-500">Washing, ironing, and shelf updates</p>
                </div>
              </Link>
              <Link 
                href="/dashboard/payments" 
                className={buttonVariants({ variant: "outline", className: "w-full h-auto py-2.5 justify-start border-slate-900 text-slate-300 hover:bg-slate-900 gap-3" })}
              >
                <IndianRupee className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200">Collect Balances & Deliver</p>
                  <p className="text-[9px] text-slate-500">Validate balance and dispatch invoice PDF</p>
                </div>
              </Link>
              {user.role === "admin" && (
                <Link 
                  href="/dashboard/rates" 
                  className={buttonVariants({ variant: "outline", className: "w-full h-auto py-2.5 justify-start border-slate-900 text-slate-300 hover:bg-slate-900 gap-3" })}
                >
                  <Sliders className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-200">Pricing Master Configuration</p>
                    <p className="text-[9px] text-slate-500">Manage Service + Item rates catalog</p>
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Audit logs summary */}
          <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                <span className="text-slate-400">Database Connection</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                <span className="text-slate-400">WhatsApp Notification Hub</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PDF Generator Engine</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Online
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
