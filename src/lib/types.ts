// Shared TypeScript types for Scope.
// Mirrors the structure produced by scripts/extract_reports.py.

export type Confidence = "high" | "medium" | "low";

export type StoryType =
  | "counterintuitive"
  | "weight"
  | "carbon"
  | "lifecycle"
  | "tradeoff"
  | "material"
  | "format";

export type PrimarySection =
  | "weight"
  | "carbon"
  | "composition"
  | "eol"
  | "circularity";

export interface EolSplit {
  recycled: number;
  composted: number;
  landfilled: number;
  incinerated: number;
}

export interface Option {
  name: string;
  format: string;
  material: string;
  structure: string;
  weight: number;
  eol: string;
  carbonKg: number;
  mci: number;
  fossilPct: number;
  recycledPct: number;
  renewablePct: number;
  eolSplit: EolSplit;
}

export interface Report {
  id: string;
  title: string;
  focusArea: string;
  comparisonType: string;
  industry: string;
  packSize: string;
  annualVolume: number;
  confidence: Confidence;
  summary: string;
  notes?: string;
  options: Option[];
}

export interface ReportMeta {
  storyType: StoryType;
  keyFinding: string;
  context: string;
  primarySection: PrimarySection;
  primaryTitle: string;
  primaryWhy: string;
}

// ===== Engine-shape types (mirror scope_compute.py contract) =====

export interface CompositionEntry {
  material_library_entry: string;
  percent: number;
  recycled_pair?: string;
}

export interface EngineProductOption {
  name: string;
  weight_per_unit_g: number;
  composition: CompositionEntry[];
  manufacturing_process: string;
  manufacturing_grid: string;
  eol_pathway: string;
  annual_units?: number;
  recycled_content_pct?: number;
  renewable_content_pct?: number;
  pre_consumer_scrap_frac?: number;
  utility?: number;
  format?: string;
  /** Display-only fields the engine ignores but the renderer needs. */
  display?: {
    material?: string;
    structure?: string;
  };
}

export interface EngineComputeRequest {
  options: EngineProductOption[];
  region?: string;
  annual_units?: number;
  tenant_id?: string;
  description?: string;
}

export interface EngineComputeResponse {
  options: Array<{
    name: string;
    carbon_footprint: {
      total_kg: number;
      raw_materials_kg: number;
      manufacturing_kg: number;
      logistics_kg: number;
      end_of_life_kg: number;
      per_unit_kg: number;
      intensity_kg_per_kg_material: number;
    };
    material_composition: {
      recycled_pct: number;
      renewable_pct: number;
      fossil_pct: number;
    };
    circularity: {
      mci_score: number;
      mci_pct: number;
      decomposition: Record<string, number>;
    };
    end_of_life: {
      recycled_kg: number;
      composted_kg: number;
      landfilled_kg: number;
      incinerated_kg: number;
    };
  }>;
  region: string;
}

export interface LibraryCatalog {
  materials: string[];
  manufacturing_processes: string[];
  electricity_grids: string[];
  eol_pathways: string[];
}

// ===== Build / parse / compose route I/O =====

export interface BuildRequest {
  query: string;
  region?: string;
  annualVolume?: number;
  packSize?: string;
  industry?: string;
}

export interface BuildResponse {
  report: Report;
  meta: ReportMeta;
  trace?: {
    parserModel: string;
    narrativeModel: string;
    parsedOptionsCount: number;
    warnings: string[];
    persisted?: boolean;
  };
}

/** Parser output — engine-ready options plus display metadata for the
 * review/confirm UI. The Compose step takes (a possibly user-edited copy of)
 * this and runs compute + narrative + persist. */
export interface ParsedOption {
  name: string;
  weight_per_unit_g: number;
  composition: CompositionEntry[];
  manufacturing_process: string;
  manufacturing_grid: string;
  eol_pathway: string;
  recycled_content_pct?: number;
  renewable_content_pct?: number;
  format: string;
  display_material: string;
  display_structure?: string;
}

export interface ParsedReport {
  options: ParsedOption[];
  region: string;
  annual_units: number;
  title: string;
  focus_area: string;
  comparison_type: string;
  industry: string;
  pack_size: string;
  summary: string;
}

export interface ParseResponse {
  parsed: ParsedReport;
  library: LibraryCatalog;
  warnings: string[];
  trace: {
    parserModel: string;
    latencyMs: number;
  };
}

export interface ComposeRequest {
  parsed: ParsedReport;
  queryText?: string;
}
