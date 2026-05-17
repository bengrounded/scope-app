import { NextResponse } from "next/server";
import { parseQuery } from "@/lib/build/parser";
import type { BuildRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * POST /api/parse
 *
 * Step 1 of the build wizard: parse the user's free-text query (+ optional
 * structured hints) into engine-shape ParsedReport without computing. The
 * UI then renders a review/confirm screen and POSTs the (possibly edited)
 * ParsedReport to /api/compose.
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

  const body = (await request.json().catch(() => ({}))) as BuildRequest;
  if (!body.query || body.query.trim().length < 5) {
    return NextResponse.json(
      { error: "query is required (min 5 chars)" },
      { status: 400 },
    );
  }

  try {
    const result = await parseQuery({ body, apiKey, computeUrl });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Parser failed", detail: String(err) },
      { status: 502 },
    );
  }
}
