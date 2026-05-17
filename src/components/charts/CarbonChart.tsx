"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import type { CarbonBoundary, Option } from "@/lib/types";

// chart.js v4 + react-chartjs-2 v5 doesn't auto-register the controller.
ChartJS.register(BarController, CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

interface Props {
  options: Option[];
  /** When supplied, stages excluded by the boundary render as muted bars
   * (still visible so users see what's being excluded). Defaults to grave. */
  boundary?: CarbonBoundary;
}

// Fallback when an option has no stage breakdown (legacy data path).
const FALLBACK_SHARES = { raw: 0.45, manufacturing: 0.25, logistics: 0.12, eol: 0.18 };

interface Stage {
  key: "raw" | "manufacturing" | "logistics" | "eol";
  label: string;
  color: string;
  mutedColor: string;
  inGate: boolean;
}

const STAGES: Stage[] = [
  { key: "raw",           label: "Raw materials", color: "#1F66FF", mutedColor: "#C7D9FF", inGate: true },
  { key: "manufacturing", label: "Manufacturing", color: "#4FA5C2", mutedColor: "#D2E6EC", inGate: true },
  { key: "logistics",     label: "Logistics",     color: "#85C5A8", mutedColor: "#DBEBE2", inGate: false },
  { key: "eol",           label: "End-of-life",   color: "#E0A95C", mutedColor: "#F2DFC2", inGate: false },
];

function stageKg(o: Option, key: Stage["key"]): number {
  if (o.stages) {
    return key === "raw"
      ? o.stages.rawMaterialsKg
      : key === "manufacturing"
        ? o.stages.manufacturingKg
        : key === "logistics"
          ? o.stages.logisticsKg
          : o.stages.endOfLifeKg;
  }
  // Legacy path — split carbonKg by the standard heuristic.
  return Math.round(o.carbonKg * FALLBACK_SHARES[key]);
}

export default function CarbonChart({ options, boundary = "grave" }: Props) {
  const labels = options.map((o) => o.name);
  const datasets = STAGES.map((s) => {
    const active = boundary === "grave" || s.inGate;
    return {
      label: s.label + (active ? "" : " (excluded)"),
      data: options.map((o) => stageKg(o, s.key)),
      backgroundColor: active ? s.color : s.mutedColor,
      stack: "carbon",
    };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-1">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Annual carbon footprint — kg CO₂-eq
        </h4>
        <span className="text-[11px] text-slate-500">
          Stacked by lifecycle stage · {boundary === "gate" ? "muted bars excluded from gate total" : "all stages included"}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Hover any bar for the per-stage kg.
      </p>
      {/* Explicit-height parent — chart.js with maintainAspectRatio:false
          inherits sizing from its parent, so without this the canvas
          collapses to 0px and the chart appears blank. */}
      <div style={{ position: "relative", height: 320 }}>
        <Bar
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: { mode: "index", intersect: false },
            },
            scales: { x: { stacked: true }, y: { stacked: true } },
          }}
        />
      </div>
    </div>
  );
}
