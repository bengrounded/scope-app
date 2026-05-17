import { Suspense } from "react";
import { getAllReports } from "@/lib/reports";
import { listTenantReports } from "@/lib/reports/persist";
import TenantReportsTable from "@/components/TenantReportsTable";
import LibraryClient from "./LibraryClient";

export const metadata = {
  title: "Library",
  description:
    "376 pre-built LCA comparisons + your team's generated reports.",
  openGraph: {
    title: "Library — Scope",
    description:
      "376 pre-built LCA comparisons + your team's generated reports.",
  },
};

// Tenant reports come from Postgres → must render on demand.
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  params,
}: {
  params: { tenant: string };
}) {
  const reports = getAllReports();
  const tenantReports = await listTenantReports(params.tenant);
  return (
    <main className="max-w-7xl mx-auto px-6 py-8 fade-in">
      <TenantReportsTable reports={tenantReports} tenantSlug={params.tenant} />
      <Suspense
        fallback={<div className="p-8 text-sm text-slate-500">Loading library…</div>}
      >
        <LibraryClient reports={reports} tenantSlug={params.tenant} />
      </Suspense>
    </main>
  );
}
