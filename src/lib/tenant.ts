/**
 * Tenant lookup helpers. Phase 1 has only the `grounded` tenant; Phase 2 adds
 * Tack customers. The slug is the primary identifier in URLs (`/t/[tenant]/...`)
 * and joins to public.tenants in Postgres.
 */
import { getServerSupabase } from "@/lib/supabase/server";

export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_ID || "grounded";

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
}

// Cached per server instance — tenants change infrequently.
const cache = new Map<string, TenantConfig | null>();

export async function getTenantBySlug(
  slug: string,
): Promise<TenantConfig | null> {
  if (cache.has(slug)) return cache.get(slug) ?? null;
  const sb = getServerSupabase();
  if (!sb) {
    // No Supabase → fabricate the default tenant so Phase 1 dev/preview
    // environments still render.
    if (slug === DEFAULT_TENANT_SLUG) {
      const stub: TenantConfig = {
        id: "00000000-0000-0000-0000-000000000000",
        slug,
        name: "Grounded Packaging",
        primaryColor: "#5B5BD6",
        tagline: null,
      };
      cache.set(slug, stub);
      return stub;
    }
    cache.set(slug, null);
    return null;
  }
  const { data } = await sb
    .from("tenants")
    .select("id, slug, name, primary_color, secondary_color, logo_url, tagline")
    .eq("slug", slug)
    .maybeSingle();
  const value: TenantConfig | null = data
    ? {
        id: data.id,
        slug: data.slug,
        name: data.name,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color,
        logoUrl: data.logo_url,
        tagline: data.tagline,
      }
    : null;
  cache.set(slug, value);
  return value;
}

/** Extract the tenant slug from a Next.js pathname like /t/grounded/library. */
export function tenantSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/t\/([^/]+)/);
  return m ? m[1] : null;
}

/** Build a tenant-scoped URL: tenantPath('grounded', '/library') → '/t/grounded/library' */
export function tenantPath(slug: string, subpath: string): string {
  const clean = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `/t/${slug}${clean}`;
}
