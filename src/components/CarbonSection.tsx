import type { CarbonBoundary, Option } from "@/lib/types";
import { BOUNDARY_LABEL } from "@/lib/boundary";
import { fmt } from "@/lib/scoring";
import BoundaryToggle from "./BoundaryToggle";
import CarbonChart from "./charts/CarbonChart";

interface Props {
  options: Option[];
  boundary: CarbonBoundary;
  /** Controlled mode (BuilderResultView). When omitted the toggle uses
   * URL-backed state and the page re-renders on toggle (static viewer). */
  onBoundaryChange?: (b: CarbonBoundary) => void;
  stagesAvailable: boolean;
}

/**
 * Always-visible carbon section. Per Ben's feedback carbon is critical
 * enough to surface on every report, not just when the narrative picks
 * "carbon" as the primary signal. Boundary toggle sits directly above the
 * chart so users can flip between cradle-to-gate / cradle-to-grave
 * without scrolling back to the page header.
 */
export default function CarbonSection({
  options,
  boundary,
  onBoundaryChange,
  stagesAvailable,
}: Props) {
  const totals = options.map((o) => o.carbonKg);
  const min = Math.min(...totals);
  const max = Math.max(...totals);

  return (
    <section className="py-10 fade-in">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-tack-700 font-semibold mb-1">
            Annual carbon footprint
          </p>
          <h2 className="text-2xl font-bold">
            {fmt(min)} – {fmt(max)} kg CO₂-eq · {BOUNDARY_LABEL[boundary]}
          </h2>
        </div>
        <BoundaryToggle
          value={onBoundaryChange ? boundary : undefined}
          onChange={onBoundaryChange}
          disabled={!stagesAvailable}
          disabledReason="This report doesn't carry per-stage breakdown — cradle-to-grave only."
        />
      </div>
      <CarbonChart options={options} boundary={boundary} />
    </section>
  );
}
