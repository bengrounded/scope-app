import type { CarbonBoundary, Option, Report } from "@/lib/types";

export const BOUNDARY_LABEL: Record<CarbonBoundary, string> = {
  gate: "Cradle to gate",
  grave: "Cradle to grave",
};

export const BOUNDARY_DESCRIPTION: Record<CarbonBoundary, string> = {
  gate: "Raw materials + manufacturing. Excludes distribution + end-of-life.",
  grave: "Raw materials + manufacturing + logistics + end-of-life.",
};

/** Sum the carbon stages included in a given boundary. */
export function carbonForBoundary(
  opt: Option,
  boundary: CarbonBoundary,
): number {
  if (!opt.stages) return opt.carbonKg;
  const s = opt.stages;
  if (boundary === "gate") {
    return s.rawMaterialsKg + s.manufacturingKg;
  }
  return (
    s.rawMaterialsKg + s.manufacturingKg + s.logisticsKg + s.endOfLifeKg
  );
}

/** Return a Report with each option's carbonKg recomputed at the requested
 * boundary. Options without `stages` are passed through unchanged (their
 * carbonKg is already cradle-to-grave). */
export function applyBoundary(
  report: Report,
  boundary: CarbonBoundary,
): Report {
  return {
    ...report,
    options: report.options.map((o) => ({
      ...o,
      carbonKg: carbonForBoundary(o, boundary),
    })),
  };
}

/** Coerce a query-string value to a valid boundary; default grave. */
export function parseBoundary(v: string | null | undefined): CarbonBoundary {
  return v === "gate" ? "gate" : "grave";
}

/** Are all options carrying a stage breakdown? (Disables the toggle when
 * any option is missing data — usually because the report predates the
 * adapter populating stages.) */
export function hasStages(report: Report): boolean {
  return report.options.every((o) => Boolean(o.stages));
}
