/**
 * Packaging format catalog. Phase 1 curated list of ~40 common formats with
 * typical structure presets and per-unit weights. Drives the structured build
 * form's per-option pickers.
 *
 * Defaults are intentionally generic-typical, not "best-in-class" — they
 * represent what the average product in that format looks like across the
 * Grounded library. The Claude parser uses these as hints but may override
 * weights/structures when the user's query specifies otherwise.
 *
 * LLM enrich: any structure not in this catalog can be expressed via the
 * "Other (describe)" free-text field on each option — the parser picks it
 * up and resolves against the engine's material library.
 */
export type FormatCategory =
  | "Beverage"
  | "Food — wet"
  | "Food — dry"
  | "Cosmetics"
  | "Pharma"
  | "E-commerce"
  | "Cleaning"
  | "Pet food"
  | "Industrial / B2B";

export interface StructureSpec {
  id: string;
  label: string;
  /** Per-unit weight in grams. Caller may override. */
  weight_per_unit_g: number;
  description?: string;
  recycled_content_pct?: number;
  /** EOL pathway name (matches scope_compute.EOL_PATHWAYS). */
  default_eol?: string;
}

export interface FormatSpec {
  id: string;
  label: string;
  category: FormatCategory;
  typicalSize?: string;
  structures: StructureSpec[];
}

