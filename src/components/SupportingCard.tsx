import type { Option, PrimarySection } from "@/lib/types";
import { bestOption, fmt } from "@/lib/scoring";
import Tooltip from "./Tooltip";

interface Props {
  section: PrimarySection;
  options: Option[];
}

/** Compact, list-style version of a section — used in the supporting grid. */
export default function SupportingCard({ section, options }: Props) {
  if (section === "weight") return <WeightCard options={options} />;
  if (section === "carbon") return <CarbonCard options={options} />;
  if (section === "composition") return <CompositionCard options={options} />;
  if (section === "eol") return <EolCard options={options} />;
  if (section === "circularity") return <CircularityCard options={options} />;
  return null;
}

function WeightCard({ options }: { options: Option[] }) {
  const lightest = bestOption(options, "weight");
  const maxW = Math.max(...options.map((o) => o.weight));
  return (
    <Card title="Pack weight per unit" subtitle="Material per single unit, in grams">
      {options.map((o, i) => (
        <Row key={i} label={o.name} value={<><Tooltip assumption="weight">{o.weight}g</Tooltip></>}>
          <Bar pct={(o.weight / Math.max(maxW, 1)) * 100} highlight={i === lightest.idx} />
        </Row>
      ))}
    </Card>
  );
}

function CarbonCard({ options }: { options: Option[] }) {
  const best = bestOption(options, "carbonKg");
  const max = Math.max(...options.map((o) => o.carbonKg));
  return (
    <Card title="Annual carbon footprint" subtitle={`kg CO₂-eq across the lifecycle`}>
      {options.map((o, i) => (
        <Row key={i} label={o.name} value={<Tooltip assumption="carbon">{fmt(o.carbonKg)} kg</Tooltip>}>
          <Bar pct={(o.carbonKg / Math.max(max, 1)) * 100} highlight={i === best.idx} />
        </Row>
      ))}
    </Card>
  );
}

function CompositionCard({ options }: { options: Option[] }) {
  return (
    <Card title="Material composition" subtitle="Recycled / renewable / virgin fossil">
      {options.map((o, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">{o.name}</span>
            <span className="font-semibold">
              <Tooltip assumption="recycledPct">{o.recycledPct}% R</Tooltip>
              {" / "}
              <Tooltip assumption="renewablePct">{o.renewablePct}% N</Tooltip>
              {" / "}
              <Tooltip assumption="fossilPct">{o.fossilPct}% F</Tooltip>
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
            <div className="bg-sky-500" style={{ width: `${o.recycledPct}%` }} />
            <div className="bg-emerald-500" style={{ width: `${o.renewablePct}%` }} />
            <div className="bg-stone-500" style={{ width: `${o.fossilPct}%` }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

function EolCard({ options }: { options: Option[] }) {
  return (
    <Card title="End-of-life pathway" subtitle="Recycled / composted / landfilled / incinerated">
      {options.map((o, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">{o.name}</span>
            <span className="font-semibold">
              <Tooltip assumption="eolPct">{o.eolSplit.recycled}% recycled</Tooltip>
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${o.eolSplit.recycled}%` }} />
            <div className="bg-stone-400" style={{ width: `${o.eolSplit.composted}%` }} />
            <div className="bg-rose-500" style={{ width: `${o.eolSplit.landfilled}%` }} />
            <div className="bg-amber-500" style={{ width: `${o.eolSplit.incinerated}%` }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

function CircularityCard({ options }: { options: Option[] }) {
  const max = 100;
  const best = bestOption(options, "mci", false);
  return (
    <Card title="Material Circularity Index" subtitle="Ellen MacArthur Foundation methodology">
      {options.map((o, i) => (
        <Row key={i} label={o.name} value={<Tooltip assumption="mci">{o.mci}/100</Tooltip>}>
          <Bar pct={(o.mci / max) * 100} highlight={i === best.idx} />
        </Row>
      ))}
    </Card>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h4 className="text-sm font-semibold mb-1">{title}</h4>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Bar({ pct, highlight }: { pct: number; highlight: boolean }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${highlight ? "bg-emerald-500" : "bg-slate-400"}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
