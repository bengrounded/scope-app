import { getServerSupabase, getTenantId } from "@/lib/supabase/server";
import type { Report, ReportMeta } from "@/lib/types";

const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_ID || "grounded";

export interface PersistedReport {
  report: Report;
  meta: ReportMeta;
}

/**
 * Persist a generated report row. Best-effort: returns the saved id on
 * success, or `null` if Supabase isn't configured. Errors are thrown so the
 * caller can decide whether to surface them.
 */
export async function persistReport(args: {
  report: Report;
  meta: ReportMeta;
  queryText?: string;
  authorId?: string | null;
}): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const tenantId = await getTenantId(DEFAULT_TENANT_SLUG);
  if (!tenantId) {
    throw new Error(`Tenant slug '${DEFAULT_TENANT_SLUG}' not found`);
  }

  const { report, meta, queryText, authorId } = args;
  const { error } = await sb.from("reports").insert({
    id: report.id,
    tenant_id: tenantId,
    author_id: authorId ?? null,
    title: report.title,
    focus_area: report.focusArea,
    comparison_type: report.comparisonType,
    industry: report.industry,
    pack_size: report.packSize,
    annual_volume: report.annualVolume,
    confidence: report.confidence,
    summary: report.summary,
    notes: report.notes ?? null,
    options: report.options,
    meta,
    query_text: queryText ?? null,
    source: "build",
  });
  if (error) throw new Error(`Insert reports failed: ${error.message}`);

  // Audit log — fire-and-forget
  await sb.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: authorId ?? null,
    action: "report.create",
    target_type: "report",
    target_id: report.id,
    diff: { source: "build", query: queryText },
  });

  return report.id;
}

/** Fetch a persisted report by id. Returns null if not found / no Supabase. */
export async function loadPersistedReport(
  id: string,
): Promise<PersistedReport | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("reports")
    .select(
      "id, title, focus_area, comparison_type, industry, pack_size, annual_volume, confidence, summary, notes, options, meta",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const report: Report = {
    id: data.id,
    title: data.title,
    focusArea: data.focus_area ?? "",
    comparisonType: data.comparison_type ?? "Material",
    industry: data.industry ?? "",
    packSize: data.pack_size ?? "",
    annualVolume: data.annual_volume ?? 100000,
    confidence: (data.confidence ?? "medium") as Report["confidence"],
    summary: data.summary ?? "",
    notes: data.notes ?? undefined,
    options: data.options,
  };
  return { report, meta: data.meta as ReportMeta };
}
