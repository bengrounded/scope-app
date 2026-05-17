import type { Option } from "@/lib/types";
import { fmt, fossilBadge } from "@/lib/scoring";
import Tooltip from "./Tooltip";

interface Props {
  option: Option;
  isBestCarbon: boolean;
  isWorstCarbon: boolean;
  isBestMCI: boolean;
}

export default function OptionCard({
  option,
  isBestCarbon,
  isWorstCarbon,
  isBestMCI,
}: Props) {
  const fossil = fossilBadge(option.fossilPct);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3 gap-3">
        <h3 className="text-base font-semibold leading-snug">{option.name}</h3>
        <div className="flex flex-col gap-1 items-end">
          {isBestCarbon && <span className="chip pill-best whitespace-nowrap">Best on carbon</span>}
          {isWorstCarbon && <span className="chip pill-worst whitespace-nowrap">Worst on carbon</span>}
          {isBestMCI && <span className="chip pill-best whitespace-nowrap">Most circular</span>}
        </div>
      </div>

      {/* Fossil reliance promoted to a top-of-card badge — primary signal
          for sustainability decisions, easy to scan against other options. */}
      <div
        className={`inline-flex items-center gap-1.5 self-start text-[11px] font-medium px-2 py-1 rounded-full border mb-3 ${fossil.className}`}
        title={`${option.fossilPct}% of material content is virgin fossil-derived`}
      >
        <span className="font-semibold">{option.fossilPct}%</span>
        <span>fossil-derived</span>
      </div>

      {option.structure && (
        <p className="text-xs text-slate-500 mb-4 leading-snug">{option.structure}</p>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Carbon</dt>
          <dd className="font-semibold">
            <Tooltip assumption="carbon">{fmt(option.carbonKg)} kg</Tooltip>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">MCI</dt>
          <dd className="font-semibold">
            <Tooltip assumption="mci">{option.mci}/100</Tooltip>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Weight</dt>
          <dd className="font-semibold">
            <Tooltip assumption="weight">{option.weight}g</Tooltip>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Recycled · Renewable</dt>
          <dd className="font-semibold text-sm">
            <Tooltip assumption="recycledPct">{option.recycledPct}%</Tooltip>
            <span className="text-slate-400 mx-1">·</span>
            <Tooltip assumption="renewablePct">{option.renewablePct}%</Tooltip>
          </dd>
        </div>
      </dl>
      <div className="mt-auto text-xs text-slate-500 border-t border-slate-100 pt-3">
        EOL: {option.eol}
      </div>
    </div>
  );
}
