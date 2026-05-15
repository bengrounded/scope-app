import type { Metadata } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scope — Grounded's dynamic LCA tool",
  description:
    "Compare any packaging. Browse 376 pre-built comparisons or describe what you want to compare in plain English.",
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
