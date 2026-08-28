/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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

async function isPlaceholder() {
  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  const isPlaceholderEnv = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  return isPlaceholderEnv || !!hasMockToken;
}

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
