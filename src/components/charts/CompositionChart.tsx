"use client";

import type { Option } from "@/lib/types";
import Tooltip from "../Tooltip";

interface Props {
  options: Option[];
}

export default function CompositionChart({ options }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Material composition
      </h4>
      <p className="text-xs text-slate-500 mb-6">
        Breakdown by recycled, renewable, and virgin fossil content
      </p>
      <div className="space-y-5">
        {options.map((o, i) => {
          const total = Math.max(o.recycledPct + o.renewablePct + o.fossilPct, 1);
          const r = (o.recycledPct / total) * 100;
          const n = (o.renewablePct / total) * 100;
          const f = (o.fossilPct / total) * 100;
          return (
            <div key={`${o.name}-${i}`}>
              <div className="flex flex-wrap items-baseline justify-between mb-2 gap-2">
                <span className="text-sm font-semibold">{o.name}</span>
                <span className="text-xs text-slate-500">
                  {o.recycledPct ? `${o.recycledPct}% recycled` : ""}
                  {o.renewablePct ? ` · ${o.renewablePct}% renewable` : ""}
                  {o.fossilPct ? ` · ${o.fossilPct}% virgin fossil` : ""}
                </span>
              </div>
              <div className="flex h-7 rounded-lg overflow-hidden bg-slate-100">
                {r > 0 && (
                  <div
                    className="bg-sky-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${r}%` }}
                  >
                    {r >= 15 ? `${o.recycledPct}%` : ""}
                  </div>
                )}
                {n > 0 && (
                  <div
                    className="bg-emerald-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${n}%` }}
                  >
                    {n >= 15 ? `${o.renewablePct}%` : ""}
                  </div>
                )}
                {f > 0 && (
                  <div
                    className="bg-stone-500 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${f}%` }}
                  >
                    {f >= 15 ? `${o.fossilPct}%` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-6 text-xs text-slate-600 mt-6 pt-6 border-t border-slate-100">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-sky-500 rounded-sm" />
          <Tooltip assumption="recycledPct">Recycled content</Tooltip>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
          <Tooltip assumption="renewablePct">Renewable content</Tooltip>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-stone-500 rounded-sm" />
          <Tooltip assumption="fossilPct">Virgin fossil fuel</Tooltip>
        </span>
      </div>
    </div>
  );
}
