import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Shares the same cookie-based session
 * as the server client, so auth state stays in sync across the boundary.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
