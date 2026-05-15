import Link from "next/link";
import { getAllReports } from "@/lib/reports";

export default function HomePage() {
  const reports = getAllReports();
  return (
    <main className="max-w-7xl mx-auto px-6 py-16 fade-in">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-3">
          Scope — by Grounded
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          Compare any packaging.{" "}
          <span className="accent-text">Get the answer.</span>
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed mb-8">
          Browse {reports.length} pre-built LCA comparisons across material, format, supply-chain, lifecycle and elimination — or describe a new comparison in plain English and have it computed on the fly.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/library"
            className="px-5 py-3 scope-purple text-white rounded-xl text-base font-semibold hover:opacity-90"
          >
            Open the library
          </Link>
          <Link
            href="/build"
            className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-base font-semibold hover:bg-slate-100"
          >
            Build a new comparison
          </Link>
          <Link
            href="/learnings"
            className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-base font-semibold hover:bg-slate-100"
          >
            See cross-database learnings
          </Link>
        </div>
      </div>
    </main>
  );
}
