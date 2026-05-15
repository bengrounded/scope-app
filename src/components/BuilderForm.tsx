"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function BuilderForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("");
  const [packSize, setPackSize] = useState("");
  const [industry, setIndustry] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          packSize,
          industry,
          region,
          options: [
            { format, material: optionA },
            { format, material: optionB },
            optionC ? { format, material: optionC } : undefined,
          ].filter((o): o is { format: string; material: string } => Boolean(o?.material)),
        }),
      });
      if (!res.ok) throw new Error(`Compute failed: ${res.status}`);
      const data = (await res.json()) as { reportId?: string };
      if (!data.reportId) throw new Error("No report id returned");
      router.push(`/reports/${data.reportId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
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
          {submitting ? "Generating…" : "Generate report →"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <p className="text-xs text-slate-500 mt-3 text-center">
          Uses Grounded&apos;s assumption playbook. Tooltips show every value&apos;s source.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1.5 block">{label}</label>
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
