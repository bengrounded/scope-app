import { Suspense } from "react";
import { getAllReports } from "@/lib/reports";
import LibraryClient from "./LibraryClient";

export const metadata = { title: "Library — Scope" };

export default function LibraryPage() {
  const reports = getAllReports();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading library…</div>}>
      <LibraryClient reports={reports} />
    </Suspense>
  );
}
