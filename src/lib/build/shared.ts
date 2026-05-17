import type Anthropic from "@anthropic-ai/sdk";
import type { LibraryCatalog } from "@/lib/types";

export const PARSER_MODEL = "claude-sonnet-4-6";
export const NARRATIVE_MODEL = "claude-sonnet-4-6";

let cached: { value: LibraryCatalog; fetchedAt: number } | null = null;

export async function getLibrary(computeUrl: string): Promise<LibraryCatalog> {
  const TTL_MS = 5 * 60 * 1000;
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.value;
  const res = await fetch(`${computeUrl.replace(/\/$/, "")}/api/library`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Library fetch ${res.status}`);
  const value = (await res.json()) as LibraryCatalog;
  cached = { value, fetchedAt: Date.now() };
  return value;
}

export function extractToolInput<T>(
  message: Anthropic.Message,
  toolName: string,
): T {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as T;
    }
  }
  throw new Error(`Model did not call tool '${toolName}'`);
}

export function ephemeralId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NEW-${rand}`;
}

export const EOL_LABEL: Record<string, string> = {
  "Kerbside Recyclable - Plastic": "Kerbside recyclable",
  "Kerbside Recyclable - Paper": "Kerbside recyclable (paper)",
  "Soft Plastics Recyclable": "Soft-plastics recyclable",
  "Industrial Compostable": "Industrial compostable",
  "Home Compostable": "Home compostable",
  Landfill: "Non-recyclable / landfill",
  "Reusable / Refill": "Reusable / refill",
};
