import { NextResponse } from "next/server";
import { getAllReports } from "@/lib/reports";
import type { ComputeRequest, ComputeResponse } from "@/lib/types";

// Force the Node runtime — we want server-side fetch + env vars, not the edge.
export const runtime = "nodejs";
// No incremental caching for this route — every compute call must hit upstream.
export const dynamic = "force-dynamic";

/**
 * POST /api/compute
 *
 * Behaviour:
 *  - If COMPUTE_API_URL (or legacy SCOPE_COMPUTE_URL) is set, proxy the POST
 *    body to `${url}/api/compute` on the Python FastAPI service and pass the
 *    response straight through.
 *  - If the env var is unset OR the upstream call fails, fall back to the
 *    Phase-1 stub: pick the closest matching pre-built library report so the
 *    UI lands somewhere useful.
 *
 * This means deploys "just work" with or without the Python service running:
 *  - No env var = library-only mode (great for previews / Vercel before
 *    Fly.io is deployed).
 *  - Env var set = real compute via scope_compute.py.
 *
 * The Python service is in /scope-compute-service/ (FastAPI + Dockerfile +
 * fly.toml). Once deployed, set COMPUTE_API_URL on Vercel and redeploy.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ComputeRequest;

  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;

  if (computeUrl) {
    try {
      const upstream = await fetch(
        `${computeUrl.replace(/\/$/, "")}/api/compute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          // 30s — Fly free-tier cold starts can take ~10s.
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!upstream.ok) {
        throw new Error(
          `Compute upstream returned ${upstream.status} ${upstream.statusText}`,
        );
      }
      const data = (await upstream.json()) as ComputeResponse;
      return NextResponse.json(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Compute upstream failed, falling back to stub:", err);
      // Fall through to stub.
    }
  }

  // --- Stub fallback ---
  const reports = getAllReports();
  const description = (body.description || "").toLowerCase();
  const guess =
    (description &&
      reports.find((r) =>
        [r.title, r.summary, r.industry]
          .join(" ")
          .toLowerCase()
          .includes(description),
      )) ||
    reports[0];

  const stub: ComputeResponse = {
    reportId: guess.id,
    status: "stub",
    message: computeUrl
      ? "Compute service unreachable — returned closest pre-built report. Check COMPUTE_API_URL and the Python service status."
      : "Compute engine not connected — returning the closest pre-built library report. Set COMPUTE_API_URL to enable on-demand computation.",
  };
  return NextResponse.json(stub);
}
