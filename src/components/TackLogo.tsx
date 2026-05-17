"use client";

import { useId } from "react";

/**
 * Tack brand mark — rounded square with the blue → teal → green gradient
 * background and a six-blade swept asterisk on top. Each blade is a
 * quadratic Bézier curving in the same rotational direction so the mark
 * reads as "rolling forward" rather than a static asterisk.
 *
 * The single curve is defined once and rendered six times via 60° rotation
 * around the centre. Stroke thickness scales with the viewBox.
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

  // Each blade: starts at centre (0,0), curves to (0,-22) via a control point
  // offset perpendicular to the direction of travel — gives the "swept blade"
  // shape. We render 6 copies rotated by 60° each.
  const bladePath = "M 0 0 Q 5 -11 0 -22";
  const angles = [0, 60, 120, 180, 240, 300];

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
        <g
          transform="translate(32 32)"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        >
          {angles.map((a) => (
            <path key={a} d={bladePath} transform={`rotate(${a})`} />
          ))}
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
      <rect
        x="0"
        y="0"
        width="64"
        height="64"
        rx={r * (64 / size)}
        fill={`url(#${gradientId})`}
      />
      <g
        transform="translate(32 32)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
      >
        {angles.map((a) => (
          <path key={a} d={bladePath} transform={`rotate(${a})`} />
        ))}
      </g>
    </svg>
  );
}
