import Link from "next/link";
import { getAllReports } from "@/lib/reports";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant";
import TackLogo from "@/components/TackLogo";

export default function HomePage() {
  const reports = getAllReports();
  const t = DEFAULT_TENANT_SLUG;
  return (
    <main className="max-w-7xl mx-auto px-6 py-16 fade-in">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-tack-600 font-semibold mb-3">
          <TackLogo size={14} className="text-tack-600" />
          Scope by Tack
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
            href={`/t/${t}/library`}
            className="px-5 py-3 scope-purple text-white rounded-xl text-base font-semibold hover:opacity-90"
          >
            Open the library
          </Link>
          <Link
            href={`/t/${t}/build`}
            className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-base font-semibold hover:bg-slate-100"
          >
            Build a new comparison
          </Link>
          <Link
            href={`/t/${t}/learnings`}
            className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-base font-semibold hover:bg-slate-100"
          >
            See cross-database learnings
          </Link>
        </div>
      </div>
    </main>
  );
}
