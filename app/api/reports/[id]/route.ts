import { NextResponse } from "next/server";
import { getReport, getMetaOrDefault } from "@/lib/reports";

/**
 * GET /api/reports/[id] — returns the report + narrative metadata.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const report = getReport(params.id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ report, meta: getMetaOrDefault(report) });
}
