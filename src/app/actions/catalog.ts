/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface Item {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Unit {
  id: string;
  name: string;
}

export interface ServiceItemRate {
  id: string;
  service_id: string;
  service_name: string;
  item_id: string;
  item_name: string;
  unit_id: string;
  rate: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

// In-memory mock master database for local demo
const mockServices: Service[] = [
  { id: "a1111111-1111-1111-1111-111111111111", name: "Wash & Fold", description: "Standard wash and fold, by weight", is_active: true },
  { id: "a2222222-2222-2222-2222-222222222222", name: "Wash & Iron", description: "Wash and premium steam press", is_active: true },
  { id: "a3333333-3333-3333-3333-333333333333", name: "Steam Iron", description: "Crease-less steam press only", is_active: true },
  { id: "a4444444-4444-4444-4444-444444444444", name: "Dry Cleaning", description: "Chemical cleaning for delicate fabrics", is_active: true },
  { id: "a5555555-5555-5555-5555-555555555555", name: "Shoe Cleaning", description: "Restore sneaker & shoes detailing", is_active: true },
];

const mockItems: Item[] = [
  { id: "f1111111-1111-1111-1111-111111111111", name: "Shirt", is_active: true },
  { id: "f2222222-2222-2222-2222-222222222222", name: "Pant", is_active: true },
  { id: "f3333333-3333-3333-3333-333333333333", name: "Saree", is_active: true },
  { id: "f4444444-4444-4444-4444-444444444444", name: "Blazer", is_active: true },
  { id: "f5555555-5555-5555-5555-555555555555", name: "Shoes", is_active: true },
  { id: "f6666666-6666-6666-6666-666666666666", name: "Mixed Clothes", is_active: true },
];

const mockUnits: Unit[] = [
  { id: "kg", name: "Kilograms" },
  { id: "pcs", name: "Pieces" },
  { id: "pair", name: "Pairs" },
  { id: "set", name: "Sets" },
];

const mockRates: ServiceItemRate[] = [
  { id: "r1", service_id: "a1111111-1111-1111-1111-111111111111", service_name: "Wash & Fold", item_id: "f6666666-6666-6666-6666-666666666666", item_name: "Mixed Clothes", unit_id: "kg", rate: 80.00, effective_from: "2026-08-01T00:00:00Z", effective_to: null, is_active: true },
  { id: "r2", service_id: "a2222222-2222-2222-2222-222222222222", service_name: "Wash & Iron", item_id: "f1111111-1111-1111-1111-111111111111", item_name: "Shirt", unit_id: "pcs", rate: 20.00, effective_from: "2026-08-01T00:00:00Z", effective_to: null, is_active: true },
  { id: "r3", service_id: "a2222222-2222-2222-2222-222222222222", service_name: "Wash & Iron", item_id: "f2222222-2222-2222-2222-222222222222", item_name: "Pant", unit_id: "pcs", rate: 25.00, effective_from: "2026-08-01T00:00:00Z", effective_to: null, is_active: true },
  { id: "r4", service_id: "a3333333-3333-3333-3333-333333333333", service_name: "Steam Iron", item_id: "f1111111-1111-1111-1111-111111111111", item_name: "Shirt", unit_id: "pcs", rate: 12.00, effective_from: "2026-08-01T00:00:00Z", effective_to: null, is_active: true },
  { id: "r5", service_id: "a4444444-4444-4444-4444-444444444444", service_name: "Dry Cleaning", item_id: "f4444444-4444-4444-4444-444444444444", item_name: "Blazer", unit_id: "pcs", rate: 180.00, effective_from: "2026-08-01T00:00:00Z", effective_to: null, is_active: true },
];

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

export async function getServices(): Promise<Service[]> {
  if (await isPlaceholder()) return mockServices;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getServices failed:", e);
    return [];
  }
}

export async function getItems(): Promise<Item[]> {
  if (await isPlaceholder()) return mockItems;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getItems failed:", e);
    return [];
  }
}

export async function getUnits(): Promise<Unit[]> {
  if (await isPlaceholder()) return mockUnits;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("id");

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getUnits failed:", e);
    return [];
  }
}

