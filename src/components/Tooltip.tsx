"use client";

import { useState, type ReactNode } from "react";
import { ASSUMPTIONS, type AssumptionKey } from "@/lib/assumptions";

interface TooltipProps {
  children: ReactNode;
  assumption?: AssumptionKey;
  label?: string;
  source?: string;
  detail?: string;
  confidence?: "high" | "medium" | "low";
}

/**
 * Hover-revealing tooltip used to attach provenance to every reported value.
 * Underlined trigger; popover stays open while hovered.
 */
export default function Tooltip({
  children,
  assumption,
  label,
  source,
  detail,
  confidence,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const a = assumption ? ASSUMPTIONS[assumption] : null;
  const finalLabel = label ?? a?.label;
  const finalSource = source ?? a?.source;
  const finalDetail = detail ?? a?.detail;
  const finalConfidence = confidence ?? a?.confidence;

  if (!finalLabel && !finalSource && !finalDetail) {
    return <>{children}</>;
  }

  const confidenceClass =
    finalConfidence === "high"
      ? "bg-emerald-900 text-emerald-200"
      : finalConfidence === "medium"
        ? "bg-amber-900 text-amber-200"
        : "bg-rose-900 text-rose-200";

  return (
    <span
      className="relative inline cursor-help border-b border-dashed border-slate-400"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-60 bg-slate-900 text-white p-3 rounded-md text-[11px] leading-relaxed text-left font-normal shadow-lg">
          {finalLabel && <strong className="block mb-1 font-semibold">{finalLabel}</strong>}
          {finalSource && <span className="block">Source: {finalSource}</span>}
          {finalDetail && <span className="block mt-1 opacity-90">{finalDetail}</span>}
          {finalConfidence && (
            <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] ${confidenceClass}`}>
              {finalConfidence} confidence
            </span>
          )}
        </span>
      )}
    </span>
  );
}
