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

  // CSS custom properties feed the theming engine. Components opt in via
  // `bg-[var(--scope-primary)]`, `text-[var(--scope-primary)]`, etc.
  const styleVars: React.CSSProperties = {
    ["--scope-primary" as string]: tenant.primaryColor ?? "#5B5BD6",
    ["--scope-secondary" as string]: tenant.secondaryColor ?? "#EEF2FF",
  };

  return (
    <div style={styleVars} data-tenant={tenant.slug}>
      {children}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const tenant = await getTenantBySlug(params.tenant);
  if (!tenant) return {};
  return {
    title: { template: `%s — ${tenant.name}`, default: tenant.name },
  };
}
