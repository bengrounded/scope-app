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
