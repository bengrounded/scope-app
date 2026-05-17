/**
 * Tack brand asterisk — six-armed star drawn as three crossing strokes.
 * Inherits `currentColor` so it can be coloured per surface (header,
 * favicon, OG card, etc).
 */
export default function TackLogo({
  size = 24,
  className,
  title = "Tack",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <g
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      >
        <line x1="12" y1="2.5" x2="12" y2="21.5" />
        <line x1="3.75" y1="6.75" x2="20.25" y2="17.25" />
        <line x1="3.75" y1="17.25" x2="20.25" y2="6.75" />
      </g>
    </svg>
  );
}
