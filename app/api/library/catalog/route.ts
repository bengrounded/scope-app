import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/library/catalog
 *
 * Thin proxy to the Fly compute service's /api/library. Used by the
 * BuilderForm clone flow so the review step's EOL / process / grid
 * dropdowns have a vocabulary to populate from when the parser wasn't
 * involved (i.e. the user reached review via clone, not parse).
 */
export async function GET() {
  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;
  if (!computeUrl) {
    return NextResponse.json(
      { error: "COMPUTE_API_URL not configured" },
      { status: 503 },
    );
  }
  try {
    const res = await fetch(`${computeUrl.replace(/\/$/, "")}/api/library`, {
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Library fetch failed", detail: String(err) },
      { status: 502 },
    );
  }
}
