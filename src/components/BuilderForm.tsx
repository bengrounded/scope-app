"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BuildResponse, Option, PrimarySection as PrimarySectionType } from "@/lib/types";
import { bestOption, carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";
import Lede from "./Lede";
import OptionCard from "./OptionCard";
import Equivalencies from "./Equivalencies";
import PrimarySection from "./PrimarySection";
import SupportingCard from "./SupportingCard";
import Recommendation from "./Recommendation";

const SUGGESTIONS = [
  "Compare a refill pouch to a single-use HDPE bottle for shampoo",
  "I want to see vacuum-pack vs MAP tray vs flow-wrap for cheese",
  "Is paper or PCR poly better for a 30x40cm apparel mailer?",
  "Show me the carbon difference between a 12-can multipack and pouches for wet pet food",
  "What's the best refill format for hand wash — SUP, tablet, or BYO?",
];

const FORMATS = [
  "Stand-up pouch (SUP)",
  "Bottle",
  "Jar / Tub",
  "Tray",
  "Mailer",
  "Carton",
  "Flow wrap",
  "Sachet",
  "Capsule",
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

export default function BuilderForm() {
  const params = useSearchParams();
  // URL params pre-fill the form. packGPT deeplinks land here with ?query=…
  // plus optional ?packSize / ?industry / ?region / ?format / ?a / ?b / ?c.
  const [description, setDescription] = useState(params.get("query") ?? "");
  const [format, setFormat] = useState(params.get("format") ?? "");
  const [packSize, setPackSize] = useState(params.get("packSize") ?? "");
  const [industry, setIndustry] = useState(params.get("industry") ?? "");
  const [optionA, setOptionA] = useState(params.get("a") ?? "");
  const [optionB, setOptionB] = useState(params.get("b") ?? "");
  const [optionC, setOptionC] = useState(params.get("c") ?? "");
  const [region, setRegion] = useState(() => {
    const r = params.get("region");
    if (!r) return REGIONS[0];
    return REGIONS.find((x) => x.toLowerCase().startsWith(r.toLowerCase())) ?? REGIONS[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResponse | null>(null);

  // Auto-submit when an inbound link includes ?auto=1 (packGPT chat deeplinks
  // open the report directly, no extra click needed).
  useEffect(() => {
    if (params.get("auto") === "1" && (description || format || optionA)) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      // Synthesize a query from whichever side the user filled in. The
      // structured fields concatenate into a sentence the parser can read.
      const structuredBits = [
        format && `Format: ${format}`,
        packSize && `Pack size: ${packSize}`,
        industry && `Industry: ${industry}`,
        (optionA || optionB || optionC) &&
          `Compare: ${[optionA, optionB, optionC].filter(Boolean).join(" vs ")}`,
      ].filter(Boolean);
      const query =
        description.trim() ||
        structuredBits.join(". ") ||
        "";
      if (query.length < 5) {
        throw new Error("Add a description or fill in the form to compare.");
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
        throw new Error(
          body.detail || body.error || `Build failed: ${res.status}`,
        );
      }
      const data = (await res.json()) as BuildResponse;
      setResult(data);
      // Scroll the result into view.
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
    return (
      <BuilderResultView
        data={result}
        onReset={resetForBuildAnother}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Describe it</h3>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you want to compare?"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-base h-40 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
        />
        <p className="text-xs text-slate-500 mt-2 mb-3">Or start from one of these:</p>
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

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Or fill it in</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <Field label="Pack format">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="">Pick a format…</option>
              {FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Pack size / contents">
            <Input value={packSize} onChange={setPackSize} placeholder="e.g. 250g coffee, 500ml liquid" />
          </Field>
          <Field label="Industry / use case">
            <Input value={industry} onChange={setIndustry} placeholder="e.g. specialty coffee retail" />
          </Field>
          <Field label="Materials to compare (up to 3)">
            <div className="space-y-2">
              <Input value={optionA} onChange={setOptionA} placeholder="Option A — e.g. PET/Al/PE laminate" />
              <Input value={optionB} onChange={setOptionB} placeholder="Option B — e.g. mono-PE recyclable" />
              <Input value={optionC} onChange={setOptionC} placeholder="Option C (optional)" />
            </div>
          </Field>
          <Field label="Customer region (for EOL rates)">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full scope-purple text-white py-3 rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Generating… (≈10-25s)" : "Generate report →"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <p className="text-xs text-slate-500 mt-3 text-center">
          Uses Grounded&apos;s assumption playbook. Tooltips show every value&apos;s source.
        </p>
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
    report.options.length === 3
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
