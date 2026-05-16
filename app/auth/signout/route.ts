import { NextResponse } from "next/server";
import { getCookieSupabase } from "@/lib/supabase/server-cookies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sb = getCookieSupabase();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}

// Allow GET so a plain anchor tag works too.
export const GET = POST;
