"""
Extracts the 376 reports from scope_report_ideas.xlsx into reports.json
and seeds report_meta.json with sensible defaults.

Run:  python scripts/extract_reports.py
"""
import json
import os
import sys
import re
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Install openpyxl: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
SOURCE_XLSX = Path(os.environ.get(
    "SCOPE_REPORT_IDEAS_XLSX",
    ROOT.parent / "scope_report_ideas.xlsx",
))
REPORTS_OUT = ROOT / "src" / "data" / "reports.json"
META_OUT = ROOT / "src" / "data" / "report_meta.json"

FOCUS_AREA_NORMALISE = {
    "Coffee": "Coffee",
    "Vitamins & Supplements": "Vitamins & Supplements",
    "Sustainable Refill": "Sustainable Refill",
    "Stand-up Pouches": "Stand-up Pouches",
    "E-commerce & Poly": "E-commerce & Poly",
    "Technical Materials": "Technical Materials",
    "Sustainable Flexibles": "Sustainable Flexibles",
    "Pet Food": "Pet Food",
    "Beverages": "Beverages",
    "Cosmetics & Beauty": "Cosmetics & Beauty",
    "Elimination & Consolidation": "Elimination & Consolidation",
}

# Carbon factors per gram (kg CO2-eq / g) used for the seed dataset only.
# These are deliberately conservative averages so the library is browsable
# before the real compute engine is wired up.
CARBON_FACTORS = {
    "laminate": 0.034,
    "multilayer": 0.032,
    "foil": 0.040,
    "aluminium": 0.090,
    "steel": 0.022,
    "tin": 0.022,
    "glass": 0.012,
    "mono pe": 0.024,
    "mono-pe": 0.024,
    "pe": 0.024,
    "ldpe": 0.024,
    "hdpe": 0.022,
    "pp": 0.020,
    "pet": 0.024,
    "rpet": 0.012,
    "pcr": 0.014,
    "bio": 0.018,
    "bio-pe": 0.018,
    "compostable": 0.020,
    "pla": 0.022,
    "paper": 0.018,
    "fsc paper": 0.018,
    "paperboard": 0.017,
    "carton": 0.017,
}

# Material composition signals
def composition_for(material: str) -> dict:
    m = (material or "").lower()
    fossil = 100
    recycled = 0
    renewable = 0
    if "100% pcr" in m or "100% recycled" in m or "rpet" in m or "100% rpet" in m:
        recycled = 100
        fossil = 0
    elif "pcr" in m or "% recycled" in m:
        recycled = 30
        fossil = 70
    if "paper" in m or "carton" in m or "fsc" in m or "paperboard" in m:
        renewable = max(renewable, 80)
        fossil = max(0, 100 - renewable - recycled)
    if "bio" in m or "compostable" in m or "pla" in m:
        renewable = max(renewable, 90)
        fossil = max(0, 100 - renewable - recycled)
    if "glass" in m:
        fossil = 5
        recycled = 30
        renewable = 0
    if "steel" in m or "tin" in m or "aluminium" in m or "aluminum" in m:
        fossil = 10
        recycled = 30
    # Normalise
    total = fossil + recycled + renewable
    if total == 0:
        fossil = 100
    return {"fossilPct": fossil, "recycledPct": recycled, "renewablePct": renewable}


def eol_split_for(eol: str) -> dict:
    e = (eol or "").lower()
    if "non-recyclable" in e or "landfill" in e:
        return {"recycled": 5, "composted": 0, "landfilled": 85, "incinerated": 10}
    if "kerbside" in e and "paper" in e:
        return {"recycled": 68, "composted": 0, "landfilled": 19, "incinerated": 13}
    if "kerbside" in e and ("pet" in e or "hdpe" in e or "pp" in e):
        return {"recycled": 55, "composted": 0, "landfilled": 35, "incinerated": 10}
    if "kerbside" in e and "glass" in e:
        return {"recycled": 65, "composted": 0, "landfilled": 28, "incinerated": 7}
    if "soft plastic" in e:
        return {"recycled": 60, "composted": 0, "landfilled": 30, "incinerated": 10}
    if "composta" in e or "industrial compost" in e:
        return {"recycled": 0, "composted": 55, "landfilled": 35, "incinerated": 10}
    if "reuse" in e:
        return {"recycled": 70, "composted": 0, "landfilled": 25, "incinerated": 5}
    if "mixed" in e:
        return {"recycled": 40, "composted": 0, "landfilled": 50, "incinerated": 10}
    return {"recycled": 30, "composted": 0, "landfilled": 60, "incinerated": 10}


