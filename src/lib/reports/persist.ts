import { getServerSupabase, getTenantId } from "@/lib/supabase/server";
import type { Option, ParsedReport, Report, ReportMeta } from "@/lib/types";

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
  customer?: string | null;
  parsedPayload?: ParsedReport | null;
}): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const tenantId = await getTenantId(DEFAULT_TENANT_SLUG);
  if (!tenantId) {
    throw new Error(`Tenant slug '${DEFAULT_TENANT_SLUG}' not found`);
  }

  const { report, meta, queryText, authorId, customer, parsedPayload } = args;
  const { error } = await sb.from("reports").insert({
    id: report.id,
    tenant_id: tenantId,
    author_id: authorId ?? null,
    customer: customer && customer.trim() ? customer.trim() : null,
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
    parsed_payload: parsedPayload ?? null,
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

/**
 * Fetch a persisted report by id. Returns null if not found / no Supabase.
 * When `tenantSlug` is provided, the lookup also filters by tenant_id —
 * required defence against cross-tenant leakage once Phase 2 has >1 tenant
 * (RLS will enforce this server-side from Day 7; this is belt-and-braces).
 */
export async function loadPersistedReport(
  id: string,
  tenantSlug?: string,
): Promise<PersistedReport | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  let query = sb
    .from("reports")
    .select(
      "id, title, focus_area, comparison_type, industry, pack_size, annual_volume, confidence, summary, notes, options, meta",
    )
    .eq("id", id);
  if (tenantSlug) {
    const tenantId = await getTenantId(tenantSlug);
    if (!tenantId) return null;
    query = query.eq("tenant_id", tenantId);
  }
  const { data, error } = await query.maybeSingle();
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

/** Lightweight summary of a tenant-generated report, for the library table. */
export interface TenantReportSummary {
  id: string;
  title: string;
  focusArea: string | null;
  comparisonType: string | null;
  industry: string | null;
  customer: string | null;
  packSize: string | null;
  annualVolume: number | null;
  optionsCount: number;
  optionNames: string[];
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

/** Retrieve the original ParsedReport stored alongside a persisted report.
 * Returns null if the row doesn't exist or no parsed_payload was stored
 * (older rows before migration 0006). */
export async function loadParsedPayload(
  id: string,
  tenantSlug?: string,
): Promise<ParsedReport | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  let query = sb.from("reports").select("parsed_payload").eq("id", id);
  if (tenantSlug) {
    const tenantId = await getTenantId(tenantSlug);
    if (!tenantId) return null;
    query = query.eq("tenant_id", tenantId);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return (data.parsed_payload as ParsedReport | null) ?? null;
}

/** Distinct customer values seen for this tenant — feeds the typeahead. */
export async function listTenantCustomers(tenantSlug: string): Promise<string[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const { data, error } = await sb
    .from("reports")
    .select("customer")
    .eq("tenant_id", tenantId)
    .not("customer", "is", null);
  if (error || !data) return [];
  return Array.from(
    new Set((data as Array<{ customer: string | null }>)
      .map((r) => r.customer)
      .filter((c): c is string => Boolean(c))),
  ).sort();
}

/** List the tenant's most recent build-flow-generated reports. Ordered by
 * created_at desc. Returns [] when Supabase isn't configured or the tenant
 * doesn't resolve. */
export async function listTenantReports(
  tenantSlug: string,
  limit = 50,
): Promise<TenantReportSummary[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];

  // Nested select on the author FK (reports.author_id -> public.users.id).
  const { data, error } = await sb
    .from("reports")
    .select(
      "id, title, focus_area, comparison_type, industry, customer, pack_size, annual_volume, options, created_at, author:users(email, full_name)",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return data.map((r) => {
    const opts = (r.options as Option[] | null) ?? [];
    const author = r.author as
      | { email: string | null; full_name: string | null }
      | { email: string | null; full_name: string | null }[]
      | null;
    const authorRow = Array.isArray(author) ? author[0] : author;
    return {
      id: r.id as string,
      title: r.title as string,
      focusArea: (r.focus_area as string | null) ?? null,
      comparisonType: (r.comparison_type as string | null) ?? null,
      industry: (r.industry as string | null) ?? null,
      customer: (r.customer as string | null) ?? null,
      packSize: (r.pack_size as string | null) ?? null,
      annualVolume: (r.annual_volume as number | null) ?? null,
      optionsCount: opts.length,
      optionNames: opts.map((o) => o.name),
      authorEmail: authorRow?.email ?? null,
      authorName: authorRow?.full_name ?? null,
      createdAt: r.created_at as string,
    };
  });
}
