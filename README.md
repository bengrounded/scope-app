# Scope — dynamic LCA tool

A Next.js 14 frontend for Scope, Grounded's queryable LCA platform that
replaces the static Scope wizard. The library covers 376 packaging
comparisons across 13 focus areas; the report viewer renders each one in
a story-led layout with editorial lede, option cards, primary visual
chosen from the data, and a complete-picture supporting grid.

This is the engineering scaffold. The compute engine is stubbed in
`app/api/compute/route.ts` and falls back to returning the closest
pre-built library report when no Python service is configured.

---

## Architecture

```
+--------------------------+
|  Next.js 14 (this repo)  |
|  - App Router pages      |
|  - API routes (stubs)    |
|  - Static JSON library   |
+------------+-------------+
             |
             v   (planned, env: SCOPE_COMPUTE_URL)
+--------------------------+
|  Python compute service  |
|  - scope_compute.py      |
|  - FastAPI wrapper       |
+--------------------------+
             |
             v   (planned)
+--------------------------+
|  Supabase (Postgres)     |
|  - tenants / users       |
|  - reports / materials   |
|  - assumption overrides  |
+--------------------------+
```

Architecture principles (see `scope_build_plan.md` for the full doc):

1. **Tenant-aware from day 1.** Every record will carry `tenant_id`.
   Phase 1 has exactly one tenant: `grounded`. Phase 2 multi-tenants without
   a data migration.
2. **Library + assumptions separable from per-report data.** The 376-report
   brainstorm library is *shared system data*. User-generated reports are
   *tenant data*. This separation is reflected in how `src/data/*.json`
   loads today and how Supabase tables are scoped tomorrow.
3. **Compute engine externalised.** The LCA math lives in a Python service.
   The Next.js API just proxies.

---

## Local dev

```bash
npm install
npm run dev
# open http://localhost:3000
```

Routes:

| Path                 | What                                                         |
|----------------------|---------------------------------------------------------------|
| `/`                  | Hero with primary CTAs                                       |
| `/library`           | Filterable card grid (URL state for focus / type / search)   |
| `/learnings`         | Cross-database insights                                      |
| `/build`             | Hybrid NL + structured-form builder                          |
| `/reports/[id]`      | Story-led report viewer                                      |
| `/api/reports`       | List the library (filter / paginate)                         |
| `/api/reports/[id]`  | Single report + narrative metadata                           |
| `/api/compute`       | Stub — wire to Python service                                |
| `/api/library/materials` | Stub material catalogue                                  |

---

## Folder structure

```
scope-app/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Header + shell
│   ├── page.tsx               # Landing
│   ├── library/               # Library view (filterable card grid)
│   ├── learnings/             # Cross-database insights
│   ├── build/                 # Builder (NL + structured)
│   ├── reports/[id]/          # Story-led report viewer
│   └── api/
│       ├── reports/           # GET list + GET single
│       ├── compute/           # POST stub for the Python engine
│       └── library/materials/ # GET stub material catalogue
├── src/
│   ├── components/            # Reusable React components
│   │   ├── Header.tsx
│   │   ├── Lede.tsx
│   │   ├── OptionCard.tsx
│   │   ├── Equivalencies.tsx
│   │   ├── PrimarySection.tsx
│   │   ├── SupportingCard.tsx
│   │   ├── Recommendation.tsx
│   │   ├── ReportCard.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── BuilderForm.tsx
│   │   ├── Tooltip.tsx
│   │   └── charts/            # WeightChart, CarbonChart, EolChart...
│   ├── lib/                   # types, scoring, equivalencies, loaders
│   └── data/                  # reports.json, report_meta.json
├── scripts/
│   └── extract_reports.py     # one-shot: xlsx -> reports.json + report_meta.json
├── tailwind.config.ts         # config-based safelist for dynamic class names
├── next.config.mjs
├── tsconfig.json
└── .env.example
```

---

