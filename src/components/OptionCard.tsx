import type { Option } from "@/lib/types";
import { fmt } from "@/lib/scoring";
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
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Virgin fossil</dt>
          <dd className="font-semibold">
            <Tooltip assumption="fossilPct">{option.fossilPct}%</Tooltip>
          </dd>
        </div>
      </dl>
      <div className="mt-auto text-xs text-slate-500 border-t border-slate-100 pt-3">
        EOL: {option.eol}
      </div>
    </div>
  );
}
