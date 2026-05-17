import { NextResponse } from "next/server";
import { searchReports } from "@/lib/build/searcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/library/search?q=...&tenant=grounded&limit=5
 *
 * Used by the build form's "have we already done this?" inline suggestion
 * row. Searches the 376-report static library + the tenant's persisted
 * reports, scores by keyword overlap, returns top N.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const tenant = (url.searchParams.get("tenant") ?? "grounded").trim();
  const limit = Math.min(
    20,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10) || 5),
  );
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchReports(q, tenant, limit);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: "Search failed", detail: String(err) },
      { status: 502 },
    );
  }
}
