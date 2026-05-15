import { NextResponse } from "next/server";
import type { MaterialLibraryEntry } from "@/lib/types";

/**
 * GET /api/library/materials
 *
 * Phase 1 stub: returns a curated list of common materials. Engineer should
 * back this with the real xlsm-derived material catalogue once it's seeded
 * in Supabase. Each entry carries enough info for the Python compute engine
 * to do its math (carbon factor, composition, density).
 */
const STUB_MATERIALS: MaterialLibraryEntry[] = [
  {
    id: "pet-virgin",
    name: "Virgin PET",
    category: "Plastic",
    density: 1.38,
    carbonPerGram: 0.024,
    fossilPct: 100,
    recycledPct: 0,
    renewablePct: 0,
  },
  {
    id: "rpet-100",
    name: "100% rPET",
    category: "Plastic",
    density: 1.38,
    carbonPerGram: 0.012,
    fossilPct: 0,
    recycledPct: 100,
    renewablePct: 0,
  },
  {
    id: "pe-virgin",
    name: "Virgin LDPE",
    category: "Plastic",
    density: 0.92,
    carbonPerGram: 0.024,
    fossilPct: 100,
    recycledPct: 0,
    renewablePct: 0,
  },
  {
    id: "pe-pcr",
    name: "100% PCR LDPE",
    category: "Plastic",
    density: 0.92,
    carbonPerGram: 0.014,
    fossilPct: 0,
    recycledPct: 100,
    renewablePct: 0,
  },
  {
    id: "paper-fsc",
    name: "FSC Paper 70gsm",
    category: "Paper",
    density: 0.7,
    carbonPerGram: 0.018,
    fossilPct: 0,
    recycledPct: 0,
    renewablePct: 100,
  },
  {
    id: "glass-virgin",
    name: "Virgin Glass",
    category: "Glass",
    density: 2.5,
    carbonPerGram: 0.012,
    fossilPct: 5,
    recycledPct: 30,
    renewablePct: 0,
  },
  {
    id: "tin-steel",
    name: "Tinplate steel",
    category: "Metal",
    density: 7.85,
    carbonPerGram: 0.022,
    fossilPct: 5,
    recycledPct: 35,
    renewablePct: 0,
    notes: "Indefinitely recyclable; weight-driven LCA result.",
  },
];

export async function GET() {
  return NextResponse.json({
    total: STUB_MATERIALS.length,
    results: STUB_MATERIALS,
    notes:
      "Stub material library. TODO: replace with the full xlsm catalogue extracted via scripts/extract_materials.py once the .xlsm is moved into Supabase.",
  });
}
