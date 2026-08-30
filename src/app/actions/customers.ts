/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  mobile: string;
  whatsapp_number: string | null;
  same_as_mobile: boolean;
  place_address: string | null;
  email: string | null;
  is_active: boolean;
  branch_id: string;
  created_at: string;
  stats?: {
    totalJobCards: number;
    activeOrders: number;
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    averageBillValue: number;
  };
}

// In-memory mock database state for placeholder evaluation mode
const mockCustomers: Customer[] = [
  {
    id: "mock-cust-1",
    customer_code: "CUST-00001",
    name: "John Doe",
    mobile: "9876543210",
    whatsapp_number: "9876543210",
    same_as_mobile: true,
    place_address: "Flat 4B, Blue Horizon, Clean City",
    email: "john.doe@gmail.com",
    is_active: true,
    branch_id: "b1111111-1111-1111-1111-111111111111",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    stats: { totalJobCards: 5, activeOrders: 1, totalBilled: 2450, totalPaid: 2450, outstandingBalance: 0, averageBillValue: 490 },
  },
  {
    id: "mock-cust-2",
    customer_code: "CUST-00002",
    name: "Sarah Smith",
    mobile: "9123456789",
    whatsapp_number: "9123456789",
    same_as_mobile: true,
    place_address: "House 12, Green Meadow, Clean City",
    email: "sarah.smith@yahoo.com",
    is_active: true,
    branch_id: "b1111111-1111-1111-1111-111111111111",
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    stats: { totalJobCards: 8, activeOrders: 1, totalBilled: 5400, totalPaid: 5080, outstandingBalance: 320, averageBillValue: 675 },
  },
  {
    id: "mock-cust-3",
    customer_code: "CUST-00003",
    name: "Ravi Kumar",
    mobile: "9988776655",
    whatsapp_number: "9988776655",
    same_as_mobile: true,
    place_address: "Plot 88, Sector 15, Clean City",
    email: "ravi.kumar@gmail.com",
    is_active: true,
    branch_id: "b1111111-1111-1111-1111-111111111111",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    stats: { totalJobCards: 3, activeOrders: 1, totalBilled: 1200, totalPaid: 920, outstandingBalance: 280, averageBillValue: 400 },
  },
];

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

export async function searchCustomerByMobile(mobile: string): Promise<Customer[]> {
  const cleanMobile = mobile.replace(/\D/g, "");
  
  if (!cleanMobile) return [];

  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockCustomers.filter(c => 
      c.mobile.replace(/\D/g, "").includes(cleanMobile) || 
      c.name.toLowerCase().includes(mobile.toLowerCase())
    );
  }

  try {
    const supabase = await createClient();
    // Fetch customers using standard matching
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .or(`mobile.ilike.%${cleanMobile}%,whatsapp_number.ilike.%${cleanMobile}%,name.ilike.%${mobile}%`)
      .eq("is_active", true);

    if (error) throw error;
    return (data || []) as Customer[];
  } catch (error) {
    console.error("searchCustomerByMobile failed:", error);
    return [];
  }
}

export async function getCustomerProfile(id: string): Promise<Customer | null> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockCustomers.find(c => c.id === id) || null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const customer = data as Customer;

    // Fetch dynamic operational metrics from job cards
    const { data: jcs, error: jcsError } = await supabase
      .from("job_cards")
      .select("grand_total, balance_due, status")
      .eq("customer_id", id);

    if (jcsError) throw jcsError;

    const totalJobCards = jcs?.length || 0;
    const activeOrders = jcs?.filter((j: any) => j.status !== "DELIVERED").length || 0;
    const totalBilled = jcs?.reduce((acc: number, j: any) => acc + (j.grand_total || 0), 0) || 0;
    const outstandingBalance = jcs?.reduce((acc: number, j: any) => acc + (j.balance_due || 0), 0) || 0;
    const totalPaid = Math.max(0, totalBilled - outstandingBalance);
    const averageBillValue = totalJobCards > 0 ? totalBilled / totalJobCards : 0;

    customer.stats = {
      totalJobCards,
      activeOrders,
      totalBilled,
      totalPaid,
      outstandingBalance,
      averageBillValue,
    };

    return customer;
  } catch (error) {
    console.error("getCustomerProfile failed:", error);
    return null;
  }
}

export async function registerCustomer(data: {
  name: string;
  mobile: string;
  whatsapp_number?: string;
  same_as_mobile: boolean;
  place_address?: string;
  email?: string;
}): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    // Check if mobile already exists
    const cleanMobile = data.mobile.replace(/\D/g, "");
    const exists = mockCustomers.some(c => c.mobile.replace(/\D/g, "") === cleanMobile);
    
    if (exists) {
      return { success: false, error: "A customer with this mobile number is already registered." };
    }

    const codeNum = mockCustomers.length + 1;
    const newCust: Customer = {
      id: `mock-cust-${Date.now()}`,
      customer_code: `CUST-${String(codeNum).padStart(5, "0")}`,
      name: data.name,
      mobile: data.mobile,
      whatsapp_number: data.same_as_mobile ? data.mobile : (data.whatsapp_number || null),
      same_as_mobile: data.same_as_mobile,
      place_address: data.place_address || null,
      email: data.email || null,
      is_active: true,
      branch_id: "b1111111-1111-1111-1111-111111111111",
      created_at: new Date().toISOString(),
      stats: { totalJobCards: 0, activeOrders: 0, totalBilled: 0, totalPaid: 0, outstandingBalance: 0, averageBillValue: 0 }
    };

    mockCustomers.push(newCust);
    revalidatePath("/dashboard/customers");
    return { success: true, customer: newCust };
  }

  try {
    const supabase = await createClient();

    // Check duplicate
    const cleanMobile = data.mobile.replace(/\D/g, "");
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .ilike("mobile", `%${cleanMobile}%`)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "A customer with this mobile number is already registered." };
    }

    // Get default branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) return { success: false, error: "No operational branches configured in system." };

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        name: data.name,
        mobile: data.mobile,
        whatsapp_number: data.same_as_mobile ? data.mobile : (data.whatsapp_number || null),
        same_as_mobile: data.same_as_mobile,
        place_address: data.place_address || null,
        email: data.email || null,
        branch_id: branch.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/customers");
    return { success: true, customer: customer as Customer };
  } catch (error: any) {
    console.error("registerCustomer failed:", error);
    return { success: false, error: error?.message || "Failed to register customer." };
  }
}

export async function getCustomersList(): Promise<Customer[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return mockCustomers;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Customer[];
  } catch (error) {
    console.error("getCustomersList failed:", error);
    return [];
  }
}
