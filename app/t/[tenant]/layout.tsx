import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";

interface Props {
  children: React.ReactNode;
  params: { tenant: string };
}

/**
 * Tenant-scoped layout. Verifies the slug resolves to a real tenant, and
 * injects per-tenant CSS variables (theming engine — Day 8). Returns 404 if
 * the slug is unknown so Phase 2 customers can't probe for valid tenants.
 */
export default async function TenantLayout({ children, params }: Props) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) return notFound();

  // CSS custom properties feed the theming engine. .scope-purple, .accent-text,
  // .filter-chip.active, .insight-box all read these.
  const primary = tenant.primaryColor ?? "#6366F1";
  const secondary = tenant.secondaryColor ?? "#8B5CF6";
  const styleVars: React.CSSProperties = {
    ["--scope-primary" as string]: primary,
    ["--scope-primary-rgb" as string]: hexToRgb(primary),
    ["--scope-accent-gradient" as string]: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };

  return (
    <div style={styleVars} data-tenant={tenant.slug}>
      {children}
    </div>
  );
}

/** Convert "#RRGGBB" to "r, g, b" for use in CSS rgba(). */
function hexToRgb(hex: string): string {
  const m = hex.match(/^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i);
  if (!m) return "99, 102, 241";
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

export async function generateMetadata({ params }: Props) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) return {};
  return {
    title: { template: `%s — ${tenant.name}`, default: tenant.name },
  };
}
