import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS. ONLY use in API routes after verifying
// the caller is an admin (check profiles.role === 'admin') or for system
// operations like webhook ingestion that need to write across tables.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
