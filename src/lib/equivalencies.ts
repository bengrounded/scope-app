// Carbon-savings equivalencies. TypeScript port of the prototype's
// calculateEquivalencies() helper. Sources are illustrative defaults
// — engineer can swap to authoritative regional factors later.

export const EQUIVALENCY_FACTORS = {
  /** kg CO2 per economy passenger LA-NY flight */
  flight: 283,
  /** kg CO2 absorbed by one tree per year */
  tree: 20.4,
  /** kg CO2 per average car per year */
  car: 4600,
  /** kg CO2 per smartphone manufactured */
  smartphone: 77,
  /** kg CO2 per kg of beef produced */
  beef: 22.7,
} as const;

export interface Equivalencies {
  flights: number;
  trees: number;
  cars: string;
  smartphones: number;
  beef: number;
}

export function calculateEquivalencies(savingsKg: number): Equivalencies {
  const safe = Math.max(0, savingsKg);
  return {
    flights: Math.round(safe / EQUIVALENCY_FACTORS.flight),
    trees: Math.round(safe / EQUIVALENCY_FACTORS.tree),
    cars: (safe / EQUIVALENCY_FACTORS.car).toFixed(1),
    smartphones: Math.round(safe / EQUIVALENCY_FACTORS.smartphone),
    beef: Math.round(safe / EQUIVALENCY_FACTORS.beef),
  };
}
