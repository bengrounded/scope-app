import type { Config } from "tailwindcss";

// Tack brand blue — aliases the legacy `indigo` palette across the app so
// every `text-indigo-600` / `bg-indigo-500` etc. inherits the rebrand
// without sweeping every file. Components introduced later should prefer
// `tack-*` for clarity.
const tackBlue = {
  50: "#EBF2FF",
  100: "#D6E5FF",
  200: "#ADC9FF",
  300: "#85AEFF",
  400: "#5C92FF",
  500: "#3D7AFF",
  600: "#1F66FF", // primary — the asterisk colour
  700: "#1850D6",
  800: "#133FAA",
  900: "#0E2E7E",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  safelist: [
    "grid-cols-1",
    "grid-cols-2",
    "grid-cols-3",
    "grid-cols-4",
    "grid-cols-5",
    "focus-coffee",
    "focus-vitamins",
    "focus-refill",
    "focus-sup",
    "focus-ecomm",
    "focus-technical",
    "focus-flexibles",
    "focus-pet",
    "focus-beverages",
    "focus-cosmetics",
    "focus-elim",
  ],
  theme: {
    extend: {
      colors: {
        // Rebrand: every existing `indigo-*` class points at Tack blue.
        indigo: tackBlue,
        tack: tackBlue,
        grounded: { green: "#5C8A4C", ink: "#0F172A" },
      },
      backgroundImage: {
        "scope-purple": "linear-gradient(135deg, #1F66FF, #5C92FF)",
      },
      fontFamily: {
        // Inter is wired via next/font in app/layout.tsx as --font-sans.
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
