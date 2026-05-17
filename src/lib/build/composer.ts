import Anthropic from "@anthropic-ai/sdk";
import {
  EOL_LABEL,
  NARRATIVE_MODEL,
  ephemeralId,
  extractToolInput,
} from "./shared";
import { persistReport } from "@/lib/reports/persist";
import type {
  BuildResponse,
  EngineComputeResponse,
  Option,
  ParsedReport,
  Report,
  ReportMeta,
} from "@/lib/types";

const NARRATIVE_TOOL: Anthropic.Tool = {
  name: "compose_report_narrative",
  description:
    "Given a computed packaging comparison, choose the story type, pick which detail section leads, and write the lede + headline copy.",
  input_schema: {
    type: "object",
    properties: {
      story_type: {
        type: "string",
        enum: ["counterintuitive", "weight", "carbon", "lifecycle", "tradeoff", "material", "format"],
      },
      key_finding: { type: "string", description: "One punchy sentence — the headline. Reference the winning option by name. Avoid 'best'; use 'lowest carbon', 'most circular', etc." },
      context: { type: "string", description: "1–2 sentences explaining what's driving the result. Mention the dominant lifecycle stage if one stage carries most of the difference." },
      primary_section: { type: "string", enum: ["weight", "carbon", "composition", "eol", "circularity"], description: "Which detail section to feature first — pick the one where the comparison is most differentiated or most counterintuitive." },
      primary_title: { type: "string", description: "Section header for that primary section, ~5-8 words." },
      primary_why: { type: "string", description: "1 sentence on why this is the section to lead with." },
    },
    required: ["story_type", "key_finding", "context", "primary_section", "primary_title", "primary_why"],
  },
};

function narrativeSystemPrompt(): string {
  return `You write the story for Grounded Packaging's Scope LCA reports. Style:
factual, terse, data-led, no marketing fluff. Use option names verbatim. Lede +
primary section title together set up a finding; the supporting copy explains the
driver in 1–2 sentences.

Story-type guide:
- "counterintuitive": the heavier/more processed option turns out lowest-carbon.
- "weight": result is dominated by per-unit mass.
- "carbon": classical raw-materials carbon comparison, no surprises.
- "lifecycle": EOL or manufacturing stage flips the result.
- "tradeoff": no clear winner, depends on which metric.
- "material": composition (recycled / renewable %) drives the answer.
- "format": format choice (SUP vs bottle vs can) drives the answer.

Primary section guide:
- "weight": when option weights differ >2×.
- "carbon": when carbon difference is the headline.
- "composition": when one option is meaningfully more recycled/renewable.
- "eol": when EOL pathways differ dramatically.
- "circularity": when MCI is the most differentiated metric.`;
}

type NarrativeOutput = {
  story_type: ReportMeta["storyType"];
  key_finding: string;
  context: string;
  primary_section: ReportMeta["primarySection"];
  primary_title: string;
  primary_why: string;
};

function adapt(
  parsed: ParsedReport,
  computed: EngineComputeResponse,
  narrative: NarrativeOutput,
): { report: Report; meta: ReportMeta } {
  const options: Option[] = computed.options.map((c, i) => {
    const p = parsed.options[i];
    const eolTotal =
      c.end_of_life.recycled_kg +
      c.end_of_life.composted_kg +
      c.end_of_life.landfilled_kg +
      c.end_of_life.incinerated_kg;
    const pct = (kg: number) => (eolTotal > 0 ? Math.round((kg / eolTotal) * 100) : 0);
    return {
      name: c.name,
      format: p?.format ?? "",
      material: p?.display_material ?? p?.composition[0]?.material_library_entry ?? "",
      structure: p?.display_structure ?? "",
      weight: p?.weight_per_unit_g ?? 0,
      eol: EOL_LABEL[p?.eol_pathway ?? ""] ?? p?.eol_pathway ?? "",
      carbonKg: Math.round(c.carbon_footprint.total_kg),
      mci: Math.round(c.circularity.mci_pct),
      fossilPct: Math.round(c.material_composition.fossil_pct),
      recycledPct: Math.round(c.material_composition.recycled_pct),
      renewablePct: Math.round(c.material_composition.renewable_pct),
      eolSplit: {
        recycled: pct(c.end_of_life.recycled_kg),
        composted: pct(c.end_of_life.composted_kg),
        landfilled: pct(c.end_of_life.landfilled_kg),
        incinerated: pct(c.end_of_life.incinerated_kg),
      },
    };
  });
  const report: Report = {
    id: ephemeralId(),
    title: parsed.title,
    focusArea: parsed.focus_area,
    comparisonType: parsed.comparison_type,
    industry: parsed.industry,
    packSize: parsed.pack_size,
    annualVolume: parsed.annual_units,
    confidence: "medium",
    summary: parsed.summary,
    options,
  };
  const meta: ReportMeta = {
    storyType: narrative.story_type,
    keyFinding: narrative.key_finding,
    context: narrative.context,
    primarySection: narrative.primary_section,
    primaryTitle: narrative.primary_title,
    primaryWhy: narrative.primary_why,
  };
  return { report, meta };
}

