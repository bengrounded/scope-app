import type { Config } from "tailwindcss";

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
        grounded: { green: "#5C8A4C", ink: "#0F172A" },
      },
      backgroundImage: {
        "scope-purple": "linear-gradient(135deg, #6366F1, #8B5CF6)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
