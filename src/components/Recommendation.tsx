import type { Report, ReportMeta } from "@/lib/types";
import { bestOption, fmt, carbonDeltaPct } from "@/lib/scoring";

interface Props {
  report: Report;
  meta: ReportMeta;
}

export default function Recommendation({ report, meta }: Props) {
  const best = bestOption(report.options, "carbonKg");
  const worst = bestOption(report.options, "carbonKg", false);
  const bestOpt = report.options[best.idx];
  const savings = worst.val - best.val;
  const delta = carbonDeltaPct(report.options);

  return (
    <div className="mt-10 rounded-2xl text-white p-8 md:p-10 bg-gradient-to-br from-indigo-600 to-purple-600">
      <p className="text-xs uppercase tracking-wider text-indigo-100 font-semibold mb-3">
        Scope recommendation
      </p>
      <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">
        Switch to {bestOpt?.name} to cut carbon by {delta}%.
      </h3>
      <p className="text-indigo-100 max-w-2xl text-base leading-relaxed">
        At {fmt(report.annualVolume)} units / year, that&apos;s {fmt(Math.round(savings))} kg
        CO₂ saved annually versus the worst-performing option. {meta.keyFinding}
      </p>
    </div>
  );
}