def carbon_per_gram(material: str, eol: str) -> float:
    m = (material or "").lower()
    # Pick the dominant material signal
    for key in sorted(CARBON_FACTORS, key=len, reverse=True):
        if key in m:
            base = CARBON_FACTORS[key]
            break
    else:
        base = 0.025
    # EOL effect — landfill slightly worse, recycling slightly better
    e = (eol or "").lower()
    if "landfill" in e or "non-recyclable" in e:
        base *= 1.10
    elif "kerbside" in e or "recyclable" in e:
        base *= 0.92
    return base


def confidence_for(material_a: str, material_b: str) -> str:
    blob = f"{material_a} {material_b}".lower()
    if "bio" in blob or "compostable" in blob or "novel" in blob:
        return "medium"
    if any(k in blob for k in ("100% pcr", "100% rpet", "mono pe", "mono-pe", "paper", "rpet", "glass")):
        return "high"
    return "medium"


def mci_for(material: str, eol: str) -> int:
    m = (material or "").lower()
    e = (eol or "").lower()
    score = 30
    if "100% pcr" in m or "100% recycled" in m or "rpet" in m:
        score += 35
    elif "pcr" in m:
        score += 15
    if "paper" in m or "fsc" in m or "paperboard" in m:
        score += 30
    if "bio" in m or "compostable" in m or "pla" in m:
        score += 25
    if "glass" in m or "tin" in m or "steel" in m:
        score += 20
    if "mono" in m:
        score += 10
    if "kerbside" in e:
        score += 10
    if "soft plastic" in e:
        score += 5
    if "landfill" in e or "non-recyclable" in e:
        score -= 25
    if "reuse" in e:
        score += 25
    return max(5, min(98, score))


def slug_focus(area: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (area or "").lower()).strip("-")


def build_option(name_format, material, structure, weight, eol):
    if not name_format and not material:
        return None
    try:
        w = float(weight) if weight not in (None, "") else 0
    except (TypeError, ValueError):
        w = 0
    if w <= 0:
        # missing weight — best-effort default by format
        f = (name_format or "").lower()
        w = {"sup": 14, "bottle": 30, "jar": 80, "tub": 100, "tray": 18, "mailer": 13, "carton": 30}.get(f, 20)
    comp = composition_for(material or "")
    eol_split = eol_split_for(eol or "")
    cpg = carbon_per_gram(material or "", eol or "")
    return {
        "name": (name_format or "Option") + (f" — {material}" if material else ""),
        "format": name_format or "",
        "material": (material or "").strip() or "Generic",
        "structure": (structure or "").strip(),
        "weight": round(w, 2),
        "eol": (eol or "").strip() or "Mixed",
        # 100,000 units default volume
        "carbonKg": round(cpg * w * 100000),
        "mci": mci_for(material or "", eol or ""),
        "fossilPct": comp["fossilPct"],
        "recycledPct": comp["recycledPct"],
        "renewablePct": comp["renewablePct"],
        "eolSplit": eol_split,
    }


def infer_comparison_type(raw: str) -> str:
    if not raw:
        return "Material"
    r = raw.strip()
    canon = {
        "Material": "Material",
        "Format": "Format",
        "Supply Chain": "Supply Chain",
        "Lifecycle": "Lifecycle",
        "Elimination": "Elimination",
    }
    return canon.get(r, r)


