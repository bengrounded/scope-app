import { Suspense } from "react";
import BuilderForm from "@/components/BuilderForm";

export const metadata = {
  title: "Build new",
  description: "Describe a packaging comparison in plain English; Scope runs the LCA and writes the story.",
  openGraph: {
    title: "Build a new comparison — Scope",
    description: "Describe it in plain English; Scope runs the LCA and writes the story.",
  },
};

export default function BuildPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8 fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Build a new comparison</h1>
        <p className="text-slate-600">
          Describe it in plain English, or pick from the structured prompts. The form fills as you type.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">Loading builder…</div>}>
        <BuilderForm />
      </Suspense>
    </main>
  );
}
