import { NextResponse } from "next/server";
import { getCookieSupabase } from "@/lib/supabase/server-cookies";
import { getServerSupabase, getTenantId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAIL_DOMAIN = "groundedpackaging.co";
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_ID || "grounded";

/**
 * OAuth callback. Supabase's auth-helper exchange-flow:
 *   ?code=...  -> exchangeCodeForSession sets cookies
 *   then we enforce the @groundedpackaging.co domain and ensure a
 *   public.users row exists (mirrors auth.users with tenant linkage).
 *
 *   ?next=/path lets the original page resume after auth.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Missing OAuth code")}`, url),
    );
  }

  const sb = getCookieSupabase();
  const { error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(exchangeErr.message)}`,
        url,
      ),
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("No user returned from provider")}`,
        url,
      ),
    );
  }

  // Domain restriction. Sign out the user so the cookie doesn't grant access.
  if (!user.email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    await sb.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          `Sign-in restricted to @${ALLOWED_EMAIL_DOMAIN} accounts`,
        )}`,
        url,
      ),
    );
  }

  // Ensure a public.users row exists with the grounded tenant linkage.
  // Uses service_role to bypass RLS (RLS is off in Phase 1 anyway).
  const admin = getServerSupabase();
  if (admin) {
    const tenantId = await getTenantId(DEFAULT_TENANT_SLUG);
    if (tenantId) {
      await admin
        .from("users")
        .upsert(
          {
            id: user.id,
            tenant_id: tenantId,
            email: user.email,
            full_name:
              (user.user_metadata?.full_name as string | undefined) ?? null,
          },
          { onConflict: "id" },
        );
    }
  }

  return NextResponse.redirect(new URL(next, url));
}
