import { getReport } from "@/lib/reports";
import { loadParsedPayload, loadPersistedReport } from "@/lib/reports/persist";
import { parseQuery } from "./parser";
import type { ParsedReport, Report } from "@/lib/types";

/**
 * Build a ParsedReport for any existing report id so the build wizard can
 * clone-and-modify. Three resolution paths:
 *   1. Persisted report with stored parsed_payload — return as-is (faithful).
 *   2. Persisted report without parsed_payload (legacy rows) — synthesize
 *      from the rendered Report via Claude.
 *   3. Library report (one of the 376) — synthesize from the rendered
 *      Report via Claude.
 *
 * Path 2/3 lose some precision (the rendered Report doesn't carry the
 * engine composition / manufacturing identifiers verbatim), but the user
 * can fix anything in the review step before recomputing.
 */
export async function cloneToParsed(args: {
  id: string;
  tenantSlug: string;
  apiKey: string;
  computeUrl: string;
}): Promise<{ parsed: ParsedReport; source: "library" | "tenant"; faithful: boolean }> {
  const { id, tenantSlug, apiKey, computeUrl } = args;

  // 1. Try faithful clone for tenant reports.
  const persistedParsed = await loadParsedPayload(id, tenantSlug);
  if (persistedParsed) {
    return { parsed: persistedParsed, source: "tenant", faithful: true };
  }

  // 2/3. Resolve to a rendered Report then synthesize.
  const lib = getReport(id);
  let renderedReport: Report | null = lib ?? null;
  let source: "library" | "tenant" = "library";
  if (!renderedReport) {
    const persisted = await loadPersistedReport(id, tenantSlug);
    if (persisted) {
      renderedReport = persisted.report;
      source = "tenant";
    }
  }
  if (!renderedReport) {
    throw new Error(`Report ${id} not found`);
  }

  const parsed = await synthesizeFromRender(renderedReport, apiKey, computeUrl);
  return { parsed, source, faithful: false };
}

async function synthesizeFromRender(
  report: Report,
  apiKey: string,
  computeUrl: string,
): Promise<ParsedReport> {
  const optionLines = report.options.map((o, i) => {
    const parts: string[] = [`Option ${i + 1}: ${o.name}`];
    if (o.material) parts.push(`material: ${o.material}`);
    if (o.structure) parts.push(`structure: ${o.structure}`);
    if (o.format) parts.push(`format: ${o.format}`);
    if (typeof o.weight === "number") parts.push(`${o.weight}g per unit`);
    if (o.eol) parts.push(`EOL: ${o.eol}`);
    if (o.recycledPct) parts.push(`${o.recycledPct}% recycled`);
    if (o.renewablePct) parts.push(`${o.renewablePct}% renewable`);
    return parts.join(", ");
  });

  const query = [
    `Recreate this packaging comparison. Existing report id: ${report.id}.`,
    `Title: ${report.title}`,
    report.industry && `Industry: ${report.industry}`,
    report.packSize && `Pack size: ${report.packSize}`,
    report.annualVolume && `Annual units: ${report.annualVolume}`,
    report.summary && `Summary: ${report.summary}`,
    "",
    "Options:",
    ...optionLines,
  ]
    .filter(Boolean)
    .join("\n");

  const { parsed } = await parseQuery({
    body: { query, region: "Australia", annualVolume: report.annualVolume },
    apiKey,
    computeUrl,
  });
  return parsed;
}
