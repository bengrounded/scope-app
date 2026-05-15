import type { Report, ReportMeta } from "@/lib/types";
import { bestOption, fmt, carbonDeltaPct, weightDeltaPct } from "@/lib/scoring";
import Tooltip from "./Tooltip";

interface Props {
  report: Report;
  meta: ReportMeta;
}

export default function Lede({ report, meta }: Props) {
  const lowCarbon = bestOption(report.options, "carbonKg");
  const highMCI = bestOption(report.options, "mci", false);
  const lightest = bestOption(report.options, "weight");
  const carbonDelta = carbonDeltaPct(report.options);
  const weightDelta = weightDeltaPct(report.options);
  const winnersAlign =
    lowCarbon.idx === highMCI.idx && lowCarbon.idx === lightest.idx;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-slate-500">Report</span>
        <span className="text-slate-300">·</span>
        <span className="font-mono text-slate-400">{report.id}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight max-w-3xl">
        {report.title}
      </h1>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-4 max-w-3xl">
        <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-indigo-100">
          Key takeaway
        </p>
        <p className="text-xl font-semibold leading-snug">{meta.keyFinding}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 max-w-3xl">
        <div className="bg-white border border-indigo-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-2">
            Lowest carbon
          </p>
          <p className="text-base font-bold mb-0.5 leading-snug">
            {report.options[lowCarbon.idx]?.name}
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            <Tooltip assumption="carbon">{fmt(lowCarbon.val)} kg CO₂</Tooltip> · −{carbonDelta}% vs worst
          </p>
        </div>
        <div className="bg-white border border-indigo-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-2">
            Highest circularity
          </p>
          <p className="text-base font-bold mb-0.5 leading-snug">
            {report.options[highMCI.idx]?.name}
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            <Tooltip assumption="mci">MCI {highMCI.val}/100</Tooltip>
          </p>
        </div>
        <div className="bg-white border border-indigo-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-2">
            Lightest material
          </p>
          <p className="text-base font-bold mb-0.5 leading-snug">
            {report.options[lightest.idx]?.name}
          </p>
          <p className="text-xs text-emerald-700 font-medium">
            <Tooltip assumption="weight">{lightest.val}g per unit</Tooltip> · −{weightDelta}% lighter
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4 max-w-3xl italic">
        {winnersAlign
          ? "All three lenses point to the same winner. This is a strong-signal comparison."
          : "Different lenses point to different winners — see supporting sections for the full trade-off picture."}
      </p>

      <p className="text-slate-700 text-base leading-relaxed max-w-3xl mb-5">{meta.context}</p>

      <div className="text-xs text-slate-500 flex flex-wrap gap-4 pb-2">
        <span>Pack: {report.packSize || "—"}</span>
        <span>Industry: {report.industry || "—"}</span>
        <span>
          <Tooltip assumption="annualVolume">{fmt(report.annualVolume)} units / year</Tooltip>
        </span>
        <span>Confidence: {report.confidence}</span>
      </div>
    </div>
  );
}
