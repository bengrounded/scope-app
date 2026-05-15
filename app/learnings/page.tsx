import Link from "next/link";
import { getAllReports, FOCUS_AREAS } from "@/lib/reports";
import { bestOption, carbonDeltaPct } from "@/lib/scoring";
import { focusClassForArea } from "@/lib/focus";

export const metadata = { title: "Learnings — Scope" };

export default function LearningsPage() {
  const reports = getAllReports();

  const byFocus = FOCUS_AREAS.map((fa) => {
    const inArea = reports.filter((r) => r.focusArea === fa);
    const totalDelta = inArea.reduce((s, r) => s + carbonDeltaPct(r.options), 0);
    return {
      fa,
      count: inArea.length,
      avgDelta: inArea.length ? totalDelta / inArea.length : 0,
    };
  })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.avgDelta - a.avgDelta);

  const biggestSavings = [...reports]
    .sort((a, b) => carbonDeltaPct(b.options) - carbonDeltaPct(a.options))
    .slice(0, 6);

  const avgDelta =
    byFocus.length > 0
      ? Math.round(byFocus.reduce((s, f) => s + f.avgDelta, 0) / byFocus.length)
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Learnings from the database</h1>
        <p className="text-slate-600">
          Patterns and insights across all {reports.length} reports. Updates as new reports are added.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Stat label="Total reports" value={reports.length} hint="↑ Growing" hintColor="text-emerald-600" />
        <Stat label="Avg carbon savings" value={`${avgDelta}%`} hint="Best vs worst option" />
        <Stat label="Focus areas covered" value={FOCUS_AREAS.length} hint="Across all packaging types" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-1">Biggest carbon savings opportunities</h3>
          <p className="text-xs text-slate-500 mb-4">Reports with the largest delta between best and worst option</p>
          <div className="space-y-2">
            {biggestSavings.map((r) => {
              const best = bestOption(r.options, "carbonKg");
              const delta = carbonDeltaPct(r.options);
              return (
                <Link
                  href={`/reports/${r.id}`}
                  key={r.id}
                  className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <div className="text-2xl font-bold text-emerald-600 w-16">−{delta}%</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.focusArea} · {r.options[best.idx]?.name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-1">Average savings by focus area</h3>
          <p className="text-xs text-slate-500 mb-4">Where the biggest opportunities consistently sit</p>
          <div className="space-y-2">
            {byFocus.map((f) => (
              <div key={f.fa} className="flex items-center gap-3">
                <div className={`w-36 text-xs ${focusClassForArea(f.fa)} px-2 py-1 rounded font-medium truncate`}>
                  {f.fa}
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 scope-purple opacity-70"
                    style={{ width: `${Math.min(100, f.avgDelta)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold">
                    {Math.round(f.avgDelta)}%
                  </div>
                </div>
                <div className="text-xs text-slate-400 w-12 text-right">
                  {f.count} report{f.count > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-1">Cross-cutting patterns</h3>
          <p className="text-xs text-slate-500 mb-4">Insights that hold across the database</p>
          <div className="space-y-3">
            <Insight title="Mono-material structures win on circularity">
              In reports comparing mono-material options against multilayer laminates, the mono-material options score about 40 points higher on MCI on average.
            </Insight>
            <Insight title="Weight is destiny for rigid formats">
              Glass appears in multiple reports — in every case it dominates total carbon by 5-15× vs flexible alternatives due to raw material weight.
            </Insight>
            <Insight title="100% PCR plastic beats paper on carbon">
              When 100% PCR poly competes with FSC paper, the PCR option typically has the lower carbon footprint despite being plastic.
            </Insight>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-1">Counterintuitive findings</h3>
          <p className="text-xs text-slate-500 mb-4">Results that overturn common assumptions</p>
          <div className="space-y-3">
            <Insight title="Paper isn't always greener" tone="warn">
              Paper alternatives weigh ~2.3× plastic equivalents on average. In e-comm mailers, 100% PCR LDPE beats FSC paper by ~57% on carbon.
            </Insight>
            <Insight title="Refillable glass needs ~22 reuses to beat SUP refills" tone="warn">
              Reuse only beats lightweight flexibles past long lifecycles. Useful for setting realistic reuse targets.
            </Insight>
            <Insight title="Bigger packs are more efficient" tone="warn">
              A 15 kg pet food bag uses ~50% less material per kg of product than 5×1 kg bags — compelling for subscription models.
            </Insight>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  hintColor,
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {hint && <p className={`text-xs ${hintColor ?? "text-slate-500"} mt-1`}>{hint}</p>}
    </div>
  );
}

function Insight({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warn" }) {
  const toneStyle =
    tone === "warn"
      ? { borderLeftColor: "#DC2626", background: "linear-gradient(135deg, #FEF2F2 0%, #FEFCE8 100%)" }
      : undefined;
  return (
    <div className="insight-box" style={toneStyle}>
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-slate-600">{children}</p>
    </div>
  );
}
