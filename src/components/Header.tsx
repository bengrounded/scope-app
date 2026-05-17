"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SessionPill from "./SessionPill";
import TackLogo from "./TackLogo";
import { DEFAULT_TENANT_SLUG, tenantSlugFromPath } from "@/lib/tenant";

const NAV_ITEMS = [
  { sub: "library", label: "Library" },
  { sub: "learnings", label: "Learnings" },
  { sub: "build", label: "Build new" },
] as const;

export default function Header() {
  const pathname = usePathname() || "/";
  if (pathname === "/login") return null;

  const tenantSlug = tenantSlugFromPath(pathname) || DEFAULT_TENANT_SLUG;
  const home = `/t/${tenantSlug}/library`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href={home} className="flex items-center gap-2 group">
          <TackLogo size={28} radius={6} />
          <span className="text-xl font-bold tracking-tight text-slate-900">
            scope
          </span>
          <span className="text-xs font-medium text-slate-400 ml-1">
            by{" "}
            <span className="text-slate-700 font-semibold tracking-tight">
              tack
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const href = `/t/${tenantSlug}/${item.sub}`;
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={item.sub}
                href={href}
                className={`px-3.5 py-1.5 rounded-md text-sm ${
                  active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <SessionPill />
      </div>
    </header>
  );
}
