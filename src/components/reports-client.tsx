"use client";

import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  BarChart4, 
  Layers
} from "lucide-react";
import { JobCard } from "@/app/actions/job-cards";
import { Payment } from "@/app/actions/payments";
import { Expense } from "@/app/actions/expenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ReportsClientProps {
  jobCards: JobCard[];
  payments: Payment[];
  expenses: Expense[];
}

type ReportType = "REVENUE" | "PAYMENTS" | "EXPENSES" | "JOBCARDS" | "WORKFLOW";

interface ReportRow {
  date: string;
  reference: string;
  details: string;
  type: string;
  amount: number;
}

export default function ReportsClient({ jobCards, payments, expenses }: ReportsClientProps) {
  const [reportType, setReportType] = useState<ReportType>("REVENUE");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [generated, setGenerated] = useState(false);

  const handleGenerateReport = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    let matchedRows: ReportRow[] = [];

    // Helper to generate dates range
    const dates: string[] = [];
    const current = new Date(startDate);
    const endT = new Date(endDate);
    while (current <= endT) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    if (reportType === "REVENUE") {
      const filtered = jobCards.filter(jc => {
        const date = new Date(jc.created_at);
        return date >= start && date <= end;
      });

      matchedRows = filtered.map(jc => ({
        date: jc.created_at ? jc.created_at.split('T')[0].split('-').reverse().join('/') : "",
        reference: jc.job_card_number,
        details: `Customer: ${jc.customer_name || "Unknown"}`,
        type: jc.status,
        amount: jc.grand_total
      }));
    } else if (reportType === "PAYMENTS") {
      const filtered = payments.filter(pay => {
        const date = new Date(pay.recorded_at);
        return date >= start && date <= end;
      });

      matchedRows = filtered.map(pay => {
        const jc = jobCards.find(j => j.id === pay.job_card_id);
        return {
          date: pay.recorded_at ? pay.recorded_at.split('T')[0].split('-').reverse().join('/') : "",
          reference: jc?.job_card_number || "Payment",
          details: `Method: ${pay.payment_method} • Type: ${pay.payment_type}`,
          type: pay.payment_method,
          amount: pay.amount
        };
      });
    } else if (reportType === "EXPENSES") {
      const filtered = expenses.filter(exp => {
        const date = new Date(exp.expense_date);
        return date >= start && date <= end;
      });

      matchedRows = filtered.map(exp => ({
        date: exp.expense_date ? exp.expense_date.split('T')[0].split('-').reverse().join('/') : "",
        reference: `EXP-${exp.id.slice(-4).toUpperCase()}`,
        details: exp.description || exp.category_name || "Operational cost",
        type: exp.category_name || "Other",
        amount: exp.amount
      }));
    } else if (reportType === "JOBCARDS") {
      // Group job cards created by day
      dates.forEach(dayStr => {
        const dayJcs = jobCards.filter(jc => {
          if (!jc.created_at) return false;
          return jc.created_at.split("T")[0] === dayStr;
        });

        if (dayJcs.length > 0) {
          const totalVal = dayJcs.reduce((sum, j) => sum + j.grand_total, 0);
          matchedRows.push({
            date: dayStr.split('-').reverse().join('/'),
            reference: `${dayJcs.length} Job Cards`,
            details: `Avg Value: ₹${(totalVal / dayJcs.length).toFixed(2)} • Numbers: ${dayJcs.map(j => j.job_card_number).join(', ')}`,
            type: "VOLUME",
            amount: dayJcs.length // count of cards
          });
        }
      });
    } else if (reportType === "WORKFLOW") {
      // Group active status counts daily
      dates.forEach(dayStr => {
        const dayJcs = jobCards.filter(jc => {
          if (!jc.updated_at) return false;
          return jc.updated_at.split("T")[0] === dayStr;
        });

        if (dayJcs.length > 0) {
          const recd = dayJcs.filter(j => j.status === "RECEIVED").length;
          const wash = dayJcs.filter(j => j.status === "WASHING").length;
          const iron = dayJcs.filter(j => j.status === "IRONING").length;
          const ready = dayJcs.filter(j => j.status === "READY_FOR_DELIVERY").length;
          const delvd = dayJcs.filter(j => j.status === "DELIVERED").length;

          matchedRows.push({
            date: dayStr.split('-').reverse().join('/'),
            reference: `Active: ${dayJcs.length} cards`,
            details: `Received: ${recd} | Washing: ${wash} | Ironing: ${iron} | Ready: ${ready} | Delivered: ${delvd}`,
            type: "OPERATIONAL",
            amount: dayJcs.length
          });
        }
      });
    }

    setRows(matchedRows);
    setGenerated(true);
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      "Date", 
      "Reference Code", 
      "Details", 
      "Classification", 
      (reportType === "WORKFLOW" || reportType === "JOBCARDS" ? "Volume (Qty)" : "Amount (INR)")
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map(r => [
        `"${r.date}"`,
        `"${r.reference}"`,
        `"${r.details.replace(/"/g, '""')}"`,
        `"${r.type}"`,
        r.amount
      ].join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laundry_report_${reportType.toLowerCase()}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAmount = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Analytics & Reports</h1>
        <p className="text-slate-400 text-sm mt-1">
          Compile operational reports, export transaction sheets, and audit system volume.
        </p>
      </div>

      {/* Filter Parameters Card */}
      <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {/* Report Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="repType" className="text-slate-300 text-xs">Report Classification</Label>
              <select
                id="repType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-850 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="REVENUE">Revenue Billed (Job Cards)</option>
                <option value="PAYMENTS">Payments Collected Ledger</option>
                <option value="EXPENSES">Operating Expenses</option>
                <option value="JOBCARDS">Job Cards Daily Volume</option>
                <option value="WORKFLOW">Workflow Stage Progression</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start" className="text-slate-300 text-xs">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-850 text-white h-9 text-xs"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end" className="text-slate-300 text-xs">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-850 text-white h-9 text-xs"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerateReport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 text-xs font-semibold gap-1.5"
            >
              <BarChart4 className="w-4 h-4" />
              Compile Report
            </Button>

          </div>
        </CardContent>
      </Card>

      {/* Generated Report Data grid */}
      {generated ? (
        <Card className="border-slate-900 bg-slate-950/20 backdrop-blur-md animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-3">
            <div>
              <CardTitle className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-400" />
                Report Output ({rows.length} rows)
              </CardTitle>
              <CardDescription className="text-slate-500 text-[10px]">
                Showing consolidated ledger from {startDate} to {endDate}.
              </CardDescription>
            </div>
            {rows.length > 0 && (
              <Button
                onClick={handleExportCSV}
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs h-9 gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            
            {/* Table */}
            <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-900 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Reference Code</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">Classification</th>
                      <th className="p-4 text-right">
                        {reportType === "WORKFLOW" || reportType === "JOBCARDS" ? "Volume (Qty)" : "Amount (INR)"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition">
                        <td className="p-4 font-medium">{row.date}</td>
                        <td className="p-4 font-mono">{row.reference}</td>
                        <td className="p-4 text-slate-400">{row.details}</td>
                        <td className="p-4 uppercase text-[10px]"><span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">{row.type.replace(/_/g, " ")}</span></td>
                        <td className="p-4 text-right font-bold text-slate-200">
                          {reportType === "WORKFLOW" || reportType === "JOBCARDS" ? `${row.amount} Cards` : `₹${row.amount.toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No transactions found within the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summation Footer Summary */}
            {rows.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 flex justify-between items-center text-sm">
                <span className="text-slate-400 font-bold">
                  {reportType === "WORKFLOW" || reportType === "JOBCARDS" ? "Total Output Volume Tally" : "Consolidated Summary Total Volume"}
                </span>
                <span className="text-indigo-400 font-extrabold text-lg">
                  {reportType === "WORKFLOW" || reportType === "JOBCARDS" ? `${totalAmount} Cards` : `₹${totalAmount.toFixed(2)}`}
                </span>
              </div>
            )}

          </CardContent>
        </Card>
      ) : (
        <div className="p-20 border border-dashed border-slate-900 rounded-xl text-center">
          <Layers className="w-12 h-12 text-slate-800 mx-auto stroke-1" />
          <p className="text-slate-500 text-xs mt-3">Select filters and click &quot;Compile Report&quot; to build visual auditing grids.</p>
        </div>
      )}
    </div>
  );
}
