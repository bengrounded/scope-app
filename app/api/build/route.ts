import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { persistReport } from "@/lib/reports/persist";
import type {
  BuildRequest,
  BuildResponse,
  EngineComputeResponse,
  EngineProductOption,
  LibraryCatalog,
  Option,
  Report,
  ReportMeta,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PARSER_MODEL = "claude-sonnet-4-6";
const NARRATIVE_MODEL = "claude-sonnet-4-6";

const PARSER_TOOL: Anthropic.Tool = {
  name: "parse_packaging_comparison",
  description:
    "Translate a free-text packaging comparison request into engine-shape ProductOptions plus report framing metadata. You MUST only use material_library_entry, manufacturing_process, manufacturing_grid, and eol_pathway values that appear in the provided closed vocabulary lists — pick the closest match if the user describes something not literally listed.",
  input_schema: {
    type: "object",
    properties: {
      options: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Short display name shown on the option card, e.g. 'SUP — Mono PE/PE recyclable'.",
            },
            weight_per_unit_g: {
              type: "number",
              description:
                "Per-unit packaging weight in grams. Use realistic conventions: 330ml PET bottle ~22g, 330ml aluminium can ~14g, 250g coffee SUP 13-18g depending on material, generic mailer 30-80g.",
            },
            composition: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  material_library_entry: { type: "string" },
                  percent: { type: "number", minimum: 0, maximum: 100 },
                },
                required: ["material_library_entry", "percent"],
              },
            },
            manufacturing_process: { type: "string" },
            manufacturing_grid: { type: "string" },
            eol_pathway: { type: "string" },
            recycled_content_pct: { type: "number", minimum: 0, maximum: 100 },
            renewable_content_pct: {
              type: "number",
              minimum: 0,
              maximum: 100,
            },
            format: {
              type: "string",
              description:
                "User-visible pack-format label, e.g. 'SUP', 'Bottle', 'Can', 'Carton'.",
            },
            display_material: {
              type: "string",
              description:
                "User-visible material descriptor, e.g. 'PET/Al/PE laminate', 'Mono PE recyclable'.",
            },
            display_structure: {
              type: "string",
              description:
                "Optional substrate breakdown, e.g. 'PET 12u / Al 9u / PE 80u'. Empty string if not applicable.",
            },
          },
          required: [
            "name",
            "weight_per_unit_g",
            "composition",
            "manufacturing_process",
            "manufacturing_grid",
            "eol_pathway",
            "format",
            "display_material",
          ],
        },
      },
      region: {
        type: "string",
        description:
          "Country / region name matching electricity_grids list (drop the ' Grid' suffix). Default 'Australia' if unspecified.",
      },
      annual_units: {
        type: "integer",
        description: "Default 100000 if unspecified.",
      },
      title: { type: "string" },
      focus_area: {
        type: "string",
        description:
          "Category like 'Coffee', 'Beverage', 'Cosmetics', 'Cheese', 'Pet food', 'Apparel'. Two words max.",
      },
      comparison_type: {
        type: "string",
        enum: ["Material", "Format", "Lifecycle", "Region", "Volume"],
      },
      industry: { type: "string" },
      pack_size: { type: "string" },
      summary: {
        type: "string",
        description: "One-sentence factual description of the comparison.",
      },
    },
    required: [
      "options",
      "region",
      "annual_units",
      "title",
      "focus_area",
      "comparison_type",
      "industry",
      "pack_size",
      "summary",
    ],
  },
};

