/**
 * Checks whether the application is running in mock/placeholder mode
 * based on sb-mock-token in localStorage/cookie or placeholder environment config.
 * 100% Client-side and Static Export safe (no next/headers).
 */
export async function isPlaceholderMode(): Promise<boolean> {
  const isPlaceholderEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project");

  if (isPlaceholderEnv) return true;

  if (typeof window === "undefined") return false;

  // In production, mock tokens are only permitted if explicitly enabled via ALLOW_DEMO_MODE=true
  const isDemoAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_MODE === "true";
  if (!isDemoAllowed) return false;

  const localToken = localStorage.getItem("sb-mock-token");
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sb-mock-token="))
    ?.split("=")[1];

  return !!(localToken || cookieToken);
}
