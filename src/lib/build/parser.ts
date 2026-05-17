import Anthropic from "@anthropic-ai/sdk";
import { PARSER_MODEL, extractToolInput, getLibrary } from "./shared";
import type {
  BuildRequest,
  LibraryCatalog,
  ParsedReport,
  ParseResponse,
  TdsAttachment,
} from "@/lib/types";

const TDS_PDF_MIMES = new Set(["application/pdf"]);
const TDS_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const TDS_MAX_BYTES = 10 * 1024 * 1024; // 10MB cap

function tdsToContentBlock(tds: TdsAttachment): Anthropic.ContentBlockParam {
  // Rough size guard — base64 expands by ~33% so the decoded length is the
  // base64 length × 3/4. Fail fast if it's beyond the cap.
  const approxBytes = (tds.base64.length * 3) / 4;
  if (approxBytes > TDS_MAX_BYTES) {
    throw new Error(
      `TDS file ${tds.filename} is ${(approxBytes / 1024 / 1024).toFixed(1)}MB — max 10MB`,
    );
  }
  const mt = tds.mimeType.toLowerCase();
  if (TDS_PDF_MIMES.has(mt)) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: tds.base64 },
    };
  }
  if (TDS_IMAGE_MIMES.has(mt)) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mt as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: tds.base64,
      },
    };
  }
  throw new Error(`Unsupported TDS file type: ${tds.mimeType}`);
}

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
            name: { type: "string", description: "Short display name shown on the option card, e.g. 'SUP — Mono PE/PE recyclable'." },
            weight_per_unit_g: { type: "number", description: "Per-unit packaging weight in grams. Realistic conventions: 330ml PET bottle ~22g, 330ml aluminium can ~14g, 250g coffee SUP 13-18g, generic mailer 30-80g." },
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
            renewable_content_pct: { type: "number", minimum: 0, maximum: 100 },
            format: { type: "string", description: "User-visible pack-format label, e.g. 'PET bottle', 'Aluminium can', 'Stand-up pouch'." },
            display_material: { type: "string", description: "User-visible material descriptor, e.g. 'PET/Al/PE laminate', 'Mono PE recyclable'." },
            display_structure: { type: "string", description: "Optional substrate breakdown, e.g. 'PET 12u / Al 9u / PE 80u'. Empty string if not applicable." },
          },
          required: ["name", "weight_per_unit_g", "composition", "manufacturing_process", "manufacturing_grid", "eol_pathway", "format", "display_material"],
        },
      },
      region: { type: "string", description: "Country / region name matching electricity_grids list (drop the ' Grid' suffix). Default 'Australia' if unspecified." },
      annual_units: { type: "integer", description: "Default 100000 if unspecified." },
      title: { type: "string" },
      focus_area: { type: "string", description: "Category like 'Coffee', 'Beverage', 'Cosmetics', 'Cheese', 'Pet food', 'Apparel'. Two words max." },
      comparison_type: { type: "string", enum: ["Material", "Format", "Lifecycle", "Region", "Volume"] },
      industry: { type: "string" },
      pack_size: { type: "string" },
      summary: { type: "string", description: "One-sentence factual description of the comparison." },
    },
    required: ["options", "region", "annual_units", "title", "focus_area", "comparison_type", "industry", "pack_size", "summary"],
  },
};

function parserSystemPrompt(lib: LibraryCatalog, hasTds: boolean): string {
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
${
  hasTds
    ? `
== Technical data sheet (TDS) attached ==
The user has attached a TDS (PDF or image) for one of the options. Read it
carefully — TDSs typically list: layer-by-layer substrate breakdown with
thicknesses in microns, basis weight (gsm), total per-unit weight, intended
EOL pathway, and recycled / renewable content claims. Use this as the
source-of-truth for whichever option the user is referring to. Surface the
layer breakdown verbatim in display_structure (e.g. "PET 12µm / Al 9µm /
PE 80µm"). If the TDS describes the dominant option (one referred to by name
or position in the query), apply it to that option; for the other options
synthesise sensible comparators from typical industry alternatives.
`
    : ""
}
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

export function validateParsed(parsed: ParsedReport, library: LibraryCatalog): string[] {
  const warnings: string[] = [];
  for (const opt of parsed.options) {
    if (!library.eol_pathways.includes(opt.eol_pathway)) {
      warnings.push(`Parser used unknown EOL '${opt.eol_pathway}' on '${opt.name}'`);
    }
    if (!library.manufacturing_processes.includes(opt.manufacturing_process)) {
      warnings.push(`Parser used unknown process '${opt.manufacturing_process}' on '${opt.name}'`);
    }
    if (!library.electricity_grids.includes(opt.manufacturing_grid)) {
      warnings.push(`Parser used unknown grid '${opt.manufacturing_grid}' on '${opt.name}'`);
    }
    for (const c of opt.composition) {
      if (!library.materials.includes(c.material_library_entry)) {
        warnings.push(`Parser used unknown material '${c.material_library_entry}' on '${opt.name}'`);
      }
    }
  }
  return warnings;
}

export async function parseQuery(args: {
  body: BuildRequest;
  apiKey: string;
  computeUrl: string;
}): Promise<ParseResponse> {
  const { body, apiKey, computeUrl } = args;
  const started = Date.now();
  const library = await getLibrary(computeUrl);
  const client = new Anthropic({ apiKey });

  const parseUserMsg = [
    `User query: ${body.query.trim()}`,
    body.region ? `Region hint: ${body.region}` : "",
    body.annualVolume ? `Annual volume hint: ${body.annualVolume}` : "",
    body.packSize ? `Pack size hint: ${body.packSize}` : "",
    body.industry ? `Industry hint: ${body.industry}` : "",
    body.tds ? `Attached TDS: ${body.tds.filename}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Build the user message content. When a TDS is attached, send it as a
  // document/image content block ahead of the text so Claude reads it first.
  const content: Anthropic.ContentBlockParam[] = [];
  if (body.tds) {
    content.push(tdsToContentBlock(body.tds));
  }
  content.push({ type: "text", text: parseUserMsg });

  const resp = await client.messages.create({
    model: PARSER_MODEL,
    max_tokens: 4096,
    system: parserSystemPrompt(library, Boolean(body.tds)),
    tools: [PARSER_TOOL],
    tool_choice: { type: "tool", name: PARSER_TOOL.name },
    messages: [{ role: "user", content }],
  });
  const parsed = extractToolInput<ParsedReport>(resp, PARSER_TOOL.name);
  const warnings = validateParsed(parsed, library);

  return {
    parsed,
    library,
    warnings,
    trace: { parserModel: PARSER_MODEL, latencyMs: Date.now() - started },
  };
}
