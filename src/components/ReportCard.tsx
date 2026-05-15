import Link from "next/link";
import type { Report } from "@/lib/types";
import { carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  const delta = carbonDeltaPct(report.options);
  return (
    <Link
      href={`/reports/${report.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-5 hover-lift"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`chip ${focusClassForArea(report.focusArea)}`}>{report.focusArea}</span>
        <span className="text-xs text-slate-400 font-mono">{report.id}</span>
      </div>
      <h3 className="text-base font-semibold mb-2 leading-snug line-clamp-3">{report.title}</h3>
      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{report.summary}</p>
      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Carbon delta</p>
          <p className="font-bold text-emerald-600">−{delta}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Options</p>
          <p className="font-medium text-slate-700">{report.options.length}-way</p>
        </div>
      </div>
    </Link>
  );
}
