"""
backfill_library_reports.py
============================

Re-runs every report in src/data/reports.json through the live compute
engine (Fly) and refreshes the carbon totals + per-stage breakdown +
MCI + composition percentages with real numbers.

Why
---
The 376 library reports' carbonKg / fossilPct / recycledPct / renewablePct
were originally derived from a heuristic in `scripts/extract_reports.py`
(see `composition_for`). A backfill pass partially corrected them but
several pla-substring false matches survived (Day 2.9 sweep caught some;
others remain). This script bypasses the heuristic entirely:

  1. Synthesises a natural-language description of each report from its
     rendered Option fields.
  2. Calls the Claude parser (production-equivalent) to translate that
     description into engine-shape ProductOptions, resolving each option
     against the canonical material / process / grid / EOL library.
  3. POSTs the resulting payload to https://scope-compute-grounded.fly.dev
     /api/compute and reads the real engine output.
  4. Overwrites each report's per-option carbonKg / mci / fossilPct /
     recycledPct / renewablePct / stages with the engine's numbers.

Time + cost
-----------
~5-10s per report (one Claude call + one Fly call). Sequential run ≈
30-50 min for 376 reports. Approx Anthropic cost: USD $15-30 depending
on library-list size + token usage. Set CONCURRENCY > 1 to parallelise
(careful with Anthropic rate limits — default 5 is safe on Tier 2).

Usage
-----
  cd scope-app
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 scripts/backfill_library_reports.py            # full run
  python3 scripts/backfill_library_reports.py --limit 5  # sanity test
  python3 scripts/backfill_library_reports.py --start 100 --limit 50

Output file is `src/data/reports.json` (in place). The script makes a
.bak copy first; review the diff before committing.

Prerequisites
-------------
  pip install anthropic requests
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import shutil
import sys
import time
from pathlib import Path

try:
    import anthropic
    import requests
except ImportError:
    print("Install deps: pip install anthropic requests", file=sys.stderr)
    sys.exit(1)


ROOT = Path(__file__).resolve().parents[1]
REPORTS_JSON = ROOT / "src" / "data" / "reports.json"
FLY_URL = os.environ.get("COMPUTE_API_URL", "https://scope-compute-grounded.fly.dev").rstrip("/")
MODEL = os.environ.get("PARSER_MODEL", "claude-sonnet-4-6")
CONCURRENCY = int(os.environ.get("CONCURRENCY", "5"))

PARSER_TOOL = {
    "name": "parse_packaging_comparison",
    "description": (
        "Translate a packaging comparison query into engine-shape ProductOptions. "
        "Use ONLY material_library_entry / manufacturing_process / manufacturing_grid / "
        "eol_pathway values from the closed vocabularies provided."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "options": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "weight_per_unit_g": {"type": "number"},
                        "composition": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "material_library_entry": {"type": "string"},
                                    "percent": {"type": "number"},
                                },
                                "required": ["material_library_entry", "percent"],
                            },
                        },
                        "manufacturing_process": {"type": "string"},
                        "manufacturing_grid": {"type": "string"},
                        "eol_pathway": {"type": "string"},
                        "recycled_content_pct": {"type": "number"},
                        "renewable_content_pct": {"type": "number"},
                    },
                    "required": [
                        "name", "weight_per_unit_g", "composition",
                        "manufacturing_process", "manufacturing_grid", "eol_pathway",
                    ],
                },
            },
            "region": {"type": "string"},
            "annual_units": {"type": "integer"},
        },
        "required": ["options", "region", "annual_units"],
    },
}


def fetch_library() -> dict:
    r = requests.get(f"{FLY_URL}/api/library", timeout=15)
    r.raise_for_status()
    return r.json()


def parser_system_prompt(lib: dict) -> str:
    return f"""You are translating a known packaging comparison into engine inputs.
The user provides the comparison's title plus per-option detail (material descriptor,
weight, EOL). Produce ProductOptions using only the closed-vocab identifiers below.

When in doubt, pick the closest matching material — never invent identifiers.
For recycled materials (rPET, PCR HDPE, etc) set recycled_content_pct on that
option. For bio-derived (PLA, PHA, BioPE, BioPP, etc) set renewable_content_pct.

== material_library_entry ({len(lib["materials"])}) ==
{chr(10).join(f"  - {m}" for m in lib["materials"])}

== manufacturing_process ({len(lib["manufacturing_processes"])}) ==
{chr(10).join(f"  - {p}" for p in lib["manufacturing_processes"])}

== manufacturing_grid ({len(lib["electricity_grids"])}) ==
{chr(10).join(f"  - {g}" for g in lib["electricity_grids"])}

