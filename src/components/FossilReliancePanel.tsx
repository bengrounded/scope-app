import type { Option } from "@/lib/types";
import { bestOption, fossilBadge, fossilDeltaPct } from "@/lib/scoring";

interface Props {
  options: Option[];
}

/** Surface fossil-fuel reliance as a headline signal whenever there's a
 * meaningful spread across the options (>=20 percentage points between
 * the most and least fossil-derived). Mirrors the Equivalencies panel
 * pattern but for material composition rather than carbon. */
export default function FossilReliancePanel({ options }: Props) {
  if (options.length < 2) return null;
  const delta = fossilDeltaPct(options);
  if (delta < 20) return null;

  const least = bestOption(options, "fossilPct");
  const most = bestOption(options, "fossilPct", false);
  const leastOpt = options[least.idx];
  const mostOpt = options[most.idx];

  const renewableShift =
    leastOpt.renewablePct > mostOpt.renewablePct
      ? `${leastOpt.renewablePct - mostOpt.renewablePct}pp more renewable content`
      : null;
  const recycledShift =
    leastOpt.recycledPct > mostOpt.recycledPct
      ? `${leastOpt.recycledPct - mostOpt.recycledPct}pp more recycled content`
      : null;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 mt-4">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Fossil-fuel reliance
        </p>
        <span
          className={`text-[11px] font-medium px-2 py-1 rounded-full border ${fossilBadge(mostOpt.fossilPct).className}`}
        >
          worst: {mostOpt.fossilPct}%
        </span>
      </div>
      <p className="text-2xl font-bold leading-tight mb-1">
        <span className="text-emerald-400">{leastOpt.name}</span> cuts
        fossil-derived material to{" "}
        <span className="text-emerald-400">{leastOpt.fossilPct}%</span> vs{" "}
        {mostOpt.fossilPct}% for {mostOpt.name}.
      </p>
      <p className="text-sm text-slate-300 leading-relaxed">
        {delta} percentage points less reliance on virgin fossil feedstocks
        {renewableShift && ` — driven by ${renewableShift}`}
        {recycledShift && `${renewableShift ? " plus" : " — driven by"} ${recycledShift}`}
        .
      </p>
    </div>
  );
}
