"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Trash2, FileUp, ChevronDown, ChevronRight, Sparkles, Library as LibraryIcon } from "lucide-react";
import { DEFAULT_TENANT_SLUG, tenantSlugFromPath } from "@/lib/tenant";
import type { SearchResult } from "@/lib/build/searcher";
import type {
  BuildResponse,
  Option,
  ParsedReport,
  ParseResponse,
  PrimarySection as PrimarySectionType,
} from "@/lib/types";
import { bestOption, carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";
import { applyBoundary, hasStages, BOUNDARY_LABEL } from "@/lib/boundary";
import type { CarbonBoundary } from "@/lib/types";
import BoundaryToggle from "./BoundaryToggle";
import {
  FORMATS,
  FORMAT_CATEGORIES,
  getFormat,
  getStructure,
} from "@/lib/formats";
import Lede from "./Lede";
import OptionCard from "./OptionCard";
import Equivalencies from "./Equivalencies";
import PrimarySection from "./PrimarySection";
import SupportingCard from "./SupportingCard";
import Recommendation from "./Recommendation";
import ReviewStep from "./build/ReviewStep";

type WizardStep = "form" | "parsing" | "review" | "composing" | "result";

const SUGGESTIONS = [
  "Compare a refill pouch to a single-use HDPE bottle for shampoo",
  "Vacuum-pack vs MAP tray vs flow-wrap for 200g cheese",
  "Paper vs PCR poly for a 30x40cm apparel mailer",
  "12-can multipack vs pouches for wet pet food",
  "Refill formats for hand wash — SUP, tablet, or BYO",
  "PET bottle vs aluminium can vs Tetra Pak for 1L milk",
];

const REGIONS = [
  "Australia (default)",
  "United Kingdom",
  "European Union",
  "United States",
  "Global average",
];

const ALL_SECTIONS: PrimarySectionType[] = [
  "weight",
  "carbon",
  "composition",
  "eol",
  "circularity",
];

function regionFromUI(label: string): string | undefined {
  if (label.startsWith("Australia")) return "Australia";
  if (label === "United Kingdom") return "United Kingdom";
  if (label === "European Union") return "European average";
  if (label === "United States") return "USA";
  return undefined;
}

interface StructuredOption {
  formatId: string;
  structureId: string;
  /** User override of structure's typical weight (grams). Empty = use catalog default. */
  weightOverride: string;
}

function emptyOption(): StructuredOption {
  return { formatId: "", structureId: "", weightOverride: "" };
}

/**
 * Synthesize an NL query for the parser when the user has filled in the
 * structured options. The catalog's display labels become the bulk of the
 * sentence — the parser then resolves them to engine identifiers.
 */
function synthesizeStructuredQuery(opts: StructuredOption[]): string {
  const lines: string[] = [];
  opts.forEach((o, i) => {
    const fmt = getFormat(o.formatId);
    const struct = o.structureId ? getStructure(o.formatId, o.structureId) : null;
    if (!fmt) return;
    const label = String.fromCharCode(65 + i); // A, B, C, D
    const weight =
      o.weightOverride.trim() ||
      (struct?.weight_per_unit_g ? `${struct.weight_per_unit_g}` : "");
    const parts: string[] = [];
    if (struct) parts.push(`${struct.label}`);
    parts.push(`(${fmt.label})`);
    if (weight) parts.push(`~${weight}g`);
    if (struct?.recycled_content_pct) parts.push(`${struct.recycled_content_pct}% recycled content`);
    if (struct?.default_eol) parts.push(`EOL: ${struct.default_eol}`);
    lines.push(`Option ${label}: ${parts.join(", ")}`);
  });
  return lines.length ? `Compare these options.\n${lines.join("\n")}` : "";
}

interface BuilderFormProps {
  customerSuggestions?: string[];
}

export default function BuilderForm({ customerSuggestions = [] }: BuilderFormProps = {}) {
  const params = useSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const tenantSlug = tenantSlugFromPath(pathname) || DEFAULT_TENANT_SLUG;
  const [description, setDescription] = useState(params.get("query") ?? "");
  const [packSize, setPackSize] = useState(params.get("packSize") ?? "");
  const [industry, setIndustry] = useState(params.get("industry") ?? "");
  const [region, setRegion] = useState(() => {
    const r = params.get("region");
    if (!r) return REGIONS[0];
    return (
      REGIONS.find((x) => x.toLowerCase().startsWith(r.toLowerCase())) ??
      REGIONS[0]
    );
  });
  const [options, setOptions] = useState<StructuredOption[]>([
    emptyOption(),
    emptyOption(),
  ]);
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [customer, setCustomer] = useState("");
  const [step, setStep] = useState<WizardStep>("form");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [draft, setDraft] = useState<ParsedReport | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string>("");
  const [result, setResult] = useState<BuildResponse | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [cloning, setCloning] = useState(false);
  const submitting = step === "parsing";

  // Auto-submit (?auto=1) and clone (?from=ID) inbound paths.
  useEffect(() => {
    const fromId = params.get("from");
    if (fromId) {
      handleCloneFrom(fromId);
      return;
    }
    if (params.get("auto") === "1" && description.trim().length > 5) {
      handleOneShotBuild();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search-as-you-type across library + tenant reports.
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = description.trim();
    if (q.length < 4) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      try {
        const res = await fetch(
          `/api/library/search?q=${encodeURIComponent(q)}&tenant=${encodeURIComponent(tenantSlug)}&limit=4`,
          { signal: ac.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        setSearchResults(data.results ?? []);
      } catch {
        /* aborted or transient — ignore */
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [description, tenantSlug]);

  async function handleCloneFrom(id: string) {
    setCloning(true);
    setError(null);
    try {
      const res = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tenant: tenantSlug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Clone failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        parsed: ParsedReport;
        source: "library" | "tenant";
        faithful: boolean;
      };
      setParsed({
        parsed: data.parsed,
        library: { materials: [], manufacturing_processes: [], electricity_grids: [], eol_pathways: [] },
        warnings: data.faithful
          ? []
          : [`Cloned from ${id} (${data.source}) — fields synthesized from the rendered report. Review carefully.`],
        trace: { parserModel: "clone", latencyMs: 0 },
      });
      setDraft(data.parsed);
      setOriginalQuery(`Cloned from ${id}`);
      // Library catalog is needed for the review step's EOL/process/grid
      // dropdowns. Fetch it via /api/parse with a no-op tiny request — or
      // better, hit Fly's /api/library directly through a small route.
      // For simplicity here we fetch via parse with a sentinel query.
      try {
        const lib = await fetch("/api/library/catalog");
        if (lib.ok) {
          const catalog = await lib.json();
          setParsed((p) => (p ? { ...p, library: catalog } : p));
        }
      } catch {
        /* ignore */
      }
      setStep("review");
      // Clean the URL.
      router.replace(pathname);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setCloning(false);
    }
  }

  function updateOption(idx: number, patch: Partial<StructuredOption>) {
    setOptions((prev) =>
      prev.map((o, i) => {
        if (i !== idx) return o;
        const next = { ...o, ...patch };
        // If format changes, reset structure (it'd be invalid for the new format).
        if (patch.formatId !== undefined && patch.formatId !== o.formatId) {
          next.structureId = "";
          next.weightOverride = "";
        }
        return next;
      }),
    );
  }
  function addOption() {
    setOptions((prev) => (prev.length >= 4 ? prev : [...prev, emptyOption()]));
  }
  function removeOption(idx: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }

  /** Read the uploaded TDS file as base64 (no `data:` prefix). Returns
   *  undefined when no file is attached or it exceeds the 10MB cap. */
  async function readTdsAttachment() {
    if (!tdsFile) return undefined;
    if (tdsFile.size > 10 * 1024 * 1024) {
      throw new Error(`TDS file is ${(tdsFile.size / 1024 / 1024).toFixed(1)}MB — max 10MB`);
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
      reader.readAsDataURL(tdsFile);
    });
    return { filename: tdsFile.name, mimeType: tdsFile.type, base64 };
  }

  /** Assemble the user's query from description + structured options + context. */
  function assembleQuery(): string {
    const filledOpts = options.filter((o) => o.formatId);
    const structuredQuery = synthesizeStructuredQuery(filledOpts);
    const contextBits = [
      packSize && `Pack size: ${packSize}`,
      industry && `Industry: ${industry}`,
    ].filter(Boolean) as string[];
    let query = description.trim();
    if (structuredQuery) query = query ? `${query}\n\n${structuredQuery}` : structuredQuery;
    if (contextBits.length) query = `${query}\n${contextBits.join(". ")}`;
    return query;
  }

  /** Step 1 → 2: parse only, then transition to review. */
  async function handleParse() {
    setError(null);
    setResult(null);
    try {
      const query = assembleQuery();
      if (query.length < 5) {
        throw new Error("Describe what to compare, or fill in at least one option.");
      }
      setOriginalQuery(query);
      setStep("parsing");
      const tds = await readTdsAttachment();
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          region: regionFromUI(region),
          packSize: packSize || undefined,
          industry: industry || undefined,
          tds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Parse failed: ${res.status}`);
      }
      const data = (await res.json()) as ParseResponse;
      setParsed(data);
      setDraft(data.parsed);
      setStep("review");
      requestAnimationFrame(() =>
        document
          .getElementById("scope-review-root")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStep("form");
    }
  }

  /** Step 2 → 3: compose with the user's edited draft. */
  async function handleCompose() {
    if (!draft) return;
    setError(null);
    setStep("composing");
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsed: draft,
          queryText: originalQuery,
          customer: customer.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Compose failed: ${res.status}`);
      }
      const data = (await res.json()) as BuildResponse;
      setResult(data);
      setStep("result");
      requestAnimationFrame(() =>
        document
          .getElementById("scope-build-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStep("review");
    }
  }

  /** Auto-submit (?auto=1) bypasses review — parse + compose in one shot. */
  async function handleOneShotBuild() {
    setError(null);
    setStep("parsing");
    try {
      const query = assembleQuery();
      if (query.length < 5) throw new Error("Empty query");
      setOriginalQuery(query);
      const tds = await readTdsAttachment();
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          region: regionFromUI(region),
          packSize: packSize || undefined,
          industry: industry || undefined,
          tds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Build failed: ${res.status}`);
      }
      const data = (await res.json()) as BuildResponse;
      setResult(data);
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStep("form");
    }
  }

  function resetForBuildAnother() {
    setResult(null);
    setParsed(null);
    setDraft(null);
    setError(null);
    setStep("form");
  }

  function backToForm() {
    setStep("form");
  }

  // Submit handler used by both Generate buttons in the form view.
  const handleSubmit = handleParse;

  if (step === "result" && result) {
    return <BuilderResultView data={result} onReset={resetForBuildAnother} />;
  }

  if (cloning) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <Sparkles className="mx-auto mb-3 text-indigo-600" />
        <h2 className="text-lg font-semibold mb-1">Pre-filling from existing report…</h2>
        <p className="text-sm text-slate-500">Restoring structures. Takes ~5-15s.</p>
      </div>
    );
  }

  if ((step === "review" || step === "composing") && parsed && draft) {
    return (
      <div id="scope-review-root">
        <ReviewStep
          parsed={draft}
          library={parsed.library}
          warnings={parsed.warnings}
          composing={step === "composing"}
          error={error}
          customer={customer}
          customerSuggestions={customerSuggestions}
          onChange={setDraft}
          onCustomerChange={setCustomer}
          onCompose={handleCompose}
          onBack={backToForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DOMINANT — describe / search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <label
          htmlFor="scope-describe"
          className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700"
        >
          <Sparkles size={16} className="text-tack-600" />
          Describe what you&apos;re looking to do — or see if we&apos;ve already got
          one
        </label>
        <textarea
          id="scope-describe"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. compare a 250g coffee bag in mono-PE recyclable vs paper-based for Cobbs; or upload a TDS and we'll extract the spec for you"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base h-32 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
        />

        {/* Inline suggestions when a query matches existing reports. */}
        {searchResults.length > 0 && (
          <div className="mt-4 p-3 bg-tack-50 border border-tack-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-tack-700">
              <LibraryIcon size={13} />
              We may have something close — start from one of these and tweak?
            </div>
            <div className="space-y-2">
              {searchResults.map((r) => (
                <SimilarReportCard
                  key={`${r.source}-${r.id}`}
                  result={r}
                  onPick={() => handleCloneFrom(r.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || description.trim().length < 5}
            className="flex-1 scope-purple text-white py-3 rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Generating… (≈15–25s)"
              : "Generate from description →"}
          </button>
        </div>
        <TdsUploadField file={tdsFile} onChange={setTdsFile} />
        {error && (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        )}

        {description.trim().length < 4 && (
          <>
            <p className="text-xs text-slate-500 mt-5 mb-2">
              Or start from one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDescription(s)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-full text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Secondary — structured catalog (collapsed by default) */}
      <div className="bg-white border border-slate-200 rounded-2xl">
        <button
          type="button"
          onClick={() => setShowCatalog((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              {showCatalog ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Or pick from the structured catalog
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-6">
              40 formats × structures — quick path when you know exactly what
              you&apos;re comparing.
            </p>
          </div>
        </button>
        {showCatalog && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Pack size / contents">
                <Input
                  value={packSize}
                  onChange={setPackSize}
                  placeholder="e.g. 250g coffee"
                />
              </Field>
              <Field label="Customer region">
                <Select value={region} onChange={setRegion}>
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Industry / use case">
              <Input
                value={industry}
                onChange={setIndustry}
                placeholder="e.g. specialty coffee retail"
              />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-700">
                  Options to compare ({options.length})
                </label>
                {options.length < 4 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    + Add option
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {options.map((o, i) => (
                  <OptionPicker
                    key={i}
                    index={i}
                    option={o}
                    removable={options.length > 2}
                    onChange={(patch) => updateOption(i, patch)}
                    onRemove={() => removeOption(i)}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full scope-purple text-white py-3 rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Generating…" : "Generate from catalog →"}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Powered by the Grounded LCA assumption playbook.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SimilarReportCard({
  result,
  onPick,
}: {
  result: SearchResult;
  onPick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-tack-100 rounded-lg hover:border-tack-300 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-400">
            {result.id}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
              result.source === "tenant"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {result.source === "tenant" ? "your team" : "library"}
          </span>
          {result.customer && (
            <span className="text-[10px] text-slate-500">
              · {result.customer}
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-slate-800 truncate">
          {result.title}
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          {result.optionsCount}-way · {result.optionNames.slice(0, 3).join(" vs ")}
        </div>
      </div>
      <button
        type="button"
        onClick={onPick}
        className="text-xs font-semibold px-3 py-1.5 bg-tack-600 text-white rounded-md hover:bg-tack-700 whitespace-nowrap"
      >
        Start from this →
      </button>
    </div>
  );
}

function TdsUploadField({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="mt-3">
      <label className="flex items-center justify-between gap-3 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50">
        <span className="flex items-center gap-2 text-xs text-slate-600">
          <FileUp size={14} className="text-slate-400" />
          {file ? (
            <span className="font-medium text-slate-800">{file.name}</span>
          ) : (
            <span>
              Upload TDS (PDF / image, ≤10MB) — Claude extracts the
              substrate spec into the review step
            </span>
          )}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
          live
        </span>
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] text-slate-500 hover:text-rose-600 mt-1"
        >
          Remove file
        </button>
      )}
    </div>
  );
}

function OptionPicker({
  index,
  option,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  option: StructuredOption;
  removable: boolean;
  onChange: (patch: Partial<StructuredOption>) => void;
  onRemove: () => void;
}) {
  const fmt = getFormat(option.formatId);
  const struct = option.structureId ? getStructure(option.formatId, option.structureId) : null;
  const label = String.fromCharCode(65 + index);
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Option {label}
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-rose-600"
            aria-label="Remove option"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="space-y-2">
        <Select
          value={option.formatId}
          onChange={(v) => onChange({ formatId: v })}
        >
          <option value="">Pick a format…</option>
          {FORMAT_CATEGORIES.map((cat) => (
            <optgroup key={cat} label={cat}>
              {FORMATS.filter((f) => f.category === cat).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                  {f.typicalSize ? ` (${f.typicalSize})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        <Select
          value={option.structureId}
          onChange={(v) => onChange({ structureId: v })}
          disabled={!fmt}
        >
          <option value="">
            {fmt ? "Pick a structure…" : "Pick a format first"}
          </option>
          {fmt?.structures.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — {s.weight_per_unit_g}g
            </option>
          ))}
        </Select>

        {struct && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="whitespace-nowrap">Weight override (g):</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={option.weightOverride}
              onChange={(e) => onChange({ weightOverride: e.target.value })}
              placeholder={`${struct.weight_per_unit_g}`}
              className="w-24 px-2 py-1 border border-slate-200 rounded text-xs"
            />
            <span className="text-[10px] text-slate-400">
              default {struct.weight_per_unit_g}g
              {struct.default_eol ? ` · EOL ${struct.default_eol}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BuilderResultView({
  data,
  onReset,
}: {
  data: BuildResponse;
  onReset: () => void;
}) {
  const { report: rawReport, meta, trace } = data;
  const [boundary, setBoundary] = useState<CarbonBoundary>("grave");
  const stagesAvailable = hasStages(rawReport);
  const effectiveBoundary = stagesAvailable ? boundary : "grave";
  const report = applyBoundary(rawReport, effectiveBoundary);
  const best = bestOption(report.options, "carbonKg");
  const worst = bestOption(report.options, "carbonKg", false);
  const bestMCI = bestOption(report.options, "mci", false);
  const savings = Math.max(0, worst.val - best.val);
  const delta = carbonDeltaPct(report.options);
  const optionColsClass =
    report.options.length >= 3
      ? "grid-cols-1 md:grid-cols-3"
      : report.options.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";
  const supporting = ALL_SECTIONS.filter((s) => s !== meta.primarySection);

  return (
    <div id="scope-build-result">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-slate-600 hover:text-indigo-600"
        >
          ← Build another
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-mono">{report.id}</span>
        <span className={`chip ${focusClassForArea(report.focusArea)}`}>
          {report.focusArea}
        </span>
        <span className="chip bg-slate-100 text-slate-600">
          {report.comparisonType}
        </span>
        <div className="flex-1" />
        <BoundaryToggle
          value={effectiveBoundary}
          onChange={setBoundary}
          disabled={!stagesAvailable}
          disabledReason="This report doesn't carry per-stage breakdown — cradle-to-grave only."
        />
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {report.confidence.charAt(0).toUpperCase() +
            report.confidence.slice(1)}{" "}
          confidence
        </div>
      </div>

      <section className="fade-in">
        <Lede report={report} meta={meta} />
        <div className={`grid gap-4 ${optionColsClass} mb-10`}>
          {report.options.map((o: Option, i: number) => (
            <OptionCard
              key={`${o.name}-${i}`}
              option={o}
              isBestCarbon={i === best.idx && report.options.length > 1}
              isWorstCarbon={
                i === worst.idx &&
                report.options.length > 1 &&
                best.idx !== worst.idx
              }
              isBestMCI={i === bestMCI.idx && report.options.length > 1}
            />
          ))}
        </div>
        <Equivalencies
          savingsKg={savings}
          bestName={report.options[best.idx]?.name ?? ""}
          worstName={report.options[worst.idx]?.name ?? ""}
          pct={delta}
        />
      </section>

      <section
        className="py-10 mt-6 fade-in"
        style={{
          background: "linear-gradient(180deg, white 0%, #FAFBFC 100%)",
        }}
      >
        <PrimarySection report={report} meta={meta} />
      </section>

      <section className="py-10 fade-in">
        <h2 className="text-2xl font-bold mb-1">The complete picture</h2>
        <p className="text-slate-600 mb-8 max-w-2xl">
          The data behind the headline — every relevant metric for this
          comparison.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {supporting.map((section) => (
            <SupportingCard
              key={section}
              section={section}
              options={report.options}
            />
          ))}
        </div>
        <Recommendation report={report} meta={meta} />
      </section>

      {trace && trace.warnings.length > 0 && (
        <div className="my-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <div className="font-semibold mb-1">
            Parser warnings ({trace.warnings.length})
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {trace.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    />
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
    >
      {children}
    </select>
  );
}
