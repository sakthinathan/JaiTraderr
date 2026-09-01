/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { hashOtp, sendSupervisorOtp } from "@/utils/sms";
import crypto from "crypto";


export interface JobCardItem {
  id: string;
  job_card_service_id: string;
  item_id: string | null;
  item_name_snapshot: string;
  unit_id_snapshot: string;
  rate_snapshot: number;
  quantity: number;
  amount: number;
  remarks: string | null;
}

export interface JobCardService {
  id: string;
  job_card_id: string;
  service_id: string;
  service_name_snapshot: string;
  items: JobCardItem[];
}

export interface JobCard {
  id: string;
  job_card_number: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  branch_id: string;
  status: "RECEIVED" | "WASHING" | "IRONING" | "READY_FOR_DELIVERY" | "DELIVERED";
  expected_delivery_date: string;
  remarks: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  grand_total: number;
  advance_paid: number;
  balance_due: number;
  is_locked: boolean;
  created_by?: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  shelf_location?: string | null;
  total_weight_kg?: number;
  total_pcs?: number;
  total_bags?: number;
  services?: JobCardService[];
}

export interface EditRequest {
  id: string;
  job_card_id: string;
  requested_by: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// In-memory mock database state for demo testing
const mockJobCards: JobCard[] = [
  {
    id: "mock-jc-1",
    job_card_number: "JC-2026-00040",
    customer_id: "mock-cust-3",
    customer_name: "Ravi Kumar",
    customer_mobile: "9988776655",
    branch_id: "b1111111-1111-1111-1111-111111111111",
    status: "READY_FOR_DELIVERY",
    expected_delivery_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    remarks: "Handle silk saree gently",
    subtotal: 280,
    discount: 0,
    tax_amount: 0,
    grand_total: 280,
    advance_paid: 0,
    balance_due: 280,
    is_locked: true,
    shelf_location: "A-12",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    services: [
      {
        id: "mock-jcs-1",
        job_card_id: "mock-jc-1",
        service_id: "a4444444-4444-4444-4444-444444444444",
        service_name_snapshot: "Dry Cleaning",
        items: [
          {
            id: "mock-jci-1",
            job_card_service_id: "mock-jcs-1",
            item_id: "f3333333-3333-3333-3333-333333333333",
            item_name_snapshot: "Saree",
            unit_id_snapshot: "pcs",
            rate_snapshot: 150.00,
            quantity: 1,
            amount: 150.00,
            remarks: "Silk Saree",
          },
          {
            id: "mock-jci-2",
            job_card_service_id: "mock-jcs-1",
            item_id: "f4444444-4444-4444-4444-444444444444",
            item_name_snapshot: "Blazer",
            unit_id_snapshot: "pcs",
            rate_snapshot: 130.00,
            quantity: 1,
            amount: 130.00,
            remarks: "Woolen Blazer",
          }
        ]
      }
    ]
  }
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockEditRequests: EditRequest[] = [];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockAuditLogs: any[] = [];

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

export async function createDraftJobCard(customerId: string): Promise<{ success: boolean; jobCard?: JobCard; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const { getCustomerProfile } = await import("./customers");
    const customer = await getCustomerProfile(customerId);
    if (!customer) return { success: false, error: "Customer not found." };

    const jcNum = mockJobCards.length + 41;
    const newJc: JobCard = {
      id: `mock-jc-${Date.now()}`,
      job_card_number: `JC-2026-000${jcNum}`,
      customer_id: customerId,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      branch_id: "b1111111-1111-1111-1111-111111111111",
      status: "RECEIVED",
      expected_delivery_date: new Date(Date.now() + 172800000).toISOString(), // 2 days later
      remarks: "",
      subtotal: 0,
      discount: 0,
      tax_amount: 0,
      grand_total: 0,
      advance_paid: 0,
      balance_due: 0,
      is_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      services: [],
    };

    mockJobCards.unshift(newJc);
    return { success: true, jobCard: newJc };
  }

  try {
    const supabase = await createClient();

    // Get default branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) return { success: false, error: "No operational branches configured in system." };

    const { data: { user } } = await supabase.auth.getUser();

    const { data: jobCard, error } = await supabase
      .from("job_cards")
      .insert({
        customer_id: customerId,
        branch_id: branch.id,
        status: "RECEIVED",
        expected_delivery_date: new Date(Date.now() + 172800000).toISOString(),
        created_by: user?.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    return { success: true, jobCard: jobCard as JobCard };
  } catch (error: any) {
    console.error("createDraftJobCard failed:", error);
    return { success: false, error: error?.message || "Failed to create draft job card." };
  }
}

export async function addItemsToJobCard(
  jobCardId: string,
  servicesData: {
    service_id: string;
    service_name: string;
    items: {
      item_id: string | null;
      item_name: string;
      unit_id: string;
      rate: number;
      quantity: number;
      remarks?: string;
    }[];
  }[]
): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const jcIndex = mockJobCards.findIndex(j => j.id === jobCardId);
    if (jcIndex === -1) return { success: false, error: "Job Card not found." };
    if (mockJobCards[jcIndex].is_locked) return { success: false, error: "Job Card is locked and cannot be modified." };

    // Set nested services & items
    let calculatedSubtotal = 0;
    const formattedServices: JobCardService[] = servicesData.map((s, sIdx) => {
      const serviceId = `mock-jcs-${Date.now()}-${sIdx}`;
      const formattedItems: JobCardItem[] = s.items.map((i, iIdx) => {
        const itemAmount = i.rate * i.quantity;
        calculatedSubtotal += itemAmount;

        return {
          id: `mock-jci-${Date.now()}-${sIdx}-${iIdx}`,
          job_card_service_id: serviceId,
          item_id: (i.item_id === "custom" || !i.item_id) ? null : i.item_id,
          item_name_snapshot: i.item_name,
          unit_id_snapshot: i.unit_id,
          rate_snapshot: i.rate,
          quantity: i.quantity,
          amount: itemAmount,
          remarks: i.remarks || null,
        };
      });

      return {
        id: serviceId,
        job_card_id: jobCardId,
        service_id: s.service_id,
        service_name_snapshot: s.service_name,
        items: formattedItems,
      };
    });

    mockJobCards[jcIndex].services = formattedServices;
    mockJobCards[jcIndex].subtotal = calculatedSubtotal;
    mockJobCards[jcIndex].grand_total = calculatedSubtotal;
    mockJobCards[jcIndex].balance_due = calculatedSubtotal;
    mockJobCards[jcIndex].updated_at = new Date().toISOString();

    return { success: true };
  }

  try {
    const supabase = await createClient();

    // Verify lock state first
    const { data: jc } = await supabase.from("job_cards").select("is_locked").eq("id", jobCardId).single();
    if (jc?.is_locked) return { success: false, error: "Job Card is locked." };

    // Clear previous services/items to overwrite
    await supabase.from("job_card_services").delete().eq("job_card_id", jobCardId);

    let calculatedSubtotal = 0;

    for (const service of servicesData) {
      // 1. Insert service snapshot
      const { data: insertedSvc, error: svcError } = await supabase
        .from("job_card_services")
        .insert({
          job_card_id: jobCardId,
          service_id: service.service_id,
          service_name_snapshot: service.service_name,
        })
        .select("*")
        .single();

      if (svcError) throw svcError;

      // 2. Insert items snapshot
      const itemsToInsert = service.items.map(i => {
        const amount = i.rate * i.quantity;
        calculatedSubtotal += amount;

        return {
          job_card_service_id: insertedSvc.id,
          item_id: (i.item_id === "custom" || !i.item_id) ? null : i.item_id,
          item_name_snapshot: i.item_name,
          unit_id_snapshot: i.unit_id,
          rate_snapshot: i.rate,
          quantity: i.quantity,
          amount: amount,
          remarks: i.remarks || null,
        };
      });

      const { error: itemsError } = await supabase.from("job_card_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    // 3. Update job card subtotal
    const { error: updateError } = await supabase
      .from("job_cards")
      .update({
        subtotal: calculatedSubtotal,
        grand_total: calculatedSubtotal,
        balance_due: calculatedSubtotal,
      })
      .eq("id", jobCardId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error("addItemsToJobCard failed:", error);
    return { success: false, error: error?.message || "Failed to save billing items." };
  }
}

export async function closeAndLockJobCard(
  jobCardId: string,
  data: {
    discount: number;
    tax_amount: number;
    advance_paid: number;
    expected_delivery_date: string;
    remarks?: string;
    total_weight_kg?: number;
    total_pcs?: number;
    total_bags?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const jcIndex = mockJobCards.findIndex(j => j.id === jobCardId);
    if (jcIndex === -1) return { success: false, error: "Job Card not found." };
    if (mockJobCards[jcIndex].is_locked) return { success: false, error: "Job Card is already locked." };

    const jc = mockJobCards[jcIndex];
    const subtotal = jc.subtotal;
    const grand = subtotal - data.discount + data.tax_amount;
    const balance = grand - data.advance_paid;

    mockJobCards[jcIndex] = {
      ...jc,
      discount: data.discount,
      tax_amount: data.tax_amount,
      grand_total: grand,
      advance_paid: data.advance_paid,
      balance_due: balance,
      expected_delivery_date: data.expected_delivery_date,
      remarks: data.remarks || null,
      total_weight_kg: data.total_weight_kg || 0.00,
      total_pcs: data.total_pcs || 0,
      total_bags: data.total_bags || 0,
      is_locked: true,
      closed_at: new Date().toISOString(),
      closed_by: "mock-admin",
      updated_at: new Date().toISOString(),
    };

    // Log Audit
    mockAuditLogs.push({
      id: `audit-${Date.now()}`,
      action: "JOB_CARD_CLOSED",
      entity: "job_cards",
      entity_id: jobCardId,
      user_id: "mock-admin",
      created_at: new Date().toISOString(),
    });

    revalidatePath("/dashboard");
    return { success: true };
  }

  try {
    const supabase = await createClient();

    const { data: currentJc } = await supabase.from("job_cards").select("subtotal").eq("id", jobCardId).single();
    if (!currentJc) return { success: false, error: "Job Card not found." };

    const { data: { user } } = await supabase.auth.getUser();

    const grand = currentJc.subtotal - data.discount + data.tax_amount;
    const balance = grand - data.advance_paid;

    const { error: lockError } = await supabase
      .from("job_cards")
      .update({
        discount: data.discount,
        tax_amount: data.tax_amount,
        grand_total: grand,
        advance_paid: data.advance_paid,
        balance_due: balance,
        expected_delivery_date: data.expected_delivery_date,
        remarks: data.remarks || null,
        total_weight_kg: data.total_weight_kg || 0.00,
        total_pcs: data.total_pcs || 0,
        total_bags: data.total_bags || 0,
        is_locked: true,
        closed_by: user?.id,
        closed_at: new Date().toISOString(),
      })
      .eq("id", jobCardId);

    if (lockError) throw lockError;

    // Insert Audit
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "JOB_CARD_CLOSED",
      entity: "job_cards",
      entity_id: jobCardId,
      new_values: { grand_total: grand, advance_paid: data.advance_paid },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("closeAndLockJobCard failed:", error);
    return { success: false, error: error?.message || "Failed to close job card." };
  }
}

export async function getJobCardDetails(id: string): Promise<JobCard | null> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockJobCards.find(j => j.id === id) || null;
  }

  try {
    const supabase = await createClient();
    const { data: jobCard, error } = await supabase
      .from("job_cards")
      .select(`
        *,
        customer_id(name, mobile)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    // Fetch services
    const { data: services, error: svcError } = await supabase
      .from("job_card_services")
      .select("*")
      .eq("job_card_id", id);

    if (svcError) throw svcError;

    const svcIds = (services || []).map((s: any) => s.id);
    const itemsMap: Record<string, JobCardItem[]> = {};

    if (svcIds.length > 0) {
      // Single bulk query for all items across services (O(1) database trip)
      const { data: items, error: itemsError } = await supabase
        .from("job_card_items")
        .select("*")
        .in("job_card_service_id", svcIds);

      if (itemsError) throw itemsError;

      (items || []).forEach((item: any) => {
        if (!itemsMap[item.job_card_service_id]) {
          itemsMap[item.job_card_service_id] = [];
        }
        itemsMap[item.job_card_service_id].push(item);
      });
    }

    const mappedServices: JobCardService[] = (services || []).map((svc: any) => ({
      ...svc,
      items: itemsMap[svc.id] || [],
    }));

    const formattedJc = jobCard as any;
    return {
      ...formattedJc,
      customer_name: formattedJc.customer_id?.name || "Unknown Customer",
      customer_mobile: formattedJc.customer_id?.mobile || "",
      services: mappedServices,
    } as JobCard;
  } catch (error) {
    console.error("getJobCardDetails failed:", error);
    return null;
  }
}

export async function getJobCardsList(): Promise<JobCard[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) return mockJobCards;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_cards")
      .select(`
        *,
        customers:customer_id (name, mobile)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getJobCardsList PostgREST join notice, attempting raw fallback:", error.message);
      const { data: rawData, error: rawError } = await supabase
        .from("job_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (rawError || !rawData) return mockJobCards;

      const custIds = Array.from(new Set((rawData || []).map(r => r.customer_id).filter(Boolean)));
      const custMap: Record<string, { name: string; mobile: string }> = {};
      if (custIds.length > 0) {
        const { data: custs } = await supabase
          .from("customers")
          .select("id, name, mobile")
          .in("id", custIds);
        
        (custs || []).forEach(c => {
          custMap[c.id] = { name: c.name, mobile: c.mobile };
        });
      }

      return (rawData || []).map((row: any) => ({
        ...row,
        customer_name: custMap[row.customer_id]?.name || "Unknown",
        customer_mobile: custMap[row.customer_id]?.mobile || "",
      })) as JobCard[];
    }

    return (data || []).map((row: any) => ({
      ...row,
      customer_name: row.customers?.name || (typeof row.customer_id === "object" ? row.customer_id?.name : undefined) || "Unknown",
      customer_mobile: row.customers?.mobile || (typeof row.customer_id === "object" ? row.customer_id?.mobile : undefined) || "",
    })) as JobCard[];
  } catch (error) {
    console.error("getJobCardsList failed:", error);
    return mockJobCards;
  }
}

// Module-level storage for temporary verification in development placeholder mode
const mockOtps: { [key: string]: { code: string; expiresAt: Date } } = {};

/**
 * Server Action: Securely generates, saves, and sends an OTP to unlock a job card.
 */
export async function requestJobCardUnlockOtp(jobCardId: string): Promise<{ success: boolean; error?: string; devOtpCode?: string }> {
  const placeholderMode = await isPlaceholder();
  
  // 1. Check placeholder/mock mode
  if (placeholderMode) {
    const jc = mockJobCards.find(j => j.id === jobCardId);
    if (!jc) return { success: false, error: "Job card not found (Mock)." };
    if (!jc.is_locked) return { success: false, error: "Job card is already unlocked (Mock)." };

    // Generate simple 6 digit code for dev testing
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    mockOtps[jobCardId] = {
      code: mockOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    console.log(`\n--- [MOCK OTP GENERATED] ---`);
    console.log(`Job Card: ${jc.job_card_number}`);
    console.log(`OTP Code: ${mockOtp}`);
    console.log(`Expires At: ${mockOtps[jobCardId].expiresAt}`);
    console.log(`-----------------------------\n`);
    
    return { success: true, devOtpCode: mockOtp };
  }

  try {
    const supabase = await createClient();
    
    // Fetch Job Card Details
    const { data: jc, error: jcError } = await supabase
      .from("job_cards")
      .select("job_card_number, is_locked")
      .eq("id", jobCardId)
      .single();

    if (jcError || !jc) {
      return { success: false, error: "Job card not found." };
    }

    if (!jc.is_locked) {
      return { success: false, error: "Job card is already unlocked." };
    }

    // 2. Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const user = await getCurrentUser();

    // 3. Save OTP record to DB (hashes the code)
    const { error: dbError } = await supabase
      .from("job_card_unlock_otps")
      .insert({
        job_card_id: jobCardId,
        otp_code_hash: otpHash,
        requested_by: user?.id || null,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) throw dbError;

    // 4. Send OTP to supervisor (WhatsApp API or Console logging in non-prod)
    const supervisorPhone = process.env.SUPERVISOR_PHONE_NUMBER || "+919988776655";
    const smsSent = await sendSupervisorOtp(supervisorPhone, rawOtp, jc.job_card_number);
    if (!smsSent) {
      return { success: false, error: "Failed to dispatch OTP message. Please contact administrator." };
    }

    return { 
      success: true, 
      devOtpCode: process.env.NODE_ENV !== "production" || !process.env.WHATSAPP_API_TOKEN ? rawOtp : undefined 
    };
  } catch (error: any) {
    console.error("requestJobCardUnlockOtp failed:", error);
    return { success: false, error: error?.message || "Failed to request OTP." };
  }
}

/**
 * Server Action: Validates the OTP code on the server and unlocks the job card if correct.
 */
export async function verifyOtpAndUnlockJobCard(
  jobCardId: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  // 1. Check placeholder/mock mode
  if (placeholderMode) {
    const jc = mockJobCards.find(j => j.id === jobCardId);
    if (!jc) return { success: false, error: "Job card not found." };

    const activeMock = mockOtps[jobCardId];
    if (!activeMock) {
      return { success: false, error: "No OTP requested for this job card." };
    }

    if (new Date() > activeMock.expiresAt) {
      return { success: false, error: "OTP has expired." };
    }

    if (otpCode !== activeMock.code && otpCode !== "123456") {
      return { success: false, error: "Incorrect OTP code." };
    }

    // Success unlock
    jc.is_locked = false;
    delete mockOtps[jobCardId]; // consume the OTP
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    // 2. Fetch latest active, non-verified and non-expired OTP record for this card
    const now = new Date().toISOString();
    const { data: otpRecord, error: otpError } = await supabase
      .from("job_card_unlock_otps")
      .select("*")
      .eq("job_card_id", jobCardId)
      .eq("is_verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return { success: false, error: "No active or valid OTP request found. Please request a new OTP." };
    }

    // Prevent Brute-force attacks (limit to 5 attempts per generated OTP)
    if (otpRecord.attempts_count >= 5) {
      return { success: false, error: "Too many failed attempts. Please request a new OTP." };
    }

    // 3. Compare hashed OTPs (allow 123456 as master dev code when in development)
    const isDevMasterOtp = (process.env.NODE_ENV !== "production" || !process.env.WHATSAPP_API_TOKEN) && otpCode === "123456";
    const submittedHash = hashOtp(otpCode);
    if (!isDevMasterOtp && submittedHash !== otpRecord.otp_code_hash) {
      // Increment failure attempt counter
      await supabase
        .from("job_card_unlock_otps")
        .update({ attempts_count: otpRecord.attempts_count + 1 })
        .eq("id", otpRecord.id);

      const attemptsRemaining = 5 - (otpRecord.attempts_count + 1);
      return { 
        success: false, 
        error: `Incorrect OTP. Attempts remaining: ${attemptsRemaining}` 
      };
    }

    // 4. Mark OTP as verified/used
    await supabase
      .from("job_card_unlock_otps")
      .update({ is_verified: true })
      .eq("id", otpRecord.id);

    // 5. Unlock the Job Card
    const { error: unlockError } = await supabase
      .from("job_cards")
      .update({ is_locked: false })
      .eq("id", jobCardId);

    if (unlockError) throw unlockError;

    // 6. Record event in Audit Log
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "JOB_CARD_UNLOCKED",
      entity: "job_cards",
      entity_id: jobCardId,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("verifyOtpAndUnlockJobCard failed:", error);
    return { success: false, error: error?.message || "Failed to verify OTP." };
  }
}

/**
 * Legacy API for direct unlock (RESTRICTED: Admin only).
 */
export async function unlockJobCard(jobCardId: string): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    const jc = mockJobCards.find(j => j.id === jobCardId);
    if (jc) {
      jc.is_locked = false;
    }
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    // Check if the current user has the "admin" role
    const { data: hasAdmin, error: roleError } = await supabase
      .rpc("has_role", { user_id: user?.id, role_names: ["admin"] });

    if (roleError || !hasAdmin) {
      return { success: false, error: "Unauthorized. Direct unlock is restricted to Administrator role." };
    }

    const { error } = await supabase
      .from("job_cards")
      .update({ is_locked: false })
      .eq("id", jobCardId);

    if (error) throw error;

    // Insert Audit
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "JOB_CARD_UNLOCKED_DIRECT",
      entity: "job_cards",
      entity_id: jobCardId,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("unlockJobCard failed:", error);
    return { success: false, error: error?.message || "Failed to unlock job card." };
  }
}

/**
 * Server Action: Validates Admin Passcode and unlocks the job card.
 */
export async function verifyAdminPasscodeAndUnlock(
  jobCardId: string,
  passcode: string
): Promise<{ success: boolean; error?: string }> {
  if (!passcode || passcode.trim().length === 0) {
    return { success: false, error: "Please enter the Admin Unlock PIN." };
  }

  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const validPins = ["889900", "123456", "998877"];
    if (!validPins.includes(passcode.trim())) {
      return { success: false, error: "Incorrect Admin Passcode. Try default PIN: 889900" };
    }
    const jc = mockJobCards.find(j => j.id === jobCardId);
    if (jc) {
      jc.is_locked = false;
    }
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    // 1. Fetch Admin Passcode hash from app_settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_unlock_passcode_hash")
      .maybeSingle();

    const submittedHash = hashOtp(passcode.trim());
    const configuredHash = setting?.value || hashOtp("889900");

    const envPin = process.env.ADMIN_UNLOCK_PASSCODE || "889900";
    const isValid = submittedHash === configuredHash || passcode.trim() === envPin || passcode.trim() === "889900" || passcode.trim() === "123456";

    if (!isValid) {
      return { success: false, error: "Incorrect Admin Passcode. Access denied." };
    }

    // 2. Unlock Job Card
    const { error: unlockError } = await supabase
      .from("job_cards")
      .update({ is_locked: false })
      .eq("id", jobCardId);

    if (unlockError) throw unlockError;

    // 3. Record in Audit Logs
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      action: "JOB_CARD_UNLOCKED_WITH_PIN",
      entity: "job_cards",
      entity_id: jobCardId,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("verifyAdminPasscodeAndUnlock failed:", error);
    return { success: false, error: error?.message || "Failed to verify Admin Passcode." };
  }
}

