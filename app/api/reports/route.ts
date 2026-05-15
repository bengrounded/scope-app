import { NextResponse } from "next/server";
import { getAllReports } from "@/lib/reports";

/**
 * GET /api/reports
 * Optional query params:
 *   focus=Coffee,Beverages   (comma-separated focus areas)
 *   type=Material,Format     (comma-separated comparison types)
 *   q=glass                  (free-text match against title/summary/industry/id)
 *   limit=50                 (default 100)
 *   offset=0
 *
 * Phase 1: reads from the bundled JSON. Phase 2: swaps to Supabase with a
 * tenant_id filter applied here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const focus = (url.searchParams.get("focus") || "").split(",").filter(Boolean);
  const type = (url.searchParams.get("type") || "").split(",").filter(Boolean);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  let results = getAllReports();
  if (focus.length) results = results.filter((r) => focus.includes(r.focusArea));
  if (type.length) results = results.filter((r) => type.includes(r.comparisonType));
  if (q) {
    results = results.filter((r) =>
      [r.title, r.summary, r.industry, r.id].join(" ").toLowerCase().includes(q),
    );
  }
  const page = results.slice(offset, offset + limit);
  return NextResponse.json({
    total: results.length,
    offset,
    limit,
    results: page,
  });
}