const NARRATIVE_TOOL: Anthropic.Tool = {
  name: "compose_report_narrative",
  description:
    "Given a computed packaging comparison, choose the story type, pick which detail section leads, and write the lede + headline copy.",
  input_schema: {
    type: "object",
    properties: {
      story_type: {
        type: "string",
        enum: [
          "counterintuitive",
          "weight",
          "carbon",
          "lifecycle",
          "tradeoff",
          "material",
          "format",
        ],
      },
      key_finding: {
        type: "string",
        description:
          "One punchy sentence — the headline. Reference the winning option by name. Avoid 'best'; use 'lowest carbon', 'most circular', etc.",
      },
      context: {
        type: "string",
        description:
          "1–2 sentences explaining what's driving the result. Mention the dominant lifecycle stage if one stage carries most of the difference.",
      },
      primary_section: {
        type: "string",
        enum: ["weight", "carbon", "composition", "eol", "circularity"],
        description:
          "Which detail section to feature first — pick the one where the comparison is most differentiated or most counterintuitive.",
      },
      primary_title: {
        type: "string",
        description: "Section header for that primary section, ~5-8 words.",
      },
      primary_why: {
        type: "string",
        description:
          "1 sentence on why this is the section to lead with.",
      },
    },
    required: [
      "story_type",
      "key_finding",
      "context",
      "primary_section",
      "primary_title",
      "primary_why",
    ],
  },
};

let cachedLibrary: { value: LibraryCatalog; fetchedAt: number } | null = null;

async function getLibrary(computeUrl: string): Promise<LibraryCatalog> {
  const TTL_MS = 5 * 60 * 1000;
  if (cachedLibrary && Date.now() - cachedLibrary.fetchedAt < TTL_MS) {
    return cachedLibrary.value;
  }
  const res = await fetch(`${computeUrl.replace(/\/$/, "")}/api/library`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Library fetch ${res.status}`);
  const value = (await res.json()) as LibraryCatalog;
  cachedLibrary = { value, fetchedAt: Date.now() };
  return value;
}

function parserSystemPrompt(lib: LibraryCatalog): string {
  return `You are the parser for Grounded Packaging's Scope LCA tool. You translate
free-text packaging comparison queries into engine inputs.

You MUST emit values from the closed vocabularies below for material_library_entry,
manufacturing_process, manufacturing_grid, and eol_pathway. Pick the nearest match
if the user describes something not literally listed. Never invent identifiers.

When the user doesn't specify volume, default to 100,000 annual units. When region
isn't specified, default to Australia. When weight isn't specified, use realistic
per-unit weights for that format: 330ml PET bottle ≈22g, 330ml glass bottle ≈200g,
330ml aluminium can ≈14g, 250g coffee bag 13-18g, generic mailer 30-80g, capsule 1-3g.

Composition percents must sum to 100 per option.

ALL OPTIONS in a single report must compare apples-to-apples: same pack size /
contents, same region, same annual_units. Vary format, material, or end-of-life,
not the underlying product use case.

== Closed vocabularies ==

material_library_entry (${lib.materials.length}):
${lib.materials.map((m) => `  - ${m}`).join("\n")}

manufacturing_process (${lib.manufacturing_processes.length}):
${lib.manufacturing_processes.map((p) => `  - ${p}`).join("\n")}

manufacturing_grid (${lib.electricity_grids.length}):
${lib.electricity_grids.map((g) => `  - ${g}`).join("\n")}

eol_pathway (${lib.eol_pathways.length}):
${lib.eol_pathways.map((e) => `  - ${e}`).join("\n")}
`;
}

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
- "circularity": when MCI is the most differentiated metric.
`;
}

function extractToolInput<T>(
  message: Anthropic.Message,
  toolName: string,
): T {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as T;
    }
  }
  throw new Error(`Model did not call tool '${toolName}'`);
}

type ParsedReport = {
  options: Array<
    EngineProductOption & {
      display_material: string;
      display_structure?: string;
    }
  >;
  region: string;
  annual_units: number;
  title: string;
  focus_area: string;
  comparison_type: string;
  industry: string;
  pack_size: string;
  summary: string;
};

type NarrativeOutput = {
  story_type: ReportMeta["storyType"];
  key_finding: string;
  context: string;
  primary_section: ReportMeta["primarySection"];
  primary_title: string;
  primary_why: string;
};

