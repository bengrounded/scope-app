import { NextResponse } from "next/server";
import { composeReport } from "@/lib/build/composer";
import { getCurrentUser } from "@/lib/supabase/server-cookies";
import type { ComposeRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/compose
 *
 * Step 2 of the build wizard: take the user-confirmed ParsedReport, run the
 * compute call against Fly, generate the narrative via Claude, adapt to the
 * renderer's Report shape, and persist to Postgres. Returns BuildResponse.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }
  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;
  if (!computeUrl) {
    return NextResponse.json(
      { error: "COMPUTE_API_URL not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as ComposeRequest;
  if (!body.parsed || !Array.isArray(body.parsed.options) || body.parsed.options.length < 2) {
    return NextResponse.json(
      { error: "parsed.options must have at least 2 entries" },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    const result = await composeReport({
      parsed: body.parsed,
      queryText: body.queryText,
      customer: body.customer ?? null,
      authorId: user?.id ?? null,
      apiKey,
      computeUrl,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Compose failed", detail: String(err) },
      { status: 502 },
    );
  }
}
