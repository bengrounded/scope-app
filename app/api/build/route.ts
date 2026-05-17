import { NextResponse } from "next/server";
import { parseQuery } from "@/lib/build/parser";
import { composeReport } from "@/lib/build/composer";
import { getCurrentUser } from "@/lib/supabase/server-cookies";
import type { BuildRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/build
 *
 * One-shot orchestrator — parse + compose in a single round-trip. Kept for
 * backward-compatible callers (e.g. the auto-submit URL `?auto=1` from
 * packGPT deeplinks). The interactive wizard now uses /api/parse and
 * /api/compose separately so the user can confirm + edit the parsed
 * structures before the compute step.
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
    const { parsed, warnings, trace: parseTrace } = await parseQuery({ body, apiKey, computeUrl });
    const user = await getCurrentUser();
    const composed = await composeReport({
      parsed,
      queryText: body.query,
      authorId: user?.id ?? null,
      apiKey,
      computeUrl,
    });
    composed.trace = {
      ...(composed.trace ?? {
        parserModel: parseTrace.parserModel,
        narrativeModel: "—",
        parsedOptionsCount: parsed.options.length,
        warnings: [],
      }),
      parserModel: parseTrace.parserModel,
      warnings: [...warnings, ...(composed.trace?.warnings ?? [])],
    };
    return NextResponse.json(composed);
  } catch (err) {
    return NextResponse.json(
      { error: "Build failed", detail: String(err) },
      { status: 502 },
    );
  }
}