export const FORMATS: FormatSpec[] = [
  // ============================== Beverage ==============================
  {
    id: "pet-bottle",
    label: "PET bottle",
    category: "Beverage",
    typicalSize: "330–1000ml",
    structures: [
      { id: "pet-mono-virgin",  label: "Mono-PET virgin",         weight_per_unit_g: 22, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "pet-rpet-100",     label: "100% rPET (recycled)",    weight_per_unit_g: 22, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "pet-rpet-30",      label: "30% rPET blend",          weight_per_unit_g: 22, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "pet-shrink-label", label: "PET + PVC shrink sleeve", weight_per_unit_g: 25, default_eol: "Landfill" },
    ],
  },
  {
    id: "glass-bottle",
    label: "Glass bottle",
    category: "Beverage",
    typicalSize: "330–750ml",
    structures: [
      { id: "glass-virgin",   label: "Virgin flint glass",   weight_per_unit_g: 200, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "glass-recycled", label: "30% recycled cullet",  weight_per_unit_g: 200, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "glass-amber",    label: "Amber glass (beer)",   weight_per_unit_g: 180, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "glass-light",    label: "Lightweight (-20%)",   weight_per_unit_g: 160, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "aluminium-can",
    label: "Aluminium can",
    category: "Beverage",
    typicalSize: "250–500ml",
    structures: [
      { id: "alu-virgin",   label: "Virgin aluminium",       weight_per_unit_g: 14, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "alu-recycled", label: "75% recycled aluminium", weight_per_unit_g: 14, recycled_content_pct: 75, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "alu-slim",     label: "Slim can (250ml)",       weight_per_unit_g: 10, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "steel-can",
    label: "Steel can",
    category: "Beverage",
    typicalSize: "200–400ml",
    structures: [
      { id: "steel-tinplate", label: "Tinplate steel",        weight_per_unit_g: 30, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "steel-recycled", label: "60% recycled steel",    weight_per_unit_g: 30, recycled_content_pct: 60, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "tetrapak",
    label: "Aseptic carton (Tetra Pak)",
    category: "Beverage",
    typicalSize: "200–1000ml",
    structures: [
      { id: "tetra-classic", label: "Paper + PE + Al laminate",     weight_per_unit_g: 28, default_eol: "Soft Plastics Recyclable" },
      { id: "tetra-fsc",     label: "FSC paper + PE (no Al)",       weight_per_unit_g: 26, default_eol: "Kerbside Recyclable - Paper" },
      { id: "tetra-cap",     label: "With BioPE screw cap",         weight_per_unit_g: 30, default_eol: "Soft Plastics Recyclable" },
    ],
  },
  {
    id: "liquid-pouch",
    label: "Spouted liquid pouch",
    category: "Beverage",
    typicalSize: "150–1000ml",
    structures: [
      { id: "spout-laminate", label: "PET/Al/PE laminate + HDPE spout", weight_per_unit_g: 12, default_eol: "Landfill" },
      { id: "spout-monope",   label: "Mono-PE recyclable + PE spout",   weight_per_unit_g: 14, default_eol: "Soft Plastics Recyclable" },
    ],
  },

  // ============================== Food — wet ==============================
  {
    id: "sup",
    label: "Stand-up pouch (SUP)",
    category: "Food — wet",
    typicalSize: "100–500g",
    structures: [
      { id: "sup-petalpe",   label: "PET/Al/PE laminate (barrier)", weight_per_unit_g: 14, default_eol: "Landfill" },
      { id: "sup-monope",    label: "Mono-PE recyclable",           weight_per_unit_g: 13, default_eol: "Soft Plastics Recyclable" },
      { id: "sup-paper-pe",  label: "Paper + PE coating",           weight_per_unit_g: 18, default_eol: "Kerbside Recyclable - Paper" },
      { id: "sup-compost",   label: "Compostable PLA/PBAT",         weight_per_unit_g: 15, default_eol: "Industrial Compostable" },
    ],
  },
  {
    id: "pillow-pouch",
    label: "Pillow pouch / flow wrap",
    category: "Food — wet",
    typicalSize: "20–200g",
    structures: [
      { id: "pillow-bopp",  label: "BOPP/PE laminate",   weight_per_unit_g: 4, default_eol: "Landfill" },
      { id: "pillow-mono",  label: "Mono-PP recyclable", weight_per_unit_g: 4, default_eol: "Soft Plastics Recyclable" },
      { id: "pillow-paper", label: "Paper + PE barrier", weight_per_unit_g: 6, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "tray-film",
    label: "Tray + lidding film",
    category: "Food — wet",
    typicalSize: "200–500g",
    structures: [
      { id: "tray-pet-film", label: "PET tray + multilayer film",       weight_per_unit_g: 18, default_eol: "Landfill" },
      { id: "tray-rpet",     label: "100% rPET tray + recyclable film", weight_per_unit_g: 18, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "tray-fibre",    label: "Moulded fibre tray + PE film",     weight_per_unit_g: 22, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "glass-jar",
    label: "Glass jar",
    category: "Food — wet",
    typicalSize: "150–500g",
    structures: [
      { id: "jar-glass-metal-lid", label: "Glass + tinplate lid",   weight_per_unit_g: 180, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "jar-glass-pp-lid",    label: "Glass + PP lid",         weight_per_unit_g: 175, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "plastic-jar",
    label: "Plastic jar",
    category: "Food — wet",
    typicalSize: "200–1000g",
    structures: [
      { id: "jar-pet",  label: "PET jar + PP lid", weight_per_unit_g: 35, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "jar-pp",   label: "PP jar + PP lid",  weight_per_unit_g: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "jar-rpet", label: "100% rPET jar",    weight_per_unit_g: 35, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },

  // ============================== Food — dry ==============================
  {
    id: "folding-carton",
    label: "Folding carton (paperboard)",
    category: "Food — dry",
    typicalSize: "200g–1kg",
    structures: [
      { id: "carton-fsc",         label: "FSC paperboard, no liner",     weight_per_unit_g: 30, default_eol: "Kerbside Recyclable - Paper" },
      { id: "carton-with-liner",  label: "Carton + LDPE inner liner",    weight_per_unit_g: 45, default_eol: "Landfill" },
      { id: "carton-with-window", label: "Carton + plastic window",      weight_per_unit_g: 35, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "sachet",
    label: "Sachet (single-serve)",
    category: "Food — dry",
    typicalSize: "1–20g",
    structures: [
      { id: "sachet-petalpe", label: "PET/Al/PE 3-layer", weight_per_unit_g: 1.2, default_eol: "Landfill" },
      { id: "sachet-paper",   label: "Paper + PE",        weight_per_unit_g: 1.5, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "bag-in-box",
    label: "Bag-in-box (BIB)",
    category: "Food — dry",
    typicalSize: "2–10L",
    structures: [
      { id: "bib-pet-foil", label: "Corrugated outer + PET/foil bag",   weight_per_unit_g: 130, default_eol: "Kerbside Recyclable - Paper" },
      { id: "bib-monope",   label: "Corrugated outer + mono-PE bag",    weight_per_unit_g: 125, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },

  // ============================== Cosmetics ==============================
  {
    id: "hdpe-bottle",
    label: "HDPE bottle",
    category: "Cosmetics",
    typicalSize: "250–1000ml",
    structures: [
      { id: "hdpe-virgin",  label: "Virgin HDPE + PP cap",       weight_per_unit_g: 28, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "hdpe-pcr-50",  label: "50% PCR HDPE",               weight_per_unit_g: 28, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "hdpe-pcr-100", label: "100% PCR HDPE",              weight_per_unit_g: 28, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "cosmetic-pet-bottle",
    label: "PET bottle (cosmetics)",
    category: "Cosmetics",
    typicalSize: "100–500ml",
    structures: [
      { id: "cos-pet-virgin", label: "Virgin PET + PP cap",   weight_per_unit_g: 22, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "cos-rpet-100",   label: "100% rPET",             weight_per_unit_g: 22, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "alu-bottle",
    label: "Aluminium bottle",
    category: "Cosmetics",
    typicalSize: "200–500ml",
    structures: [
      { id: "alu-bot-virgin", label: "Virgin aluminium + plastic insert", weight_per_unit_g: 45, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "alu-bot-pcr",    label: "75% recycled aluminium",            weight_per_unit_g: 45, recycled_content_pct: 75, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "fragrance-glass",
    label: "Fragrance glass bottle",
    category: "Cosmetics",
    typicalSize: "30–100ml",
    structures: [
      { id: "frag-glass-pump",     label: "Heavy glass + metal pump",      weight_per_unit_g: 220, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "frag-glass-light",    label: "Lightweight glass + pump",      weight_per_unit_g: 120, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "cosmetic-plastic-jar",
    label: "Plastic jar (cream)",
    category: "Cosmetics",
    typicalSize: "30–250ml",
    structures: [
      { id: "cos-jar-pp",   label: "PP jar + PP lid",  weight_per_unit_g: 35, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "cos-jar-rpet", label: "rPET jar + PP lid", weight_per_unit_g: 35, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "cosmetic-glass-jar",
    label: "Glass jar (cream)",
    category: "Cosmetics",
    typicalSize: "30–250ml",
    structures: [
      { id: "cos-glass-jar-virgin", label: "Glass jar + metal lid",       weight_per_unit_g: 180, recycled_content_pct: 30, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "cos-glass-jar-refill", label: "Glass jar + refill insert",   weight_per_unit_g: 200, recycled_content_pct: 30, default_eol: "Reusable / Refill" },
    ],
  },
  {
    id: "tube",
    label: "Tube",
    category: "Cosmetics",
    typicalSize: "30–200ml",
    structures: [
      { id: "tube-plastic", label: "PE tube + PP cap",         weight_per_unit_g: 18, default_eol: "Landfill" },
      { id: "tube-monope",  label: "Mono-PE recyclable tube",  weight_per_unit_g: 18, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "tube-alu",     label: "Aluminium tube",           weight_per_unit_g: 22, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "airless-pump",
    label: "Airless pump",
    category: "Cosmetics",
    typicalSize: "30–100ml",
    structures: [
      { id: "airless-pp", label: "PP airless + spring + dip tube", weight_per_unit_g: 38, default_eol: "Landfill" },
      { id: "airless-pcr", label: "50% PCR PP airless",            weight_per_unit_g: 38, recycled_content_pct: 50, default_eol: "Landfill" },
    ],
  },
  {
    id: "refill-cartridge",
    label: "Refill cartridge / pod",
    category: "Cosmetics",
    typicalSize: "10–250ml",
    structures: [
      { id: "refill-pouch",    label: "Refill pouch (mono-PE)",       weight_per_unit_g: 6, default_eol: "Soft Plastics Recyclable" },
      { id: "refill-cartridge",label: "Refill cartridge (PP insert)", weight_per_unit_g: 8, default_eol: "Reusable / Refill" },
      { id: "refill-tablet",   label: "Refill tablet (no wrapper)",   weight_per_unit_g: 1, default_eol: "Reusable / Refill" },
    ],
  },
  {
    id: "compact",
    label: "Compact (palette)",
    category: "Cosmetics",
    typicalSize: "5–30g pan",
    structures: [
      { id: "compact-plastic", label: "Plastic + mirror + magnetic pan", weight_per_unit_g: 45, default_eol: "Landfill" },
      { id: "compact-refill",  label: "Plastic refillable + magnet pan", weight_per_unit_g: 45, default_eol: "Reusable / Refill" },
      { id: "compact-alu",     label: "Aluminium + magnetic pan",        weight_per_unit_g: 30, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },

  // ============================== Pharma ==============================
  {
    id: "pill-bottle",
    label: "Pill bottle (HDPE)",
    category: "Pharma",
    typicalSize: "30–200 tablets",
    structures: [
      { id: "pill-hdpe", label: "HDPE bottle + PP cap",      weight_per_unit_g: 25, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "pill-pcr",  label: "50% PCR HDPE",              weight_per_unit_g: 25, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "blister-pack",
    label: "Blister pack",
    category: "Pharma",
    typicalSize: "10–30 tablets",
    structures: [
      { id: "blister-pvc-al", label: "PVC blister + Al foil lid", weight_per_unit_g: 3, default_eol: "Landfill" },
      { id: "blister-pp-al",  label: "PP blister + Al foil lid",  weight_per_unit_g: 3, default_eol: "Landfill" },
    ],
  },
  {
    id: "vial",
    label: "Glass vial / ampoule",
    category: "Pharma",
    typicalSize: "1–20ml",
    structures: [
      { id: "vial-glass",  label: "Type I glass vial + rubber stopper",   weight_per_unit_g: 8, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "vial-ampoule",label: "Glass ampoule (snap)",                 weight_per_unit_g: 5, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },

  // ============================== E-commerce ==============================
  {
    id: "corrugated-box",
    label: "Corrugated box",
    category: "E-commerce",
    typicalSize: "small to large",
    structures: [
      { id: "box-virgin",   label: "Virgin kraft corrugated",      weight_per_unit_g: 80, default_eol: "Kerbside Recyclable - Paper" },
      { id: "box-recycled", label: "100% recycled corrugated",     weight_per_unit_g: 80, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "paper-mailer",
    label: "Paper mailer (kraft)",
    category: "E-commerce",
    typicalSize: "A5–A3",
    structures: [
      { id: "paper-mailer-fsc",    label: "FSC kraft mailer",             weight_per_unit_g: 30, default_eol: "Kerbside Recyclable - Paper" },
      { id: "paper-mailer-padded", label: "Kraft mailer + paper padding", weight_per_unit_g: 45, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "poly-mailer",
    label: "Poly mailer (LDPE)",
    category: "E-commerce",
    typicalSize: "A5–A3",
    structures: [
      { id: "poly-virgin", label: "Virgin LDPE",     weight_per_unit_g: 13, default_eol: "Landfill" },
      { id: "poly-pcr",    label: "100% PCR LDPE",   weight_per_unit_g: 13, recycled_content_pct: 100, default_eol: "Soft Plastics Recyclable" },
    ],
  },
  {
    id: "padded-mailer",
    label: "Padded mailer",
    category: "E-commerce",
    typicalSize: "A5–A3",
    structures: [
      { id: "pad-bubble",  label: "Kraft outer + LDPE bubble lining", weight_per_unit_g: 35, default_eol: "Landfill" },
      { id: "pad-paper",   label: "Kraft outer + shredded paper",     weight_per_unit_g: 50, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },

  // ============================== Cleaning ==============================
  {
    id: "trigger-spray",
    label: "Trigger spray bottle",
    category: "Cleaning",
    typicalSize: "500ml",
    structures: [
      { id: "spray-pet-virgin", label: "PET bottle + PP trigger",  weight_per_unit_g: 65, default_eol: "Landfill" },
      { id: "spray-rpet",       label: "100% rPET + recyclable trigger", weight_per_unit_g: 65, recycled_content_pct: 100, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "hdpe-jug",
    label: "HDPE jug (heavy duty)",
    category: "Cleaning",
    typicalSize: "1–5L",
    structures: [
      { id: "jug-hdpe-virgin", label: "Virgin HDPE + handle",    weight_per_unit_g: 70, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "jug-hdpe-pcr",    label: "50% PCR HDPE",            weight_per_unit_g: 70, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "concentrate-refill",
    label: "Concentrated refill pouch",
    category: "Cleaning",
    typicalSize: "50–250ml concentrate",
    structures: [
      { id: "refill-pet-foil", label: "PET/Al/PE laminate", weight_per_unit_g: 8, default_eol: "Landfill" },
      { id: "refill-mono",     label: "Mono-PE recyclable", weight_per_unit_g: 9, default_eol: "Soft Plastics Recyclable" },
    ],
  },
  {
    id: "dishwasher-tablet",
    label: "Tablet (dishwasher / laundry)",
    category: "Cleaning",
    typicalSize: "single dose",
    structures: [
      { id: "tab-pva-wrap", label: "PVA dissolvable wrapper",        weight_per_unit_g: 1, default_eol: "Industrial Compostable" },
      { id: "tab-bare",     label: "Naked tablet (no wrapper)",      weight_per_unit_g: 0.1, default_eol: "Industrial Compostable" },
    ],
  },

  // ============================== Pet food ==============================
  {
    id: "dryfood-bag",
    label: "Dry pet-food bag",
    category: "Pet food",
    typicalSize: "1–15kg",
    structures: [
      { id: "dry-pet-laminate", label: "PET/Al/PE 3-layer",  weight_per_unit_g: 60, default_eol: "Landfill" },
      { id: "dry-mono-pp",      label: "Mono-PP recyclable", weight_per_unit_g: 55, default_eol: "Soft Plastics Recyclable" },
      { id: "dry-paper",        label: "Paper + PE liner",   weight_per_unit_g: 75, default_eol: "Kerbside Recyclable - Paper" },
    ],
  },
  {
    id: "wetfood-can",
    label: "Wet pet-food can",
    category: "Pet food",
    typicalSize: "85–400g",
    structures: [
      { id: "pet-can-steel", label: "Steel can + Al lid", weight_per_unit_g: 35, recycled_content_pct: 60, default_eol: "Kerbside Recyclable - Plastic" },
      { id: "pet-can-alu",   label: "Aluminium can",      weight_per_unit_g: 18, recycled_content_pct: 50, default_eol: "Kerbside Recyclable - Plastic" },
    ],
  },
  {
    id: "wetfood-pouch",
    label: "Wet pet-food pouch",
    category: "Pet food",
    typicalSize: "85–200g",
    structures: [
      { id: "pet-pouch-laminate", label: "PET/Al/PE retort pouch", weight_per_unit_g: 6, default_eol: "Landfill" },
      { id: "pet-pouch-mono",     label: "Mono-PP retort pouch",   weight_per_unit_g: 6, default_eol: "Soft Plastics Recyclable" },
    ],
  },

  // ============================== Industrial / B2B ==============================
  {
    id: "ibc",
    label: "IBC / drum",
    category: "Industrial / B2B",
    typicalSize: "200–1000L",
    structures: [
      { id: "ibc-hdpe",     label: "HDPE IBC + steel cage",   weight_per_unit_g: 55_000, default_eol: "Reusable / Refill" },
      { id: "drum-steel",   label: "Steel drum (200L)",       weight_per_unit_g: 17_000, recycled_content_pct: 60, default_eol: "Reusable / Refill" },
    ],
  },
  {
    id: "pallet-wrap",
    label: "Pallet shrink wrap",
    category: "Industrial / B2B",
    typicalSize: "per pallet",
    structures: [
      { id: "wrap-ldpe",    label: "Virgin LDPE film",      weight_per_unit_g: 250, default_eol: "Landfill" },
      { id: "wrap-pcr",     label: "30% PCR LDPE",          weight_per_unit_g: 250, recycled_content_pct: 30, default_eol: "Soft Plastics Recyclable" },
    ],
  },
];

export const FORMAT_CATEGORIES: FormatCategory[] = [
  "Beverage",
  "Food — wet",
  "Food — dry",
  "Cosmetics",
  "Pharma",
  "E-commerce",
  "Cleaning",
  "Pet food",
  "Industrial / B2B",
];

/** Find a format by id. */
export function getFormat(id: string): FormatSpec | undefined {
  return FORMATS.find((f) => f.id === id);
}

/** Find a structure within a format by id. */
export function getStructure(
  formatId: string,
  structureId: string,
): StructureSpec | undefined {
  return getFormat(formatId)?.structures.find((s) => s.id === structureId);
}
