import { Suspense } from "react";
import { getAllReports } from "@/lib/reports";
import LibraryClient from "./LibraryClient";

export const metadata = {
  title: "Library",
  description: "376 pre-built LCA comparisons. Filter by focus area, comparison type, or search.",
  openGraph: {
    title: "Library — Scope",
    description: "376 pre-built LCA comparisons. Filter by focus area, comparison type, or search.",
  },
};

export default function LibraryPage() {
  const reports = getAllReports();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading library…</div>}>
      <LibraryClient reports={reports} />
    </Suspense>
  );
}