## Data extraction

The 376 reports are extracted from `scope_report_ideas.xlsx` (the brainstorm
spreadsheet) by `scripts/extract_reports.py`. Run it from the project root:

```bash
python3 scripts/extract_reports.py
# rewrites src/data/reports.json and src/data/report_meta.json
```

Override the source path with `SCOPE_REPORT_IDEAS_XLSX=/path/to/file.xlsx`.

`reports.json` contains the structured comparison data (options, weights,
EOL splits, carbon kg/year at 100,000 units). `report_meta.json` contains
the per-report narrative metadata (story type, key finding, primary
section, primary title, primary why). Where the spreadsheet lacks
explicit narrative copy, the extraction script derives sensible defaults
from the title and option shape.

The bundled JSON is correct as of extraction time — re-run the script
whenever the xlsx is updated.

---

## TODO for the engineer

The scaffold is complete enough to click through end-to-end. Everything
below is intentionally stubbed; pick these up in roughly this order.

### 1. Wire `app/api/compute/route.ts` to the Python engine

`scope_compute.py` lives at the repo root in the original deliverable.
Wrap it with FastAPI:

```python
# compute_service/main.py
from fastapi import FastAPI
from scope_compute import compute_report   # the existing engine

app = FastAPI()

@app.post("/compute")
def compute(req: dict) -> dict:
    result = compute_report(**req)
    return { "reportId": result["id"], "status": "computed", **result }
```

Deploy on Fly.io or Vercel Python runtime, set `SCOPE_COMPUTE_URL` in
`.env.local`. The stub in `app/api/compute/route.ts` already proxies to
this URL when present and falls back gracefully when absent.

### 2. Supabase setup

Create the schema in `scope_build_plan.md` ("Data model — tenant-ready"):
`tenants`, `users`, `reports`, `materials`, `assumptions`, `audit_log`.
Every table has a `tenant_id` column. Seed `tenants` with a single row
`grounded` for Phase 1.

Replace the JSON-backed loader in `src/lib/reports.ts` with a Supabase
query that filters by `tenant_id`. The rest of the app uses the same
interface — no other changes needed.

### 3. Auth

Phase 1: Google Workspace SSO via Supabase Auth, restricted to the
`@groundedpackaging.co` domain. Middleware should attach a `tenantId` to
every request from the auth context and the library/build/report views
should refuse to render without it.

Phase 2: multi-tenant routing (subdomain or `/[tenant]/...`).

### 4. Real material catalogue

`app/api/library/materials/route.ts` returns a stub list. Replace with
the full extraction from the .xlsm material catalogue (see Job 1 in the
build plan).

### 5. Hook into the chart layer

Charts currently render with deterministic stage splits (45/25/12/18) as
a placeholder for the lifecycle breakdown. Once the Python engine returns
per-stage carbon results, update `CarbonChart.tsx` to read those instead
of computing them from `carbonKg` × constant.

### 6. PDF export

The report viewer header references a future `Export PDF` button; not
implemented yet. Suggest `@react-pdf/renderer` or a server-side
`puppeteer` route for parity with the existing Scope PDF aesthetic.

### 7. packGPT integration

When packGPT identifies an LCA question, it should call
`POST /api/compute` with a normalised request body and embed the
resulting `reportId` in chat. Define the contract in
`packgpt_scope_integration_spec.md` and add an auth-token route here.

---

## Notes on quality

- **No `any` types.** TypeScript is in strict mode.
- **Tailwind safelist is config-based** (`tailwind.config.ts`), not
  injected as a hidden div. Dynamic `grid-cols-N` and `focus-*` class
  names are added to the safelist there.
- **No state management library.** Filter state lives in the URL via
  `useSearchParams`; everything else is `useState` local to the
  consuming component.
- **Responsive.** Library / report viewer / builder all collapse to
  single-column on narrow viewports.

---

## License

Internal Grounded project — not open-source.
