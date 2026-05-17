"use client";

import { useId } from "react";

/**
 * Tack brand mark — rounded square with the blue → teal → green gradient
 * background and the white asterisk on top.
 *
 * Renders inline as a square. Use the `size` prop to scale. The `radius`
 * prop controls the corner rounding (defaults to ~22% of size to mimic
 * iOS-style app-icon proportions). Pass `flat` to drop the gradient
 * background and render just a single-colour asterisk (inherits
 * currentColor) — useful for tight monochrome contexts.
 */
export default function TackLogo({
  size = 24,
  radius,
  className,
  flat = false,
  title = "Tack",
}: {
  size?: number;
  radius?: number;
  className?: string;
  flat?: boolean;
  title?: string;
}) {
  const gradientId = useId();
  const r = radius ?? Math.round(size * 0.22);

  if (flat) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label={title}
      >
        <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
          <line x1="32" y1="10" x2="32" y2="54" />
          <line x1="13" y1="22" x2="51" y2="42" />
          <line x1="13" y1="42" x2="51" y2="22" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1F66FF" />
          <stop offset="55%" stopColor="#4FA5C2" />
          <stop offset="100%" stopColor="#B8C771" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx={r * (64 / size)} fill={`url(#${gradientId})`} />
      <g stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round">
        <line x1="32" y1="12" x2="32" y2="52" />
        <line x1="14" y1="22" x2="50" y2="42" />
        <line x1="14" y1="42" x2="50" y2="22" />
      </g>
    </svg>
  );
}
