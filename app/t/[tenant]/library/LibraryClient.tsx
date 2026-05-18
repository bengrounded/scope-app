"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Report } from "@/lib/types";
import ReportCard from "@/components/ReportCard";
import FilterSidebar from "@/components/FilterSidebar";

interface Props {
  reports: Report[];
  tenantSlug: string;
}

// URL-state-backed filters keep deep-linkable views without a state library.
function parseList(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").filter(Boolean);
}

/** Tokenise a search query the same way the build-form searcher does:
 * lowercase, split on non-alphanumeric, drop short tokens. Lets a long
 * sentence like "compostable pouch HDPE tube paper-based" match reports
 * that contain any of those keywords, instead of demanding the whole
 * phrase appear verbatim. */
function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9-]+/)
        .filter((t) => t.length >= 3),
    ),
  );
}

function scoreReport(report: Report, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const blob = [
    report.title,
    report.summary,
    report.industry,
    report.id,
    ...(report.options ?? []).flatMap((o) => [
      o.name,
      o.material,
      o.structure,
      o.format,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.reduce((s, t) => s + (blob.includes(t) ? 1 : 0), 0);
}

export default function LibraryClient({ reports, tenantSlug }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const libraryRoot = `/t/${tenantSlug}/library`;

  const focusAreas = parseList(params.get("focus"));
  const comparisonTypes = parseList(params.get("type"));
  const search = params.get("q") || "";

  const [searchInput, setSearchInput] = useState(search);

  const filtered = useMemo(() => {
    const tokens = tokenize(search);
    return reports
      .map((r) => ({ r, score: scoreReport(r, tokens) }))
      .filter(({ r, score }) => {
        if (focusAreas.length && !focusAreas.includes(r.focusArea)) return false;
        if (comparisonTypes.length && !comparisonTypes.includes(r.comparisonType)) return false;
        if (tokens.length && score === 0) return false;
        return true;
      })
      .sort((a, b) => (tokens.length ? b.score - a.score : 0))
      .map(({ r }) => r);
  }, [reports, focusAreas, comparisonTypes, search]);

  function pushParams(next: { focus?: string[]; type?: string[]; q?: string }) {
    const usp = new URLSearchParams();
    const nf = next.focus ?? focusAreas;
    const nt = next.type ?? comparisonTypes;
    const nq = next.q ?? search;
    if (nf.length) usp.set("focus", nf.join(","));
    if (nt.length) usp.set("type", nt.join(","));
    if (nq) usp.set("q", nq);
    router.push(`${libraryRoot}${usp.toString() ? `?${usp.toString()}` : ""}`);
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  return (
    <section className="fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Compare any packaging. Get the answer.</h1>
        <p className="text-slate-600 text-base mb-6">
          Search {reports.length} pre-built comparisons or describe what you want to compare in plain English.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushParams({ q: searchInput });
          }}
          className="relative max-w-2xl"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              // Live-search as the user types — push the query through URL
              // state so filters + search remain shareable, and the
              // tokenised matcher updates the visible card grid in real
              // time.
              pushParams({ q: e.target.value });
            }}
            placeholder="e.g. compostable pouch vs HDPE tube — keywords, not full sentences"
            className="w-full px-5 py-4 pr-32 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-4 scope-purple text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            Search →
          </button>
        </form>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <FilterSidebar
          focusAreas={focusAreas}
          comparisonTypes={comparisonTypes}
          search={search}
          onToggleFocus={(fa) => pushParams({ focus: toggle(focusAreas, fa) })}
          onToggleComparison={(ct) => pushParams({ type: toggle(comparisonTypes, ct) })}
          onClear={() => {
            setSearchInput("");
            router.push(libraryRoot);
          }}
        />

        <section className="col-span-12 md:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {filtered.length} of {reports.length} reports
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-slate-600 mb-3">No reports match your filters.</p>
              <a
                href={`/t/${tenantSlug}/build`}
                className="inline-block scope-purple text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Build a new one →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <ReportCard key={r.id} report={r} tenantSlug={tenantSlug} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
