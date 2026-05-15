import { fmt } from "@/lib/scoring";
import { calculateEquivalencies } from "@/lib/equivalencies";

interface Props {
  savingsKg: number;
  bestName: string;
  worstName: string;
  pct: number;
}

export default function Equivalencies({ savingsKg, bestName, worstName, pct }: Props) {
  if (savingsKg <= 0) return null;
  const equiv = calculateEquivalencies(savingsKg);
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mt-2">
      <p className="text-sm text-emerald-900 mb-1">
        <strong>Switching to {bestName}</strong> instead of the {worstName} saves
      </p>
      <p className="text-3xl font-bold text-emerald-700 mb-4">
        {fmt(savingsKg)} kg CO₂ per year{" "}
        <span className="text-base font-medium">({pct}%)</span>
      </p>
      <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-3">
        Each year, that&apos;s equivalent to:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Equiv icon="✈" value={fmt(equiv.flights)} label="LA-NY flights avoided" />
        <Equiv icon="Trees" value={fmt(equiv.trees)} label="trees absorbing CO2 for a year" />
        <Equiv icon="Car" value={equiv.cars} label="cars off the road for a year" />
        <Equiv icon="Phone" value={fmt(equiv.smartphones)} label="smartphones never manufactured" />
      </div>
    </div>
  );
}

function Equiv({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-white rounded-lg p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
