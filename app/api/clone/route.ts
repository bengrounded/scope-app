import { NextResponse } from "next/server";
import { cloneToParsed } from "@/lib/build/cloner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * POST /api/clone  { id, tenant }
 *
 * Resolves a report id (library COF-001 or persisted NEW-XXXXXX) to a
 * ParsedReport so the build wizard can drop the user straight into the
 * review step with all the structures pre-filled.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;
  if (!apiKey || !computeUrl) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY or COMPUTE_API_URL not configured" },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    tenant?: string;
  };
  const id = (body.id ?? "").trim();
  const tenant = (body.tenant ?? "grounded").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const result = await cloneToParsed({ id, tenantSlug: tenant, apiKey, computeUrl });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Clone failed", detail: String(err) },
      { status: 502 },
    );
  }
}
