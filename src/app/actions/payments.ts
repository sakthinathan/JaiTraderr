/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface Payment {
  id: string;
  job_card_id: string;
  amount: number;
  payment_method: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER";
  payment_type: "ADVANCE" | "PARTIAL" | "FINAL" | "REFUND";
  recorded_by: string;
  recorded_at: string;
  remarks: string | null;
}

// In-memory mock database state for demo testing
const mockPayments: Payment[] = [];

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

export async function recordPayment(
  jobCardId: string,
  data: {
    amount: number;
    payment_method: Payment["payment_method"];
    payment_type: Payment["payment_type"];
    remarks?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const { getJobCardDetails } = await import("./job-cards");
    const jc = await getJobCardDetails(jobCardId);
    if (!jc) return { success: false, error: "Job Card not found." };

    // Record the payment
    const newPayment: Payment = {
      id: `mock-pay-${Date.now()}`,
      job_card_id: jobCardId,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_type: data.payment_type,
      recorded_by: "mock-billing",
      recorded_at: new Date().toISOString(),
      remarks: data.remarks || null
    };

    mockPayments.push(newPayment);

    // Dynamic Recalculation (simulating recalculation trigger)
    const { getJobCardsList } = await import("./job-cards");
    const list = await getJobCardsList();
    const idx = list.findIndex(j => j.id === jobCardId);
    if (idx !== -1) {
      const activePayments = mockPayments.filter(p => p.job_card_id === jobCardId);
      const totalPaid = activePayments.reduce((acc, p) => acc + p.amount, 0);
      list[idx].balance_due = list[idx].grand_total - totalPaid;
      
      // Auto transition to DELIVERED if balance is fully paid and final payment type is recorded
      if (data.payment_type === "FINAL" && list[idx].balance_due <= 0) {
        list[idx].status = "DELIVERED";
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Insert Payment Record
    const { error: payError } = await supabase
      .from("payments")
      .insert({
        job_card_id: jobCardId,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_type: data.payment_type,
        recorded_by: user?.id,
        remarks: data.remarks || null,
      });

    if (payError) throw payError;

    // 2. Fetch current balance
    const { data: updatedJc } = await supabase
      .from("job_cards")
      .select("balance_due, status")
      .eq("id", jobCardId)
      .single();

    // 3. Auto mark as DELIVERED if it was final payment and balance is cleared
    if (data.payment_type === "FINAL" && updatedJc && updatedJc.balance_due <= 0) {
      await supabase
        .from("job_cards")
        .update({ status: "DELIVERED" })
        .eq("id", jobCardId);

      // Log Workflow Status History transition
      await supabase.from("job_card_status_history").insert({
        job_card_id: jobCardId,
        from_status: updatedJc.status,
        to_status: "DELIVERED",
        changed_by: user?.id,
        remarks: "Auto-transitioned on balance payment clearing",
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("recordPayment failed:", error);
    return { success: false, error: error?.message || "Failed to record payment transaction." };
  }
}

export async function getPaymentsHistory(jobCardId: string): Promise<Payment[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockPayments.filter(p => p.job_card_id === jobCardId);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("job_card_id", jobCardId)
      .order("recorded_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Payment[];
  } catch (error) {
    console.error("getPaymentsHistory failed:", error);
    return [];
  }
}

export async function getAllPayments(): Promise<Payment[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) return mockPayments;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("recorded_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Payment[];
  } catch (error) {
    console.error("getAllPayments failed:", error);
    return [];
  }
}

