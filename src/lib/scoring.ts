// Helpers for picking the best/worst option on a numeric key.

import type { Option } from "./types";

type NumericOptionKey = {
  [K in keyof Option]-?: Option[K] extends number ? K : never;
}[keyof Option] &
  string;

export interface OptionPick {
  idx: number;
  val: number;
}

/**
 * Returns the option with the lowest value (lower = true, default)
 * or highest value (lower = false) of a numeric field.
 */
export function bestOption(
  options: Option[],
  key: NumericOptionKey,
  lower = true,
): OptionPick {
  if (options.length === 0) return { idx: -1, val: 0 };
  let bestIdx = 0;
  let bestVal = options[0][key] as number;
  for (let i = 1; i < options.length; i++) {
    const v = options[i][key] as number;
    if (lower ? v < bestVal : v > bestVal) {
      bestIdx = i;
      bestVal = v;
    }
  }
  return { idx: bestIdx, val: bestVal };
}

export function worstOption(
  options: Option[],
  key: NumericOptionKey,
  lower = true,
): OptionPick {
  return bestOption(options, key, !lower);
}

export function carbonDeltaPct(options: Option[]): number {
  if (options.length < 2) return 0;
  const best = bestOption(options, "carbonKg").val;
  const worst = bestOption(options, "carbonKg", false).val;
  if (worst === 0) return 0;
  return Math.round((1 - best / worst) * 100);
}

export function weightDeltaPct(options: Option[]): number {
  if (options.length < 2) return 0;
  const lightest = bestOption(options, "weight").val;
  const heaviest = bestOption(options, "weight", false).val;
  if (heaviest === 0) return 0;
  return Math.round((1 - lightest / heaviest) * 100);
}

/** Formats a number with thousands separators. */
export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Fossil-fuel reliance — surfacing per Ben's product feedback
// ---------------------------------------------------------------------------

export type FossilLevel = "low" | "medium" | "high" | "very-high";

export interface FossilBadge {
  level: FossilLevel;
  label: string;
  /** Tailwind class fragments matching the chip palette in globals.css. */
  className: string;
}

/** Bucket a fossil-content % into the colour-coded badge used on OptionCard. */
export function fossilBadge(fossilPct: number): FossilBadge {
  if (fossilPct >= 90)
    return { level: "very-high", label: "Heavy fossil reliance", className: "bg-rose-100 text-rose-800 border-rose-200" };
  if (fossilPct >= 60)
    return { level: "high", label: "High fossil reliance", className: "bg-orange-100 text-orange-800 border-orange-200" };
  if (fossilPct >= 30)
    return { level: "medium", label: "Moderate fossil reliance", className: "bg-amber-100 text-amber-900 border-amber-200" };
  return { level: "low", label: "Low fossil reliance", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

/** Spread of fossil reliance across the option set (worst - best). */
export function fossilDeltaPct(options: Option[]): number {
  if (options.length < 2) return 0;
  const ps = options.map((o) => o.fossilPct);
  return Math.max(...ps) - Math.min(...ps);
}
