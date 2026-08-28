/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface StatusHistory {
  id: string;
  job_card_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_at: string;
  remarks: string | null;
}

// In-memory mock database state for demo testing
const mockHistoryLogs: StatusHistory[] = [
  {
    id: "h1",
    job_card_id: "mock-jc-1",
    from_status: "RECEIVED",
    to_status: "WASHING",
    changed_by: "Alex Admin",
    changed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    remarks: "Sent to washing section"
  },
  {
    id: "h2",
    job_card_id: "mock-jc-1",
    from_status: "WASHING",
    to_status: "IRONING",
    changed_by: "Alex Admin",
    changed_at: new Date(Date.now() - 3600000).toISOString(),
    remarks: "Washing complete, steam iron initiated"
  },
  {
    id: "h3",
    job_card_id: "mock-jc-1",
    from_status: "IRONING",
    to_status: "READY_FOR_DELIVERY",
    changed_by: "Alex Admin",
    changed_at: new Date().toISOString(),
    remarks: "Placed on Rack A-12"
  }
];

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

export async function updateJobCardStatus(
  jobCardId: string,
  toStatus: "RECEIVED" | "WASHING" | "IRONING" | "READY_FOR_DELIVERY" | "DELIVERED",
  shelfLocation?: string,
  remarks?: string
): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const { getJobCardDetails } = await import("./job-cards");
    const jc = await getJobCardDetails(jobCardId);
    if (!jc) return { success: false, error: "Job Card not found." };

    if (toStatus === "READY_FOR_DELIVERY" && !shelfLocation) {
      return { success: false, error: "A shelf location is mandatory when transitioning order to READY_FOR_DELIVERY status." };
    }

    // Direct in-memory array mutation (simulating trigger logic)
    const { getJobCardsList } = await import("./job-cards");
    const list = await getJobCardsList();
    const idx = list.findIndex(j => j.id === jobCardId);
    if (idx !== -1) {
      const oldStatus = list[idx].status;
      list[idx].status = toStatus;
      if (toStatus === "READY_FOR_DELIVERY" && shelfLocation) {
        list[idx].shelf_location = shelfLocation;
      }
      list[idx].updated_at = new Date().toISOString();

      // Push history log
      mockHistoryLogs.unshift({
        id: `mock-h-${Date.now()}`,
        job_card_id: jobCardId,
        from_status: oldStatus,
        to_status: toStatus,
        changed_by: "mock-staff",
        changed_at: new Date().toISOString(),
        remarks: remarks || null
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch current status
    const { data: currentJc } = await supabase
      .from("job_cards")
      .select("status")
      .eq("id", jobCardId)
      .single();

    if (!currentJc) return { success: false, error: "Job Card not found." };

    // 2. Perform DB update
    const updatePayload: any = { status: toStatus };
    if (toStatus === "READY_FOR_DELIVERY" && shelfLocation) {
      updatePayload.shelf_location = shelfLocation;
    }

    const { error: updateError } = await supabase
      .from("job_cards")
      .update(updatePayload)
      .eq("id", jobCardId);

    if (updateError) throw updateError;

    // 3. Log history
    const { error: historyError } = await supabase
      .from("job_card_status_history")
      .insert({
        job_card_id: jobCardId,
        from_status: currentJc.status,
        to_status: toStatus,
        changed_by: user?.id,
        remarks: remarks || null,
      });

    if (historyError) throw historyError;

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("updateJobCardStatus failed:", error);
    return { success: false, error: error?.message || "Failed to update order status." };
  }
}

export async function getStatusHistory(jobCardId: string): Promise<StatusHistory[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockHistoryLogs.filter(h => h.job_card_id === jobCardId);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_card_status_history")
      .select("*")
      .eq("job_card_id", jobCardId)
      .order("changed_at", { ascending: false });

    if (error) throw error;
    return (data || []) as StatusHistory[];
  } catch (error) {
    console.error("getStatusHistory failed:", error);
    return [];
  }
}
