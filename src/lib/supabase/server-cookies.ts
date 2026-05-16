import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cookie-bound Supabase server client for use in server components and
 * route handlers. Reads the user's session from cookies so RLS-aware queries
 * run as the signed-in user (once policies are enabled Day 7).
 *
 * Separate from src/lib/supabase/server.ts — that one uses service_role and
 * bypasses RLS, and is the right tool for /api/build writing reports on
 * behalf of the user. This one is for "who is the current user?" reads.
 */
export function getCookieSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a server component — Next.js doesn't allow
            // mutating cookies here, which is fine; middleware does the
            // refresh-and-set.
          }
        },
      },
    },
  );
}

/** Returns the current authenticated user, or null. */
export async function getCurrentUser() {
  const sb = getCookieSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
