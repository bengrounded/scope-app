import { ImageResponse } from "next/og";
import { getReport } from "@/lib/reports";
import { loadPersistedReport } from "@/lib/reports/persist";
import { getTenantBySlug } from "@/lib/tenant";

// Next.js OG image conventions.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Scope LCA comparison";

interface Props {
  params: { tenant: string; id: string };
}

export default async function ReportOG({ params }: Props) {
  const [tenant, lib] = await Promise.all([
    getTenantBySlug(params.tenant),
    Promise.resolve(getReport(params.id)),
  ]);
  const persisted = lib
    ? null
    : await loadPersistedReport(params.id, params.tenant);
  const report = lib ?? persisted?.report;

  // Fallback card when the id doesn't resolve.
  if (!report) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            fontSize: 48,
            color: "#0f172a",
          }}
        >
          Scope · LCA report
        </div>
      ),
      size,
    );
  }

  const primary = tenant?.primaryColor ?? "#6366F1";
  const carbons = report.options.map((o) => o.carbonKg);
  const lowest = Math.min(...carbons);
  const highest = Math.max(...carbons);
  const deltaPct =
    highest > 0 ? Math.round(((highest - lowest) / highest) * 100) : 0;
  const winner =
    report.options.find((o) => o.carbonKg === lowest)?.name ?? "";
  // Satori treats every JSX text fragment as a separate child node and
  // demands display:flex when there are >1 children. Stringify ahead of
  // time so each <div> renders a single text node.
  const tenantName = tenant?.name ?? "Grounded";
  const byTenant = `by ${tenantName}`;
  const focusTag = `${report.options.length}-way · ${report.focusArea}`;
  const deltaText = `−${deltaPct}%`;
  const titleText =
    report.title.length > 90 ? report.title.slice(0, 87) + "…" : report.title;
  const summaryText = report.summary
    ? report.summary.length > 220
      ? report.summary.slice(0, 217) + "…"
      : report.summary
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0f172a",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: primary,
            }}
          />
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
            scope
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "#94a3b8",
              marginLeft: 4,
            }}
          >
            {byTenant}
          </div>
          <div style={{ flexGrow: 1 }} />
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#64748b",
              fontFamily: "monospace",
            }}
          >
            {report.id}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 28,
          }}
        >
          {titleText}
        </div>

        {/* Summary */}
        {summaryText && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              lineHeight: 1.4,
              color: "#475569",
              marginBottom: "auto",
            }}
          >
            {summaryText}
          </div>
        )}

        {/* Footer stats */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 40,
            borderTop: "1px solid #e2e8f0",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              {focusTag}
            </div>
            <div
              style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#0f172a" }}
            >
              {winner}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Carbon delta
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 800,
                color: "#059669",
              }}
            >
              {deltaText}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