def first_sentence(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    m = re.search(r"^(.+?[\.!?])(\s|$)", text)
    return m.group(1) if m else (text[:140] + ("…" if len(text) > 140 else ""))


def derive_meta(report: dict) -> dict:
    notes = report.get("notes") or ""
    summary = report.get("summary") or ""
    title = report.get("title") or ""
    key_finding = first_sentence(notes) or first_sentence(summary) or f"Compares {len(report['options'])} options for {title.lower()}."

    # Determine story type from options shape
    weights = [o["weight"] for o in report["options"]]
    materials = " ".join(o["material"].lower() for o in report["options"])
    has_renewable = any(o["renewablePct"] > 0 for o in report["options"])
    if max(weights) / max(min(weights), 1) > 3:
        story_type = "weight"
        primary = "weight"
        primary_title = "Material weight per unit"
        primary_why = "When the same product can be delivered in formats varying widely by weight, the lightest option typically wins on carbon."
    elif "paper" in materials and ("pcr" in materials or "mono" in materials):
        story_type = "counterintuitive"
        primary = "eol"
        primary_title = "End-of-life is where this comparison is won and lost"
        primary_why = "Upstream carbon costs are similar across these options. The decisive variable is where the packaging actually ends up after use."
    elif any(t in (report.get("comparisonType") or "").lower() for t in ("lifecycle", "elimination")):
        story_type = "lifecycle"
        primary = "carbon"
        primary_title = "Cumulative carbon across the lifecycle"
        primary_why = "The lifecycle math depends on how many cycles, fills, or uses each option delivers before disposal."
    elif has_renewable:
        story_type = "counterintuitive"
        primary = "composition"
        primary_title = "Material composition reveals the story"
        primary_why = "Recycled and renewable content materially change the cradle-to-grave carbon profile."
    else:
        story_type = "material"
        primary = "carbon"
        primary_title = "Annual carbon footprint"
        primary_why = "Total greenhouse-gas emissions across the full lifecycle for each option at standard annual volume."

    return {
        "storyType": story_type,
        "keyFinding": key_finding,
        "context": summary or notes or title,
        "primarySection": primary,
        "primaryTitle": primary_title,
        "primaryWhy": primary_why,
    }


def main():
    if not SOURCE_XLSX.exists():
        print(f"Missing source xlsx at {SOURCE_XLSX}", file=sys.stderr)
        sys.exit(1)
    wb = openpyxl.load_workbook(SOURCE_XLSX, read_only=True, data_only=True)
    ws = wb["Report Ideas"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    print(f"Header columns: {len(header)}")
    reports = []
    metas = {}
    for row in rows[1:]:
        if not row or not row[0]:
            continue
        rid = (row[0] or "").strip()
        if not rid:
            continue
        focus_area = (row[1] or "").strip() or "Stand-up Pouches"
        focus_area = FOCUS_AREA_NORMALISE.get(focus_area, focus_area)
        title = (row[2] or "").strip()
        industry = (row[3] or "").strip()
        comparison = infer_comparison_type(row[4] or "")
        pack_size = (row[5] or "").strip()

        opts = []
        for offset in (6, 11, 16):
            o = build_option(row[offset], row[offset + 1], row[offset + 2], row[offset + 3], row[offset + 4])
            if o:
                opts.append(o)
        if len(opts) < 2:
            continue
        notes = (row[21] or "").strip() if len(row) > 21 else ""

        materials_joined = " | ".join(o["material"] for o in opts)
        confidence = confidence_for(opts[0]["material"], opts[1]["material"])

        summary = notes if notes else f"{comparison} comparison: {materials_joined}."

        report = {
            "id": rid,
            "title": title,
            "focusArea": focus_area,
            "comparisonType": comparison,
            "industry": industry,
            "packSize": pack_size,
            "annualVolume": 100000,
            "confidence": confidence,
            "summary": summary,
            "notes": notes,
            "options": opts,
        }
        reports.append(report)
        metas[rid] = derive_meta(report)

    REPORTS_OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORTS_OUT.write_text(json.dumps(reports, indent=2))
    META_OUT.write_text(json.dumps(metas, indent=2))
    print(f"Wrote {len(reports)} reports -> {REPORTS_OUT}")
    print(f"Wrote {len(metas)} metas -> {META_OUT}")


if __name__ == "__main__":
    main()
