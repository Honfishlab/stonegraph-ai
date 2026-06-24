/**
 * Supabase admin client — uses service role key, bypasses RLS.
 * Untyped for now — will be replaced with generated Database types
 * after the schema sync is complete.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type UntypedClient = SupabaseClient<any, any, any>;

export function createAdminClient(): UntypedClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as UntypedClient;
}
