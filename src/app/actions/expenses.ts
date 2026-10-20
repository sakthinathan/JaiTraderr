/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { isPlaceholderMode as isPlaceholder } from "@/lib/supabase/env-helper";

const revalidatePath = (_path: string) => {};

export interface Expense {
  id: string;
  category_id: string;
  category_name?: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER";
  branch_id: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
}

// In-memory mock database state for demo testing
const mockExpenses: Expense[] = [
  {
    id: "mock-exp-1",
    category_id: "ec555555-5555-5555-5555-555555555555",
    category_name: "Detergent & Chemicals",
    description: "Purchase of bulk liquid detergent",
    amount: 1200,
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "UPI",
    branch_id: "b1111111-1111-1111-1111-111111111111",
    created_at: new Date().toISOString(),
  }
];

const mockCategories: ExpenseCategory[] = [
  { id: "ec111111-1111-1111-1111-111111111111", name: "Rent", is_active: true },
  { id: "ec222222-2222-2222-2222-222222222222", name: "Salary", is_active: true },
  { id: "ec333333-3333-3333-3333-333333333333", name: "Electricity", is_active: true },
  { id: "ec444444-4444-4444-4444-444444444444", name: "Water Supply", is_active: true },
  { id: "ec555555-5555-5555-5555-555555555555", name: "Detergent & Chemicals", is_active: true },
  { id: "ec666666-6666-6666-6666-666666666666", name: "Packaging Material", is_active: true },
  { id: "ec777777-7777-7777-7777-777777777777", name: "Transport & Fuel", is_active: true }
];


export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  if (await isPlaceholder()) return mockCategories;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getExpenseCategories failed:", e);
    return [];
  }
}

export async function getExpensesList(): Promise<Expense[]> {
  if (await isPlaceholder()) return mockExpenses;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        category_id(name)
      `)
      .order("expense_date", { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      category_name: row.category_id?.name || "Unknown Category",
      amount: Number(row.amount),
    })) as Expense[];
  } catch (e) {
    console.error("getExpensesList failed:", e);
    return [];
  }
}

export async function recordExpense(data: {
  category_id: string;
  description?: string;
  amount: number;
  expense_date: string;
  payment_method: Expense["payment_method"];
}): Promise<{ success: boolean; error?: string }> {
  const placeholderMode = await isPlaceholder();

  if (placeholderMode) {
    const category = mockCategories.find(c => c.id === data.category_id);
    if (!category) return { success: false, error: "Invalid expense category selected." };

    mockExpenses.unshift({
      id: `mock-exp-${Date.now()}`,
      category_id: data.category_id,
      category_name: category.name,
      description: data.description || null,
      amount: data.amount,
      expense_date: data.expense_date,
      payment_method: data.payment_method,
      branch_id: "b1111111-1111-1111-1111-111111111111",
      created_at: new Date().toISOString(),
    });

    revalidatePath("/dashboard/expenses");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get default branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) return { success: false, error: "No operational branches configured in system." };

    const { error } = await supabase
      .from("expenses")
      .insert({
        branch_id: branch.id,
        category_id: data.category_id,
        description: data.description || null,
        amount: data.amount,
        expense_date: data.expense_date,
        payment_method: data.payment_method,
        created_by: user?.id,
      });

    if (error) throw error;

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("recordExpense failed:", error);
    return { success: false, error: error?.message || "Failed to record expense entry." };
  }
}

export interface DailyClosingRecord {
  id: string;
  closing_date: string;
  opening_cash: number;
  cash_collections: number;
  upi_collections: number;
  card_collections: number;
  other_collections: number;
  total_revenue: number;
  cash_expenses: number;
  other_expenses: number;
  total_expenses: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  notes: string | null;
  closed_by: string;
  closed_at: string;
  status: "BALANCED" | "SURPLUS" | "DEFICIT";
}

const mockDailyClosings: DailyClosingRecord[] = [];

export async function getDailyClosings(): Promise<DailyClosingRecord[]> {
  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("jaitraderr_daily_closings");
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback to in-memory
      }
    }
    return mockDailyClosings;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("daily_cash_closings")
      .select("*")
      .order("closing_date", { ascending: false });

    if (error) {
      // Table may not exist yet in Supabase, fallback gracefully to localStorage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("jaitraderr_daily_closings");
        if (stored) return JSON.parse(stored);
      }
      return mockDailyClosings;
    }

    return (data || []) as DailyClosingRecord[];
  } catch (e) {
    console.warn("getDailyClosings fallback to local storage:", e);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("jaitraderr_daily_closings");
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return mockDailyClosings;
  }
}

export async function saveDailyClosing(
  closing: Omit<DailyClosingRecord, "id" | "closed_at">
): Promise<{ success: boolean; data?: DailyClosingRecord; error?: string }> {
  const closedRecord: DailyClosingRecord = {
    ...closing,
    id: `closing-${Date.now()}`,
    closed_at: new Date().toISOString()
  };

  // Always sync to client-side localStorage so it is 100% available offline and across static exports
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("jaitraderr_daily_closings");
      const current: DailyClosingRecord[] = stored ? JSON.parse(stored) : [];
      // Replace existing closing for same date or prepend
      const filtered = current.filter(c => c.closing_date !== closing.closing_date);
      const updated = [closedRecord, ...filtered];
      localStorage.setItem("jaitraderr_daily_closings", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save closing to localStorage", e);
    }
  }

  mockDailyClosings.unshift(closedRecord);

  const placeholderMode = await isPlaceholder();
  if (placeholderMode) {
    return { success: true, data: closedRecord };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("daily_cash_closings")
      .upsert({
        closing_date: closing.closing_date,
        opening_cash: closing.opening_cash,
        cash_collections: closing.cash_collections,
        upi_collections: closing.upi_collections,
        card_collections: closing.card_collections,
        other_collections: closing.other_collections,
        total_revenue: closing.total_revenue,
        cash_expenses: closing.cash_expenses,
        other_expenses: closing.other_expenses,
        total_expenses: closing.total_expenses,
        expected_cash: closing.expected_cash,
        actual_cash: closing.actual_cash,
        variance: closing.variance,
        notes: closing.notes,
        closed_by: user?.id || closing.closed_by,
        closed_at: closedRecord.closed_at,
        status: closing.status
      }, { onConflict: "closing_date" })
      .select()
      .single();

    if (error) {
      console.warn("Supabase daily_cash_closings upsert skipped (stored locally):", error.message);
      return { success: true, data: closedRecord };
    }

    return { success: true, data: data as DailyClosingRecord };
  } catch (error: any) {
    console.warn("daily_cash_closings Supabase error, retained in localStorage:", error);
    return { success: true, data: closedRecord };
  }
}

