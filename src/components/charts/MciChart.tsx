"use client";

import type { Option } from "@/lib/types";
import Tooltip from "../Tooltip";

interface Props {
  options: Option[];
}

export default function MciChart({ options }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Material Circularity Index
      </h4>
      <p className="text-xs text-slate-500 mb-6">
        Per the Ellen MacArthur Foundation methodology — combining recycled/renewable content, utility, and end-of-life recovery probability
      </p>
      <div className={`grid grid-cols-1 md:grid-cols-${options.length} gap-6`}>
        {options.map((o, i) => (
          <div key={`${o.name}-${i}`} className="text-center">
            <h5 className="text-sm font-semibold mb-3">{o.name}</h5>
            <div
              className="relative mx-auto rounded-full flex items-center justify-center"
              style={{
                width: 140,
                height: 140,
                background: `conic-gradient(#6366F1 ${o.mci * 3.6}deg, #E2E8F0 0deg)`,
              }}
            >
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">
                    <Tooltip assumption="mci">{o.mci}</Tooltip>
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">MCI / 100</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
