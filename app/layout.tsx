import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_SCOPE_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://scope-app-gamma.vercel.app");

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const SITE_TITLE = "Scope by Tack — dynamic LCA";
const SITE_DESCRIPTION =
  "Compare any packaging. Hundreds of pre-built LCA comparisons plus on-demand reports from any plain-English query — material vs format vs lifecycle vs region.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Scope by Tack",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Scope by Tack",
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
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        <Header />
        {children}
      </body>
    </html>
  );
}
