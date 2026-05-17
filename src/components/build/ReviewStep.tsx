"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  FORMATS,
  FORMAT_CATEGORIES,
  getFormat,
  type FormatSpec,
  type StructureSpec,
} from "@/lib/formats";
import type {
  LibraryCatalog,
  ParsedOption,
  ParsedReport,
} from "@/lib/types";

interface Props {
  parsed: ParsedReport;
  library: LibraryCatalog;
  warnings: string[];
  composing: boolean;
  error: string | null;
  customer: string;
  customerSuggestions: string[];
  onChange: (next: ParsedReport) => void;
  onCustomerChange: (v: string) => void;
  onCompose: () => void;
  onBack: () => void;
}

/** Fuzzy match a parser-emitted format label to a catalog entry. */
function matchCatalogFormat(formatLabel: string): FormatSpec | undefined {
  const lc = formatLabel.toLowerCase().trim();
  if (!lc) return undefined;
  return (
    FORMATS.find((f) => f.label.toLowerCase() === lc) ||
    FORMATS.find((f) => f.label.toLowerCase().includes(lc)) ||
    FORMATS.find((f) => lc.includes(f.label.toLowerCase()))
  );
}

export default function ReviewStep({
  parsed,
  library,
  warnings,
  composing,
  error,
  customer,
  customerSuggestions,
  onChange,
  onCustomerChange,
  onCompose,
  onBack,
}: Props) {
  function setOption(idx: number, patch: Partial<ParsedOption>) {
    onChange({
      ...parsed,
      options: parsed.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    });
  }
  function removeOption(idx: number) {
    if (parsed.options.length <= 2) return;
    onChange({
      ...parsed,
      options: parsed.options.filter((_, i) => i !== idx),
    });
  }
  function addOption() {
    if (parsed.options.length >= 4) return;
    const seed = parsed.options[0];
    onChange({
      ...parsed,
      options: [
        ...parsed.options,
        {
          ...seed,
          name: `Option ${String.fromCharCode(65 + parsed.options.length)}`,
          display_material: "",
        },
      ],
    });
  }

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-600 hover:text-indigo-600"
        >
          ← Edit query
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">
          Step 2 of 2 — Review
        </span>
      </div>

      <h2 className="text-2xl font-bold mb-1">Confirm what we&apos;re comparing</h2>
      <p className="text-slate-600 mb-6 max-w-2xl">
        We picked the structures most commonly used for this brief. Tweak any
        field, swap in an alternative structure, or add another option. The
        report runs once you click <strong>Generate</strong>.
      </p>

      {warnings.length > 0 && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <div className="font-semibold mb-1">Parser warnings ({warnings.length})</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Report-level fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700 mb-1.5 block">Title</label>
          <input
            type="text"
            value={parsed.title}
            onChange={(e) => onChange({ ...parsed, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Customer / brand (optional)">
            <input
              type="text"
              list="scope-customer-suggestions"
              value={customer}
              onChange={(e) => onCustomerChange(e.target.value)}
              placeholder="e.g. Cobbs, Vitasoy, internal R&D"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
            <datalist id="scope-customer-suggestions">
              {customerSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <TextField
            label="Industry"
            value={parsed.industry}
            onChange={(v) => onChange({ ...parsed, industry: v })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumberField
            label="Annual units"
            value={parsed.annual_units}
            onChange={(v) => onChange({ ...parsed, annual_units: v })}
            step={1000}
          />
          <TextField
            label="Region"
            value={parsed.region}
            onChange={(v) => onChange({ ...parsed, region: v })}
          />
          <TextField
            label="Pack size"
            value={parsed.pack_size}
            onChange={(v) => onChange({ ...parsed, pack_size: v })}
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4 mb-6">
        {parsed.options.map((o, i) => (
          <OptionEditor
            key={i}
            index={i}
            option={o}
            library={library}
            removable={parsed.options.length > 2}
            onChange={(patch) => setOption(i, patch)}
            onRemove={() => removeOption(i)}
          />
        ))}
        {parsed.options.length < 4 && (
          <button
            type="button"
            onClick={addOption}
            className="w-full px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-700"
          >
            + Add another option
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onCompose}
          disabled={composing || parsed.options.length < 2}
          className="flex-1 scope-purple text-white py-3 rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {composing ? "Generating report… (≈10–15s)" : "Generate report →"}
        </button>
      </div>
    </div>
  );
}

function OptionEditor({
  index,
  option,
  library,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  option: ParsedOption;
  library: LibraryCatalog;
  removable: boolean;
  onChange: (patch: Partial<ParsedOption>) => void;
  onRemove: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const label = String.fromCharCode(65 + index);
  const matched = matchCatalogFormat(option.format);

  function applyStructure(structure: StructureSpec) {
    const patch: Partial<ParsedOption> = {
      weight_per_unit_g: structure.weight_per_unit_g,
      display_material: structure.label,
      display_structure: structure.description ?? "",
    };
    if (structure.default_eol) patch.eol_pathway = structure.default_eol;
    if (structure.recycled_content_pct !== undefined) {
      patch.recycled_content_pct = structure.recycled_content_pct;
    }
    onChange(patch);
  }

  function applyFormat(formatId: string) {
    const fmt = getFormat(formatId);
    if (!fmt) {
      onChange({ format: "" });
      return;
    }
    const first = fmt.structures[0];
    onChange({
      format: fmt.label,
      weight_per_unit_g: first?.weight_per_unit_g ?? option.weight_per_unit_g,
      display_material: first?.label ?? option.display_material,
      display_structure: first?.description ?? "",
      eol_pathway: first?.default_eol ?? option.eol_pathway,
      recycled_content_pct:
        first?.recycled_content_pct ?? option.recycled_content_pct ?? 0,
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full scope-purple text-white text-xs font-semibold flex items-center justify-center">
            {label}
          </span>
          <input
            type="text"
            value={option.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="text-base font-semibold border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none px-1 py-0.5 min-w-[200px]"
            placeholder="Option name"
          />
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-rose-600"
            aria-label="Remove option"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Format + structure picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Format">
          <select
            value={matched?.id ?? ""}
            onChange={(e) => applyFormat(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="">{option.format ? `${option.format} (custom)` : "Pick a format…"}</option>
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
          </select>
        </Field>
        <NumberField
          label="Weight per unit (g)"
          value={option.weight_per_unit_g}
          onChange={(v) => onChange({ weight_per_unit_g: v })}
          step={0.1}
        />
      </div>

      {/* Alternative structure chips when we know the format */}
      {matched && (
        <div>
          <div className="text-xs text-slate-600 mb-1.5">
            Common structures for {matched.label} — click to swap
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matched.structures.map((s) => {
              const active = s.label === option.display_material;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyStructure(s)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-700"
                  }`}
                >
                  {s.label} · {s.weight_per_unit_g}g
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Material display + EOL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Material descriptor (display)">
          <input
            type="text"
            value={option.display_material}
            onChange={(e) => onChange({ display_material: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>
        <Field label="End-of-life pathway">
          <select
            value={option.eol_pathway}
            onChange={(e) => onChange({ eol_pathway: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
          >
            {library.eol_pathways.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NumberField
          label="Recycled content %"
          value={option.recycled_content_pct ?? 0}
          onChange={(v) => onChange({ recycled_content_pct: v })}
          step={1}
          max={100}
        />
        <NumberField
          label="Renewable content %"
          value={option.renewable_content_pct ?? 0}
          onChange={(v) => onChange({ renewable_content_pct: v })}
          step={1}
          max={100}
        />
      </div>

      {/* Structure / layer detail */}
      <Field label="Layer / spec detail (optional)">
        <input
          type="text"
          value={option.display_structure ?? ""}
          onChange={(e) => onChange({ display_structure: e.target.value })}
          placeholder="e.g. PET 12u / Al foil 9u / PE 80u"
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
        />
      </Field>

      {/* Advanced — engine identifiers (composition, process, grid) */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700"
        >
          {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Advanced — engine identifiers
        </button>
        {advancedOpen && (
          <div className="mt-2 pt-2 border-t border-slate-100 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-700 mb-1.5">
                Material composition ({option.composition.length})
              </div>
              <div className="space-y-1.5">
                {option.composition.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2 text-xs">
                    <select
                      value={c.material_library_entry}
                      onChange={(e) =>
                        onChange({
                          composition: option.composition.map((cc, cci) =>
                            cci === ci
                              ? { ...cc, material_library_entry: e.target.value }
                              : cc,
                          ),
                        })
                      }
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs bg-white truncate"
                    >
                      {library.materials.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={c.percent}
                      min={0}
                      max={100}
                      onChange={(e) =>
                        onChange({
                          composition: option.composition.map((cc, cci) =>
                            cci === ci
                              ? { ...cc, percent: Number(e.target.value) }
                              : cc,
                          ),
                        })
                      }
                      className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
                    />
                    <span className="text-[10px] text-slate-400">%</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Composition must sum to 100% per option.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Field label="Manufacturing process">
                <select
                  value={option.manufacturing_process}
                  onChange={(e) => onChange({ manufacturing_process: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                >
                  {library.manufacturing_processes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Electricity grid">
                <select
                  value={option.manufacturing_grid}
                  onChange={(e) => onChange({ manufacturing_grid: e.target.value })}
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                >
                  {library.electricity_grids.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}
      </div>
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

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
      />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step ?? 1}
        min={0}
        max={max}
        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
      />
    </Field>
  );
}
