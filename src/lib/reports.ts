// Loader for the JSON-backed library. Phase 1 reads from a static
// JSON file shipped with the build. Phase 2 swaps to Supabase by
// replacing this module's exports — the rest of the app stays the same.

import reportsJson from "@/data/reports.json";
import metaJson from "@/data/report_meta.json";
import type { Report, ReportMeta } from "./types";
import { focusClassForArea } from "./focus";

const REPORTS = reportsJson as Report[];
const META = metaJson as Record<string, ReportMeta>;

export function getAllReports(): Report[] {
  return REPORTS;
}

export function getReport(id: string): Report | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function getMeta(id: string): ReportMeta | undefined {
  return META[id];
}

export function getMetaOrDefault(report: Report): ReportMeta {
  return (
    META[report.id] ?? {
      storyType: "material",
      keyFinding: (report.summary || "").split(".")[0] + ".",
      context: report.summary,
      primarySection: "carbon",
      primaryTitle: "Annual carbon footprint",
      primaryWhy:
        "Total greenhouse-gas emissions across the full lifecycle for each option at standard annual volume.",
    }
  );
}

export const FOCUS_AREAS = [
  "Coffee",
  "Vitamins & Supplements",
  "Sustainable Refill",
  "Stand-up Pouches",
  "E-commerce & Poly",
  "Technical Materials",
  "Sustainable Flexibles",
  "Pet Food",
  "Beverages",
  "Cosmetics & Beauty",
  "Elimination & Consolidation",
] as const;

export const COMPARISON_TYPES = [
  "Material",
  "Format",
  "Supply Chain",
  "Lifecycle",
  "Elimination",
] as const;

export { focusClassForArea };
