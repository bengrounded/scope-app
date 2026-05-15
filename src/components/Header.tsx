"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Mode = "internal" | "customer";

const NAV = [
  { href: "/library", label: "Library" },
  { href: "/learnings", label: "Learnings" },
  { href: "/build", label: "Build new" },
];

export default function Header() {
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<Mode>("internal");

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/library" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md scope-purple" aria-hidden />
          <span className="text-lg font-bold">scope</span>
          <span className="text-xs text-slate-400 font-medium ml-1">by Grounded</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`px-3 py-1 rounded ${mode === "internal" ? "bg-white shadow font-semibold" : "text-slate-600"}`}
          >
            Internal
          </button>
          <button
            type="button"
            onClick={() => setMode("customer")}
            className={`px-3 py-1 rounded ${mode === "customer" ? "bg-white shadow font-semibold" : "text-slate-600"}`}
          >
            Customer
          </button>
        </div>
        <div
          className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600"
          aria-hidden
        >
          B
        </div>
      </div>
    </header>
  );
}
