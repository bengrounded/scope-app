import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service_role key.
 *
 * Never import this from a "use client" component — the service_role key
 * bypasses RLS and must stay server-only. Browser-side queries (Day 4) will
 * use a separate factory built on the anon key.
 *
 * Returns null when env vars are missing so /api/build can fall back to
 * ephemeral-only mode rather than hard-crash during early local dev.
 */
let cached: SupabaseClient | null | undefined;

export function getServerSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return cached;
}

/** Resolve the tenant uuid from its slug (cached per server instance). */
const tenantCache = new Map<string, string>();

export async function getTenantId(slug: string): Promise<string | null> {
  const cached = tenantCache.get(slug);
  if (cached) return cached;
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  tenantCache.set(slug, data.id);
  return data.id;
}
