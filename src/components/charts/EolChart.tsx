"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import type { Option } from "@/lib/types";
import Tooltip from "../Tooltip";

ChartJS.register(ArcElement, ChartTooltip, Legend);

interface Props {
  options: Option[];
}

const COLOURS = ["#10b981", "#a8a29e", "#ef4444", "#f59e0b"];

export default function EolChart({ options }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Where the packaging ends up
      </h4>
      <p className="text-xs text-slate-500 mb-6">
        National recycling and waste-treatment rates per material class (Australia, default)
      </p>
      <div className={`grid grid-cols-1 md:grid-cols-${options.length} gap-6`}>
        {options.map((o, i) => (
          <div key={`${o.name}-${i}`} className="text-center">
            <h5 className="text-sm font-semibold mb-1">{o.name}</h5>
            <p className="text-xs text-slate-500 mb-4">{o.eol}</p>
            <div className="mx-auto" style={{ maxWidth: 220 }}>
              <Doughnut
                data={{
                  labels: ["Recycled", "Composted", "Landfilled", "Incinerated"],
                  datasets: [
                    {
                      data: [
                        o.eolSplit.recycled,
                        o.eolSplit.composted,
                        o.eolSplit.landfilled,
                        o.eolSplit.incinerated,
                      ],
                      backgroundColor: COLOURS,
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: { legend: { display: false } },
                  cutout: "60%",
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs mt-4">
              <div className="flex items-center justify-between p-1.5 bg-emerald-50 rounded">
                <span className="text-slate-600">Recycled</span>
                <span className="font-semibold">
                  <Tooltip assumption="eolPct">{o.eolSplit.recycled}%</Tooltip>
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-stone-50 rounded">
                <span className="text-slate-600">Composted</span>
                <span className="font-semibold">{o.eolSplit.composted}%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-rose-50 rounded">
                <span className="text-slate-600">Landfilled</span>
                <span className="font-semibold">{o.eolSplit.landfilled}%</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-amber-50 rounded">
                <span className="text-slate-600">Incinerated</span>
                <span className="font-semibold">{o.eolSplit.incinerated}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
