import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_SCOPE_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://scope-app-gamma.vercel.app");

const SITE_TITLE = "Scope — Grounded's dynamic LCA tool";
const SITE_DESCRIPTION =
  "Compare any packaging. 376 pre-built LCA comparisons plus on-demand reports from any plain-English query — material vs format vs lifecycle vs region.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Scope",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Scope",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
