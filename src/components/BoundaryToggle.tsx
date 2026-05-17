"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarbonBoundary } from "@/lib/types";
import { BOUNDARY_DESCRIPTION, BOUNDARY_LABEL } from "@/lib/boundary";

/**
 * Two-state segmented control for the system boundary. Two modes:
 *
 * - URL mode (default): backed by the `boundary` search param. Used on the
 *   static report viewer where the page is server-rendered and the toggle
 *   needs to be share-link-friendly.
 * - Controlled mode: pass `value` + `onChange` for transient state (e.g.
 *   the inline render in BuilderForm's BuilderResultView).
 *
 * `disabled` greys both options out with a tooltip — used when the report
 * doesn't carry per-stage carbon breakdown (legacy library rows).
 */
interface Props {
  value?: CarbonBoundary;
  onChange?: (b: CarbonBoundary) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const OPTIONS: CarbonBoundary[] = ["gate", "grave"];

export default function BoundaryToggle({
  value,
  onChange,
  disabled = false,
  disabledReason,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlMode = value === undefined;
  const current: CarbonBoundary = urlMode
    ? params.get("boundary") === "gate"
      ? "gate"
      : "grave"
    : value;

  function setBoundary(next: CarbonBoundary) {
    if (disabled || next === current) return;
    if (urlMode) {
      const usp = new URLSearchParams(params.toString());
      if (next === "gate") usp.set("boundary", "gate");
      else usp.delete("boundary");
      router.replace(`${pathname}${usp.toString() ? `?${usp.toString()}` : ""}`, { scroll: false });
    } else {
      onChange?.(next);
    }
  }

  return (
    <div
      className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md text-xs"
      title={disabled ? disabledReason : undefined}
    >
      {OPTIONS.map((b) => {
        const active = b === current;
        return (
          <button
            key={b}
            type="button"
            onClick={() => setBoundary(b)}
            disabled={disabled}
            className={`px-2.5 py-1 rounded transition ${
              active
                ? "bg-white shadow-sm font-semibold text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            title={BOUNDARY_DESCRIPTION[b]}
          >
            {BOUNDARY_LABEL[b]}
          </button>
        );
      })}
    </div>
  );
}
