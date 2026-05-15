import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport, getMetaOrDefault, getAllReports } from "@/lib/reports";
import { bestOption, fmt, carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";
import Lede from "@/components/Lede";
import OptionCard from "@/components/OptionCard";
import Equivalencies from "@/components/Equivalencies";
import PrimarySection from "@/components/PrimarySection";
import SupportingCard from "@/components/SupportingCard";
import Recommendation from "@/components/Recommendation";
import type { PrimarySection as PrimarySectionType } from "@/lib/types";

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return getAllReports().map((r) => ({ id: r.id }));
}

export function generateMetadata({ params }: PageProps) {
  const r = getReport(params.id);
  return { title: r ? `${r.id} — ${r.title}` : "Report — Scope" };
}

const ALL_SECTIONS: PrimarySectionType[] = ["weight", "carbon", "composition", "eol", "circularity"];

export default function ReportPage({ params }: PageProps) {
  const report = getReport(params.id);
  if (!report) return notFound();
  const meta = getMetaOrDefault(report);
  const best = bestOption(report.options, "carbonKg");
  const worst = bestOption(report.options, "carbonKg", false);
  const bestMCI = bestOption(report.options, "mci", false);
  const savings = Math.max(0, worst.val - best.val);
  const delta = carbonDeltaPct(report.options);
  const optionColsClass =
    report.options.length === 3
      ? "grid-cols-1 md:grid-cols-3"
      : report.options.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";
  const supporting = ALL_SECTIONS.filter((s) => s !== meta.primarySection);

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 sticky top-[60px] z-30 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          <Link href="/library" className="text-sm text-slate-600 hover:text-indigo-600">
            ← Back to library
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-mono">{report.id}</span>
          <span className={`chip ${focusClassForArea(report.focusArea)}`}>{report.focusArea}</span>
          <span className="chip bg-slate-100 text-slate-600">{report.comparisonType}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={`w-2 h-2 rounded-full ${
                report.confidence === "high"
                  ? "bg-emerald-500"
                  : report.confidence === "medium"
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
            {report.confidence.charAt(0).toUpperCase() + report.confidence.slice(1)} confidence
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-10 fade-in">
        <Lede report={report} meta={meta} />
        <div className={`grid gap-4 ${optionColsClass} mb-10`}>
          {report.options.map((o, i) => (
            <OptionCard
              key={`${o.name}-${i}`}
              option={o}
              isBestCarbon={i === best.idx && report.options.length > 1}
              isWorstCarbon={i === worst.idx && report.options.length > 1 && best.idx !== worst.idx}
              isBestMCI={i === bestMCI.idx && report.options.length > 1}
            />
          ))}
        </div>
        <Equivalencies
          savingsKg={savings}
          bestName={report.options[best.idx]?.name ?? ""}
          worstName={report.options[worst.idx]?.name ?? ""}
          pct={delta}
        />
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-10 fade-in" style={{ background: "linear-gradient(180deg, white 0%, #FAFBFC 100%)" }}>
        <PrimarySection report={report} meta={meta} />
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-10 fade-in">
        <h2 className="text-2xl font-bold mb-1">The complete picture</h2>
        <p className="text-slate-600 mb-8 max-w-2xl">
          The data behind the headline — every relevant metric for this comparison.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {supporting.map((section) => (
            <SupportingCard key={section} section={section} options={report.options} />
          ))}
        </div>
        <Recommendation report={report} meta={meta} />
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div>
            Generated using Grounded Scope · v3.0 engine · ISO 14040/14044 · Ellen MacArthur MCI
          </div>
          <div>Hover any value for source and confidence</div>
        </div>
      </footer>
    </div>
  );
}
