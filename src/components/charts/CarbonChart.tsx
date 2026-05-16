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
import type { Option } from "@/lib/types";

// chart.js v4 + react-chartjs-2 v5 doesn't auto-register the controller.
ChartJS.register(BarController, CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

interface Props {
  options: Option[];
}

// Phase 1: deterministic stage breakdown using fixed proportions so charts
// render without a backend. Engineer will replace with real stage results
// from the compute engine.
const STAGE_SHARES = {
  raw: 0.45,
  manufacturing: 0.25,
  logistics: 0.12,
  eol: 0.18,
};

const STAGE_COLOURS = ["#4F46E5", "#8B5CF6", "#0EA5E9", "#F59E0B"];

export default function CarbonChart({ options }: Props) {
  const labels = options.map((o) => o.name);
  const datasets = [
    { label: "Raw materials", share: STAGE_SHARES.raw, color: STAGE_COLOURS[0] },
    { label: "Manufacturing", share: STAGE_SHARES.manufacturing, color: STAGE_COLOURS[1] },
    { label: "Logistics", share: STAGE_SHARES.logistics, color: STAGE_COLOURS[2] },
    { label: "End-of-life", share: STAGE_SHARES.eol, color: STAGE_COLOURS[3] },
  ].map((d) => ({
    label: d.label,
    data: options.map((o) => Math.round(o.carbonKg * d.share)),
    backgroundColor: d.color,
    stack: "carbon",
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Annual carbon footprint — kg CO₂-eq
      </h4>
      <p className="text-xs text-slate-500 mb-6">Stacked by lifecycle stage</p>
      {/* Explicit-height parent — chart.js with maintainAspectRatio:false
          inherits sizing from its parent, so without this the canvas
          collapses to 0px and the chart appears blank. */}
      <div style={{ position: "relative", height: 280 }}>
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
      <p className="text-[10px] text-slate-400 mt-3">
        Stage breakdown shown with default Grounded engine v3.0 splits. Real per-option breakdowns return once the compute engine is wired.
      </p>
    </div>
  );
}
