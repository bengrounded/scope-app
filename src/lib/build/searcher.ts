import { getAllReports } from "@/lib/reports";
import { listTenantReports } from "@/lib/reports/persist";

export interface SearchResult {
  id: string;
  source: "library" | "tenant";
  title: string;
  summary: string;
  focusArea: string | null;
  comparisonType: string | null;
  optionsCount: number;
  optionNames: string[];
  customer: string | null;
  createdAt: string | null;
  score: number;
}

function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9-]+/)
        .filter((t) => t.length >= 3),
    ),
  );
}

/** Search across the static 376 library + the tenant's persisted reports. */
export async function searchReports(
  query: string,
  tenantSlug: string,
  limit = 5,
): Promise<SearchResult[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const library = getAllReports();
  const libraryResults: SearchResult[] = library
    .map((r) => {
      const blob = [
        r.title,
        r.summary,
        r.industry,
        r.id,
        ...(r.options ?? []).map((o) => `${o.name} ${o.material} ${o.structure}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce((s, t) => s + (blob.includes(t) ? 1 : 0), 0);
      return {
        source: "library" as const,
        id: r.id,
        title: r.title,
        summary: r.summary ?? "",
        focusArea: r.focusArea,
        comparisonType: r.comparisonType,
        optionsCount: r.options?.length ?? 0,
        optionNames: (r.options ?? []).map((o) => o.name),
        customer: null,
        createdAt: null,
        score,
      };
    })
    .filter((r) => r.score > 0);

  const tenantRows = await listTenantReports(tenantSlug, 200);
  const tenantResults: SearchResult[] = tenantRows
    .map((r) => {
      const blob = [
        r.title,
        r.industry,
        r.customer,
        r.id,
        ...r.optionNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce((s, t) => s + (blob.includes(t) ? 1 : 0), 0);
      return {
        source: "tenant" as const,
        id: r.id,
        title: r.title,
        summary: "",
        focusArea: r.focusArea,
        comparisonType: r.comparisonType,
        optionsCount: r.optionsCount,
        optionNames: r.optionNames,
        customer: r.customer,
        createdAt: r.createdAt,
        score: score + (score > 0 ? 0.5 : 0), // small recency-style bias toward tenant rows
      };
    })
    .filter((r) => r.score > 0);

  return [...tenantResults, ...libraryResults]
    .sort((a, b) => b.score - a.score || b.title.length - a.title.length)
    .slice(0, limit);
}
