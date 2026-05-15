// Assumption catalogue surfaced via the Tooltip component.
// Keep keys stable — they're referenced by the report components.

export type AssumptionKey =
  | "carbon"
  | "mci"
  | "fossilPct"
  | "eolPct"
  | "weight"
  | "recycledPct"
  | "renewablePct"
  | "annualVolume";

export interface Assumption {
  key: AssumptionKey;
  label: string;
  source: string;
  detail: string;
  confidence: "high" | "medium" | "low";
}

export const ASSUMPTIONS: Record<AssumptionKey, Assumption> = {
  carbon: {
    key: "carbon",
    label: "Total Carbon Footprint",
    source: "Cradle-to-grave LCA per Grounded engine v3.0",
    detail:
      "Includes raw materials, manufacturing, logistics, end-of-life. Calculated using ISO 14040/14044 methodology.",
    confidence: "high",
  },
  mci: {
    key: "mci",
    label: "Material Circularity Indicator",
    source: "Ellen MacArthur Foundation MCI methodology",
    detail:
      "Combines recycled/renewable content, utility/usable life, and end-of-life recovery probability.",
    confidence: "high",
  },
  fossilPct: {
    key: "fossilPct",
    label: "Reliance on Virgin Fossil Fuel",
    source: "Calculated from material composition",
    detail:
      "99% of plastics are made from fossil fuels. This measures the % of the pack composed of virgin fossil-derived materials.",
    confidence: "high",
  },
  eolPct: {
    key: "eolPct",
    label: "End-of-life pathway rate",
    source: "Country recycling rate × material class",
    detail:
      "Uses national average recycling rates per material class. Actual rates vary by region within country, collection infrastructure, and consumer behaviour.",
    confidence: "medium",
  },
  weight: {
    key: "weight",
    label: "Pack weight per unit",
    source: "Industry-standard structure × density",
    detail:
      "Calculated from layer thicknesses × material densities. Verify against supplier specs for production accuracy.",
    confidence: "high",
  },
  recycledPct: {
    key: "recycledPct",
    label: "Recycled content",
    source: "As specified in material spec",
    detail: "Percentage of post-consumer recycled (PCR) content in the pack.",
    confidence: "high",
  },
  renewablePct: {
    key: "renewablePct",
    label: "Renewable content",
    source: "As specified in material spec",
    detail:
      "Percentage of bio-based or renewable material (typically paper, bio-plastics).",
    confidence: "high",
  },
  annualVolume: {
    key: "annualVolume",
    label: "Annual unit volume",
    source: "Standardised at 100,000 units for comparison",
    detail:
      "For apples-to-apples comparison. Scale up or down linearly for your actual volumes.",
    confidence: "medium",
  },
};
