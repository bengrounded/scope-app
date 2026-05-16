"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { BuildResponse, Option, PrimarySection as PrimarySectionType } from "@/lib/types";
import { bestOption, carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";
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

export default function BuilderForm() {
  const params = useSearchParams();
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResponse | null>(null);

  useEffect(() => {
    if (params.get("auto") === "1" && description.trim().length > 5) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      // Build the query. NL description always takes priority; structured
      // options append additional precision if present.
      const filledOpts = options.filter((o) => o.formatId);
      const structuredQuery = synthesizeStructuredQuery(filledOpts);
      const contextBits = [
        packSize && `Pack size: ${packSize}`,
        industry && `Industry: ${industry}`,
      ].filter(Boolean) as string[];

      let query = description.trim();
      if (structuredQuery) {
        query = query
          ? `${query}\n\n${structuredQuery}`
          : structuredQuery;
      }
      if (contextBits.length) {
        query = `${query}\n${contextBits.join(". ")}`;
      }
      if (query.length < 5) {
        throw new Error(
          "Describe what to compare, or fill in at least one option in the catalog.",
        );
      }

      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          region: regionFromUI(region),
          packSize: packSize || undefined,
          industry: industry || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Build failed: ${res.status}`);
      }
      const data = (await res.json()) as BuildResponse;
      setResult(data);
      requestAnimationFrame(() =>
        document
          .getElementById("scope-build-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForBuildAnother() {
    setResult(null);
    setError(null);
  }

  if (result) {
    return <BuilderResultView data={result} onReset={resetForBuildAnother} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT — describe it */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Describe it
          </h3>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you want to compare? — describe a scenario, the formats you're weighing up, or anything else worth knowing."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base h-40 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
        />
        <p className="text-xs text-slate-500 mt-2 mb-3">
          Or start from one of these:
        </p>
        <div className="space-y-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDescription(s)}
              className="w-full text-left px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm hover:border-indigo-400 hover:bg-indigo-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — structured */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Or pick from the catalog
          </h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
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
            <p className="text-[11px] text-slate-500 mt-2">
              Don&apos;t see your format? Describe it in the box on the left and
              the parser will resolve it against the full materials library.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full scope-purple text-white py-3 rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Generating… (≈15–25s)" : "Generate report →"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <p className="text-xs text-slate-500 mt-3 text-center">
          Uses Grounded&apos;s assumption playbook. Tooltips show every
          value&apos;s source.
        </p>
      </div>
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
  const { report, meta, trace } = data;
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