export async function composeReport(args: {
  parsed: ParsedReport;
  queryText?: string;
  authorId?: string | null;
  apiKey: string;
  computeUrl: string;
}): Promise<BuildResponse> {
  const { parsed, queryText, authorId, apiKey, computeUrl } = args;
  const client = new Anthropic({ apiKey });
  const warnings: string[] = [];

  // Compute via Fly
  const enginePayload = {
    options: parsed.options.map((o) => ({
      name: o.name,
      weight_per_unit_g: o.weight_per_unit_g,
      composition: o.composition,
      manufacturing_process: o.manufacturing_process,
      manufacturing_grid: o.manufacturing_grid,
      eol_pathway: o.eol_pathway,
      recycled_content_pct: o.recycled_content_pct ?? 0,
      renewable_content_pct: o.renewable_content_pct ?? 0,
    })),
    region: parsed.region,
    annual_units: parsed.annual_units,
    description: queryText ?? parsed.summary,
  };
  const computeRes = await fetch(
    `${computeUrl.replace(/\/$/, "")}/api/compute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enginePayload),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!computeRes.ok) {
    const detail = await computeRes.text();
    throw new Error(`Compute returned ${computeRes.status}: ${detail.slice(0, 500)}`);
  }
  const computed = (await computeRes.json()) as EngineComputeResponse;

  // Narrative
  const narrativeUserMsg = JSON.stringify(
    {
      query: queryText ?? "",
      report: {
        title: parsed.title,
        focus_area: parsed.focus_area,
        comparison_type: parsed.comparison_type,
        pack_size: parsed.pack_size,
        industry: parsed.industry,
      },
      computed_options: computed.options.map((c, i) => ({
        name: c.name,
        display_material: parsed.options[i]?.display_material,
        weight_per_unit_g: parsed.options[i]?.weight_per_unit_g,
        carbon_kg_annual: c.carbon_footprint.total_kg,
        carbon_kg_per_unit: c.carbon_footprint.per_unit_kg,
        mci_pct: c.circularity.mci_pct,
        recycled_pct: c.material_composition.recycled_pct,
        renewable_pct: c.material_composition.renewable_pct,
        eol_pathway: parsed.options[i]?.eol_pathway,
      })),
    },
    null,
    2,
  );
  const narrResp = await client.messages.create({
    model: NARRATIVE_MODEL,
    max_tokens: 1024,
    system: narrativeSystemPrompt(),
    tools: [NARRATIVE_TOOL],
    tool_choice: { type: "tool", name: NARRATIVE_TOOL.name },
    messages: [{ role: "user", content: narrativeUserMsg }],
  });
  const narrative = extractToolInput<NarrativeOutput>(narrResp, NARRATIVE_TOOL.name);

  // Adapt + persist
  const { report, meta } = adapt(parsed, computed, narrative);
  let persistedId: string | null = null;
  try {
    persistedId = await persistReport({
      report,
      meta,
      queryText,
      authorId: authorId ?? null,
    });
  } catch (err) {
    warnings.push(`Persist failed: ${String(err).slice(0, 200)}`);
  }

  return {
    report,
    meta,
    trace: {
      parserModel: "—",
      narrativeModel: NARRATIVE_MODEL,
      parsedOptionsCount: parsed.options.length,
      warnings,
      persisted: persistedId !== null,
    },
  };
}