== eol_pathway ({len(lib["eol_pathways"])}) ==
{chr(10).join(f"  - {e}" for e in lib["eol_pathways"])}
"""


def build_query(report: dict) -> str:
    lines = [
        f"Comparison title: {report.get('title', '')}",
        f"Pack size: {report.get('packSize', '')}",
        f"Industry: {report.get('industry', '')}",
        f"Annual volume: {report.get('annualVolume', 100000)}",
        "Options to parse:",
    ]
    for i, o in enumerate(report.get("options", [])):
        parts = [f"  Option {i+1}: {o.get('name', '')}"]
        if o.get("material"):    parts.append(f"material: {o['material']}")
        if o.get("structure"):   parts.append(f"structure: {o['structure']}")
        if o.get("format"):      parts.append(f"format: {o['format']}")
        if o.get("weight"):      parts.append(f"{o['weight']}g per unit")
        if o.get("eol"):         parts.append(f"EOL: {o['eol']}")
        lines.append(", ".join(parts))
    return "\n".join(lines)


def parse_with_claude(client: anthropic.Anthropic, lib: dict, report: dict) -> dict:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=parser_system_prompt(lib),
        tools=[PARSER_TOOL],
        tool_choice={"type": "tool", "name": PARSER_TOOL["name"]},
        messages=[{"role": "user", "content": build_query(report)}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == PARSER_TOOL["name"]:
            return block.input
    raise RuntimeError(f"No tool_use in parser response for {report['id']}")


def compute_via_fly(parsed: dict, description: str) -> dict:
    payload = {
        "options": [
            {
                "name": o["name"],
                "weight_per_unit_g": o["weight_per_unit_g"],
                "composition": o["composition"],
                "manufacturing_process": o["manufacturing_process"],
                "manufacturing_grid": o["manufacturing_grid"],
                "eol_pathway": o["eol_pathway"],
                "recycled_content_pct": o.get("recycled_content_pct", 0),
                "renewable_content_pct": o.get("renewable_content_pct", 0),
            }
            for o in parsed["options"]
        ],
        "region": parsed.get("region", "Australia"),
        "annual_units": parsed.get("annual_units", 100_000),
        "description": description,
    }
    r = requests.post(f"{FLY_URL}/api/compute", json=payload, timeout=45)
    if r.status_code != 200:
        raise RuntimeError(f"Compute {r.status_code}: {r.text[:200]}")
    return r.json()


def backfill_one(client, lib, report) -> tuple[str, str | None]:
    try:
        parsed = parse_with_claude(client, lib, report)
        # Ensure parsed has same number of options; if not, give up on this row.
        if len(parsed.get("options", [])) != len(report["options"]):
            return report["id"], f"option-count mismatch ({len(parsed['options'])} vs {len(report['options'])})"
        computed = compute_via_fly(parsed, f"Backfill of {report['id']}: {report.get('title', '')}")
        for i, o in enumerate(report["options"]):
            c = computed["options"][i]
            cf_ = c["carbon_footprint"]
            mc = c["material_composition"]
            o["carbonKg"]      = round(cf_["total_kg"])
            o["mci"]           = round(c["circularity"]["mci_pct"])
            o["fossilPct"]     = round(mc["fossil_pct"])
            o["recycledPct"]   = round(mc["recycled_pct"])
            o["renewablePct"]  = round(mc["renewable_pct"])
            o["stages"] = {
                "rawMaterialsKg":  round(cf_["raw_materials_kg"]),
                "manufacturingKg": round(cf_["manufacturing_kg"]),
                "logisticsKg":     round(cf_["logistics_kg"]),
                "endOfLifeKg":     round(cf_["end_of_life_kg"]),
            }
        return report["id"], None
    except Exception as exc:
        return report["id"], f"{type(exc).__name__}: {exc}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true", help="Run but don't write reports.json")
    args = ap.parse_args()

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("Set ANTHROPIC_API_KEY before running.", file=sys.stderr)
        sys.exit(2)

    reports = json.loads(REPORTS_JSON.read_text())
    end = (args.start + args.limit) if args.limit else len(reports)
    subset = reports[args.start:end]
    print(f"Backfilling {len(subset)} of {len(reports)} reports (indices {args.start}..{end-1})")
    print(f"  Model: {MODEL}  |  Fly: {FLY_URL}  |  Concurrency: {CONCURRENCY}")

    if not args.dry_run:
        backup = REPORTS_JSON.with_suffix(".json.bak")
        shutil.copy(REPORTS_JSON, backup)
        print(f"  Backup: {backup}")

    client = anthropic.Anthropic()
    lib = fetch_library()
    print(f"  Library: {len(lib['materials'])} materials, {len(lib['manufacturing_processes'])} processes, {len(lib['electricity_grids'])} grids, {len(lib['eol_pathways'])} EOL pathways")

    started = time.time()
    errors: list[tuple[str, str]] = []
    with cf.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = {pool.submit(backfill_one, client, lib, r): r["id"] for r in subset}
        done = 0
        for fut in cf.as_completed(futures):
            done += 1
            rid, err = fut.result()
            if err:
                errors.append((rid, err))
                print(f"  ✗ [{done}/{len(subset)}] {rid}: {err}")
            else:
                print(f"  ✓ [{done}/{len(subset)}] {rid}")

    elapsed = time.time() - started
    print(f"\nDone in {elapsed:.0f}s. {len(subset) - len(errors)} succeeded, {len(errors)} failed.")
    if errors:
        print("\nFailures:")
        for rid, err in errors:
            print(f"  {rid}: {err}")

    if not args.dry_run:
        REPORTS_JSON.write_text(json.dumps(reports, indent=2))
        print(f"\nWrote {REPORTS_JSON}")
        print("Review the diff (`git diff src/data/reports.json | head -200`) before committing.")


if __name__ == "__main__":
    main()
