import type { Report, ReportMeta } from "@/lib/types";
import WeightChart from "./charts/WeightChart";
import CarbonChart from "./charts/CarbonChart";
import EolChart from "./charts/EolChart";
import CompositionChart from "./charts/CompositionChart";
import MciChart from "./charts/MciChart";

interface Props {
  report: Report;
  meta: ReportMeta;
}

export default function PrimarySection({ report, meta }: Props) {
  return (
    <>
      <div className="mb-6 max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-2">The story</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">{meta.primaryTitle}</h2>
        <p className="text-slate-700 text-base leading-relaxed">{meta.primaryWhy}</p>
      </div>
      <PrimaryVisual report={report} meta={meta} />
    </>
  );
}

function PrimaryVisual({ report, meta }: Props) {
  switch (meta.primarySection) {
    case "weight":
      return <WeightChart options={report.options} annualVolume={report.annualVolume} />;
    case "eol":
      return <EolChart options={report.options} />;
    case "composition":
      return <CompositionChart options={report.options} />;
    case "circularity":
      return <MciChart options={report.options} />;
    case "carbon":
    default:
      return <CarbonChart options={report.options} />;
  }
}