function ephemeralId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NEW-${rand}`;
}

const EOL_LABEL: Record<string, string> = {
  "Kerbside Recyclable - Plastic": "Kerbside recyclable",
  "Kerbside Recyclable - Paper": "Kerbside recyclable (paper)",
  "Soft Plastics Recyclable": "Soft-plastics recyclable",
  "Industrial Compostable": "Industrial compostable",
  "Home Compostable": "Home compostable",
  Landfill: "Non-recyclable / landfill",
  "Reusable / Refill": "Reusable / refill",
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
    const pct = (kg: number) =>
      eolTotal > 0 ? Math.round((kg / eolTotal) * 100) : 0;
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

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }
  const computeUrl =
    process.env.COMPUTE_API_URL || process.env.SCOPE_COMPUTE_URL;
  if (!computeUrl) {
    return NextResponse.json(
      { error: "COMPUTE_API_URL not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as BuildRequest;
  if (!body.query || body.query.trim().length < 5) {
    return NextResponse.json(
      { error: "query is required (min 5 chars)" },
      { status: 400 },
    );
  }

  const warnings: string[] = [];
  const client = new Anthropic({ apiKey });

  // 1. Library catalog
  const library = await getLibrary(computeUrl);

  // 2. Parse
  const parseUserMsg = [
    `User query: ${body.query.trim()}`,
    body.region ? `Region hint: ${body.region}` : "",
    body.annualVolume ? `Annual volume hint: ${body.annualVolume}` : "",
    body.packSize ? `Pack size hint: ${body.packSize}` : "",
    body.industry ? `Industry hint: ${body.industry}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const parseResp = await client.messages.create({
    model: PARSER_MODEL,
    max_tokens: 4096,
    system: parserSystemPrompt(library),
    tools: [PARSER_TOOL],
    tool_choice: { type: "tool", name: PARSER_TOOL.name },
    messages: [{ role: "user", content: parseUserMsg }],
  });
  let parsed: ParsedReport;
  try {
    parsed = extractToolInput<ParsedReport>(parseResp, PARSER_TOOL.name);
  } catch (err) {
    return NextResponse.json(
      { error: "Parser failed", detail: String(err) },
      { status: 502 },
    );
  }

  // Validate against library
  for (const opt of parsed.options) {
    if (!library.eol_pathways.includes(opt.eol_pathway)) {
      warnings.push(
        `Parser used unknown EOL '${opt.eol_pathway}' on '${opt.name}'`,
      );
    }
    if (!library.manufacturing_processes.includes(opt.manufacturing_process)) {
      warnings.push(
        `Parser used unknown process '${opt.manufacturing_process}' on '${opt.name}'`,
      );
    }
    if (!library.electricity_grids.includes(opt.manufacturing_grid)) {
      warnings.push(
        `Parser used unknown grid '${opt.manufacturing_grid}' on '${opt.name}'`,
      );
    }
    for (const c of opt.composition) {
      if (!library.materials.includes(c.material_library_entry)) {
        warnings.push(
          `Parser used unknown material '${c.material_library_entry}' on '${opt.name}'`,
        );
      }
    }
  }

  // 3. Compute
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
    description: body.query,
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
    return NextResponse.json(
      {
        error: `Compute returned ${computeRes.status}`,
        detail: detail.slice(0, 500),
        parsedOptions: parsed.options.map((o) => o.name),
        warnings,
      },
      { status: 502 },
    );
  }
  const computed = (await computeRes.json()) as EngineComputeResponse;

  // 4. Narrative
  const narrativeUserMsg = JSON.stringify(
    {
      query: body.query,
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
  let narrative: NarrativeOutput;
  try {
    narrative = extractToolInput<NarrativeOutput>(
      narrResp,
      NARRATIVE_TOOL.name,
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Narrative generation failed", detail: String(err) },
      { status: 502 },
    );
  }

  // 5. Adapt
  const { report, meta } = adapt(parsed, computed, narrative);

  // 6. Persist (best-effort; ephemeral fallback if Supabase isn't configured)
  let persistedId: string | null = null;
  try {
    persistedId = await persistReport({
      report,
      meta,
      queryText: body.query,
      authorId: null, // Day 4 wires real auth
    });
  } catch (err) {
    warnings.push(`Persist failed: ${String(err).slice(0, 200)}`);
  }

  const response: BuildResponse = {
    report,
    meta,
    trace: {
      parserModel: PARSER_MODEL,
      narrativeModel: NARRATIVE_MODEL,
      parsedOptionsCount: parsed.options.length,
      warnings,
      persisted: persistedId !== null,
    },
  };
  return NextResponse.json(response);
}
