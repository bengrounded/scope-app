import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-3">
        404
      </p>
      <h1 className="text-3xl font-bold mb-3">We couldn&apos;t find that report.</h1>
      <p className="text-slate-600 mb-6">
        The report ID doesn&apos;t exist in the library yet. Try the library, or build a new comparison.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/library" className="scope-purple text-white rounded-xl px-5 py-3 text-sm font-semibold">
          Browse the library
        </Link>
        <Link href="/build" className="border border-slate-200 bg-white rounded-xl px-5 py-3 text-sm font-semibold">
          Build new
        </Link>
      </div>
    </main>
  );
}
