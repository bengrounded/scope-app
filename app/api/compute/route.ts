import { NextResponse } from "next/server";
import type { EngineComputeRequest, EngineComputeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/compute
 *
 * Thin proxy to the Python compute service on Fly. Body and response are the
 * engine's contract (see scope_compute.compute_report). The on-the-fly build
 * flow (parser → narrative → compute → render) is orchestrated in /api/build;
 * this route is the low-level escape hatch.
 */
export async function POST(request: Request) {
  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;
  if (!computeUrl) {
    return NextResponse.json(
      { error: "COMPUTE_API_URL not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as EngineComputeRequest;

  try {
    const upstream = await fetch(
      `${computeUrl.replace(/\/$/, "")}/api/compute`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}`, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }
    const data = JSON.parse(text) as EngineComputeResponse;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Compute proxy failure", detail: String(err) },
      { status: 502 },
    );
  }
}
