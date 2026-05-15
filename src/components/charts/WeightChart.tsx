"use client";

import type { Option } from "@/lib/types";
import { fmt, bestOption } from "@/lib/scoring";
import Tooltip from "../Tooltip";

interface Props {
  options: Option[];
  annualVolume: number;
}

export default function WeightChart({ options, annualVolume }: Props) {
  const maxW = Math.max(...options.map((o) => o.weight));
  const lightest = bestOption(options, "weight");
  const carbonBest = bestOption(options, "carbonKg");
  const carbonWorst = bestOption(options, "carbonKg", false);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
        Grams of packaging per unit
      </h4>
      <div className="space-y-5">
        {options.map((o, i) => {
          const isLightest = i === lightest.idx;
          const widthPct = maxW > 0 ? (o.weight / maxW) * 100 : 0;
          const multiple = (o.weight / Math.max(lightest.val, 0.01)).toFixed(1);
          return (
            <div key={`${o.name}-${i}`}>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-700">{o.name}</span>
                  {isLightest ? (
                    <span className="chip pill-best text-[11px]">Lightest</span>
                  ) : (
                    <span className="text-xs text-slate-400">{multiple}× the lightest</span>
                  )}
                </div>
                <span className={`text-xl font-bold ${isLightest ? "text-emerald-600" : "text-slate-800"}`}>
                  <Tooltip assumption="weight">{fmt(o.weight)}g</Tooltip>
                </span>
              </div>
              <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${isLightest ? "bg-emerald-500" : "bg-slate-400"} rounded-lg flex items-center px-3 text-white text-xs font-medium`}
                  style={{ width: `${widthPct}%`, minWidth: 30 }}
                >
                  {widthPct > 12 ? `${fmt(o.weight)}g` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Annual material saved</p>
          <p className="text-lg font-bold text-emerald-600">
            {fmt(Math.round(((maxW - lightest.val) * annualVolume) / 1000))} kg
          </p>
          <p className="text-xs text-slate-500">vs heaviest option, across {fmt(annualVolume)} units</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Material reduction</p>
          <p className="text-lg font-bold text-emerald-600">
            {Math.round((1 - lightest.val / Math.max(maxW, 0.01)) * 100)}%
          </p>
          <p className="text-xs text-slate-500">lighter than the heaviest option</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Linked to carbon</p>
          <p className="text-lg font-bold text-slate-700">
            {Math.round((1 - carbonBest.val / Math.max(carbonWorst.val, 0.01)) * 100)}%
          </p>
          <p className="text-xs text-slate-500">of carbon savings flow from weight</p>
        </div>
      </div>
    </div>
  );
}
