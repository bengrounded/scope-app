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

export interface ComputeRequest {
  tenantId?: string;
  description?: string;
  options?: Array<{
    name?: string;
    format?: string;
    material?: string;
    structure?: string;
    weight?: number;
    region?: string;
  }>;
  packSize?: string;
  industry?: string;
  region?: string;
  annualVolume?: number;
}

export interface ComputeResponse {
  reportId: string;
  status: "stub" | "computed";
  message?: string;
}

export interface MaterialLibraryEntry {
  id: string;
  name: string;
  category: string;
  density: number;
  carbonPerGram: number;
  fossilPct: number;
  recycledPct: number;
  renewablePct: number;
  notes?: string;
}
