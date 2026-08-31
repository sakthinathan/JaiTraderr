import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lukkynsezbssepqqcxze.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8zrOhEMRI-kfiGFKgtef5A_ocKUxRXl';

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
