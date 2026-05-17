import Link from "next/link";
import type { TenantReportSummary } from "@/lib/reports/persist";
import { focusClassForArea } from "@/lib/focus";

interface Props {
  reports: TenantReportSummary[];
  tenantSlug: string;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TenantReportsTable({ reports, tenantSlug }: Props) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">
            Your team&apos;s reports
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({reports.length})
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reports generated through the build flow. Click any row to open.
          </p>
        </div>
        <Link
          href={`/t/${tenantSlug}/build`}
          className="text-xs scope-purple text-white px-3 py-2 rounded-md font-medium hover:opacity-90"
        >
          + Build new
        </Link>
      </div>
      {reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          No reports generated yet.{" "}
          <Link
            href={`/t/${tenantSlug}/build`}
            className="text-indigo-600 font-medium hover:underline"
          >
            Build your first one →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Focus</th>
                  <th className="text-left px-4 py-2.5 font-medium">Industry</th>
                  <th className="text-left px-4 py-2.5 font-medium">Options</th>
                  <th className="text-left px-4 py-2.5 font-medium">Author</th>
                  <th className="text-right px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/t/${tenantSlug}/reports/${r.id}`}
                        className="font-mono text-xs text-indigo-600 hover:underline"
                      >
                        {r.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[320px]">
                      <Link
                        href={`/t/${tenantSlug}/reports/${r.id}`}
                        className="text-slate-900 hover:text-indigo-700 line-clamp-2"
                      >
                        {r.title}
                      </Link>
                      {r.packSize && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {r.packSize}
                          {r.annualVolume
                            ? ` · ${r.annualVolume.toLocaleString()} units/yr`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.focusArea ? (
                        <span
                          className={`chip ${focusClassForArea(r.focusArea)}`}
                        >
                          {r.focusArea}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {r.industry ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 max-w-[280px]">
                      <div className="font-medium">
                        {r.optionsCount}-way
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {r.optionNames.join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {r.authorEmail || r.authorName ? (
                        <span title={r.authorEmail ?? undefined}>
                          {r.authorName ?? r.authorEmail}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {relativeTime(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