export async function getCatalogRates(): Promise<ServiceItemRate[]> {
  if (await isPlaceholder()) return mockRates;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("service_item_rates")
      .select(`
        id,
        service_id,
        service_id(name),
        item_id,
        item_id(name),
        unit_id,
        rate,
        effective_from,
        effective_to,
        is_active
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      service_id: row.service_id,
      service_name: row.service_id?.name || "Unknown Service",
      item_id: row.item_id,
      item_name: row.item_id?.name || "Unknown Item",
      unit_id: row.unit_id,
      rate: Number(row.rate),
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      is_active: row.is_active
    }));
  } catch (e) {
    console.error("getCatalogRates failed:", e);
    return [];
  }
}

export async function addCatalogRate(data: {
  service_id: string;
  item_id: string;
  unit_id: string;
  rate: number;
}): Promise<{ success: boolean; rate?: ServiceItemRate; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const service = mockServices.find(s => s.id === data.service_id);
    const item = mockItems.find(i => i.id === data.item_id);

    if (!service || !item) {
      return { success: false, error: "Invalid Service or Item identifier." };
    }

    // Check duplicate
    const exists = mockRates.some(r => 
      r.service_id === data.service_id && 
      r.item_id === data.item_id && 
      r.unit_id === data.unit_id &&
      r.is_active
    );

    if (exists) {
      // Inactivate existing rate
      const idx = mockRates.findIndex(r => r.service_id === data.service_id && r.item_id === data.item_id && r.unit_id === data.unit_id && r.is_active);
      if (idx !== -1) {
        mockRates[idx].is_active = false;
        mockRates[idx].effective_to = new Date().toISOString();
      }
    }

    const newRate: ServiceItemRate = {
      id: `mock-rate-${Date.now()}`,
      service_id: data.service_id,
      service_name: service.name,
      item_id: data.item_id,
      item_name: item.name,
      unit_id: data.unit_id,
      rate: data.rate,
      effective_from: new Date().toISOString(),
      effective_to: null,
      is_active: true,
    };

    mockRates.unshift(newRate);
    revalidatePath("/dashboard/rates");
    return { success: true, rate: newRate };
  }

  try {
    const supabase = await createClient();

    // Deactivate previous active rates for same combination to preserve historical tracking
    await supabase
      .from("service_item_rates")
      .update({ is_active: false, effective_to: new Date().toISOString() })
      .match({ service_id: data.service_id, item_id: data.item_id, unit_id: data.unit_id, is_active: true });

    // Insert new rate
    const { data: newRate, error } = await supabase
      .from("service_item_rates")
      .insert({
        service_id: data.service_id,
        item_id: data.item_id,
        unit_id: data.unit_id,
        rate: data.rate,
      })
      .select(`
        id,
        service_id,
        service_id(name),
        item_id,
        item_id(name),
        unit_id,
        rate,
        effective_from,
        effective_to,
        is_active
      `)
      .single();

    if (error) throw error;

    const formattedRate: ServiceItemRate = {
      id: newRate.id,
      service_id: newRate.service_id,
      service_name: (newRate.service_id as any)?.name || "Unknown Service",
      item_id: newRate.item_id,
      item_name: (newRate.item_id as any)?.name || "Unknown Item",
      unit_id: newRate.unit_id,
      rate: Number(newRate.rate),
      effective_from: newRate.effective_from,
      effective_to: newRate.effective_to,
      is_active: newRate.is_active
    };

    revalidatePath("/dashboard/rates");
    return { success: true, rate: formattedRate };
  } catch (error: any) {
    console.error("addCatalogRate failed:", error);
    return { success: false, error: error?.message || "Failed to add new rate card." };
  }
}

export async function addService(name: string, description?: string): Promise<{ success: boolean; service?: Service; error?: string }> {
  const placeholderMode = await isPlaceholder();
  
  if (placeholderMode) {
    const exists = mockServices.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return { success: false, error: "A service with this name already exists." };

    const newSvc = {
      id: `mock-svc-${Date.now()}`,
      name,
      description: description || null,
      is_active: true,
    };
    mockServices.push(newSvc);
    revalidatePath("/dashboard/rates");
    return { success: true, service: newSvc };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .insert({ name, description })
      .select("*")
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/rates");
    return { success: true, service: data as Service };
  } catch (error: any) {
    console.error("addService failed:", error);
    return { success: false, error: error?.message || "Failed to create service master." };
  }
}

export async function addItem(name: string): Promise<{ success: boolean; item?: Item; error?: string }> {
  const placeholderMode = await isPlaceholder();
  
  if (placeholderMode) {
    const exists = mockItems.some(i => i.name.toLowerCase() === name.toLowerCase());
    if (exists) return { success: false, error: "An item with this name already exists." };

    const newItm = {
      id: `mock-itm-${Date.now()}`,
      name,
      is_active: true,
    };
    mockItems.push(newItm);
    revalidatePath("/dashboard/rates");
    return { success: true, item: newItm };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("items")
      .insert({ name })
      .select("*")
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/rates");
    return { success: true, item: data as Item };
  } catch (error: any) {
    console.error("addItem failed:", error);
    return { success: false, error: error?.message || "Failed to create item master." };
  }
}

export interface ShelfLocation {
  id: string;
  code: string;
  branch_id: string;
  is_active: boolean;
}

const mockShelfLocations: ShelfLocation[] = [
  { id: "e0111111-1111-1111-1111-111111111111", code: "A-01", branch_id: "b1111111-1111-1111-1111-111111111111", is_active: true },
  { id: "e0222222-2222-2222-2222-222222222222", code: "A-02", branch_id: "b1111111-1111-1111-1111-111111111111", is_active: true },
  { id: "e0333333-3333-3333-3333-333333333333", code: "B-01", branch_id: "b1111111-1111-1111-1111-111111111111", is_active: true },
  { id: "e0444444-4444-4444-4444-444444444444", code: "B-02", branch_id: "b1111111-1111-1111-1111-111111111111", is_active: true }
];

export async function getShelfLocations(): Promise<ShelfLocation[]> {
  if (await isPlaceholder()) return mockShelfLocations;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shelf_locations")
      .select("*")
      .eq("is_active", true)
      .order("code");

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getShelfLocations failed:", e);
    return [];
  }
}

