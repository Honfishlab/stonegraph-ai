/**
 * Supabase browser client — for React Client Components.
 * Note: Use `supabase gen types` after deployment to add typed Database generic.
 */

import { createBrowserClient as createBrowserSupabaseClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export function createClient() {
  if (_client) return _client;
  _client = createBrowserSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
}
