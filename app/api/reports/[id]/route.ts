import { NextResponse } from "next/server";
import { getReport, getMetaOrDefault } from "@/lib/reports";
import { loadPersistedReport } from "@/lib/reports/persist";

export const runtime = "nodejs";

/**
 * GET /api/reports/[id] — returns the report + narrative metadata.
 *
 * Lookup order:
 *   1. Static library bundle (the 376 hand-curated reports).
 *   2. Supabase `reports` table (build-flow-generated reports).
 *
 * 404 only when neither resolves.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const lib = getReport(params.id);
  if (lib) {
    return NextResponse.json({ report: lib, meta: getMetaOrDefault(lib) });
  }
  const persisted = await loadPersistedReport(params.id);
  if (persisted) {
    return NextResponse.json(persisted);
  }
  return NextResponse.json({ error: "Report not found" }, { status: 404 });
}
