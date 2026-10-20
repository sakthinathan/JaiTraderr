import { cookies } from "next/headers";

/**
 * Checks whether the application is running in mock/placeholder mode
 * based on sb-mock-token cookie or placeholder environment config.
 */
export async function isPlaceholderMode(): Promise<boolean> {
  const isPlaceholderEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  if (isPlaceholderEnv) return true;

  // In production, mock tokens are only permitted if explicitly enabled via ALLOW_DEMO_MODE=true
  const isDemoAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "true";
  if (!isDemoAllowed) return false;

  const cookieStore = await cookies();
  const hasMockToken = cookieStore.get("sb-mock-token")?.value;
  return !!hasMockToken;
}
