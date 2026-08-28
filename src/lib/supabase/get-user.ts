/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { createClient } from "./server";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "billing_staff" | "processing_staff" | "delivery_staff";
  roleName: string;
  branchName: string;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const mockToken = cookieStore.get("sb-mock-token")?.value;

  // 1. Check for mock session first
  if (mockToken) {
    const roleMapping: Record<string, { role: UserProfile["role"]; name: string; roleName: string }> = {
      admin: { role: "admin", name: "Alex Admin", roleName: "System Administrator" },
      billing: { role: "billing_staff", name: "Brad Billing", roleName: "Billing Officer" },
      processing: { role: "processing_staff", name: "Pat Processing", roleName: "Operations Staff" },
      delivery: { role: "delivery_staff", name: "David Delivery", roleName: "Delivery Officer" },
    };

    const details = roleMapping[mockToken] || { role: "billing_staff", name: "Demo User", roleName: "Staff User" };
    
    return {
      id: `mock-id-${mockToken}`,
      name: details.name,
      email: `${mockToken}@jaitraderr.com`,
      role: details.role,
      roleName: details.roleName,
      branchName: "Clean City Main Branch",
    };
  }

  // 2. Real Supabase auth fallback
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Fetch profile and role from db
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        default_branch_id(name),
        user_roles(role_id, branch_id)
      `)
      .eq("id", user.id)
      .single();

    if (!profile) {
      return {
        id: user.id,
        name: user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: "billing_staff",
        roleName: "Staff User",
        branchName: "Main Branch",
      };
    }

    const rolesData = (profile as any).user_roles || [];
    const mainRole = rolesData[0]?.role_id || "billing_staff";
    
    const roleNames: Record<string, string> = {
      admin: "System Administrator",
      billing_staff: "Billing Officer",
      processing_staff: "Operations Staff",
      delivery_staff: "Delivery Officer",
    };

    return {
      id: user.id,
      name: profile.name || user.email?.split("@")[0] || "User",
      email: profile.email || user.email || "",
      role: mainRole,
      roleName: roleNames[mainRole] || "Staff User",
      branchName: (profile as any).default_branch_id?.name || "Main Branch",
    };
  } catch (error) {
    console.error("Error fetching current user session:", error);
    return null;
  }
}
