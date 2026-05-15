export const FOCUS_CLASS_MAP: Record<string, string> = {
  Coffee: "focus-coffee",
  "Vitamins & Supplements": "focus-vitamins",
  "Sustainable Refill": "focus-refill",
  "Stand-up Pouches": "focus-sup",
  "E-commerce & Poly": "focus-ecomm",
  "Technical Materials": "focus-technical",
  "Sustainable Flexibles": "focus-flexibles",
  "Pet Food": "focus-pet",
  Beverages: "focus-beverages",
  "Cosmetics & Beauty": "focus-cosmetics",
  "Elimination & Consolidation": "focus-elim",
};

export function focusClassForArea(name: string): string {
  return FOCUS_CLASS_MAP[name] ?? "focus-elim";
}
