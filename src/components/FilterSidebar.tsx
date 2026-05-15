"use client";

import { FOCUS_AREAS, COMPARISON_TYPES } from "@/lib/reports";

interface Props {
  focusAreas: string[];
  comparisonTypes: string[];
  search: string;
  onToggleFocus: (area: string) => void;
  onToggleComparison: (type: string) => void;
  onClear: () => void;
}

export default function FilterSidebar({
  focusAreas,
  comparisonTypes,
  search,
  onToggleFocus,
  onToggleComparison,
  onClear,
}: Props) {
  const hasFilters = focusAreas.length > 0 || comparisonTypes.length > 0 || search.length > 0;
  return (
    <aside className="col-span-12 md:col-span-3">
      <div className="md:sticky md:top-24">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Focus area
        </h3>
        <div className="flex flex-col gap-1.5 mb-6">
          {FOCUS_AREAS.map((fa) => (
            <button
              key={fa}
              type="button"
              onClick={() => onToggleFocus(fa)}
              className={`filter-chip ${focusAreas.includes(fa) ? "active" : ""}`}
            >
              {fa}
            </button>
          ))}
        </div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Comparison type
        </h3>
        <div className="flex flex-col gap-1.5">
          {COMPARISON_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => onToggleComparison(ct)}
              className={`filter-chip ${comparisonTypes.includes(ct) ? "active" : ""}`}
            >
              {ct}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="mt-4 text-xs text-indigo-600 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </aside>
  );
}
