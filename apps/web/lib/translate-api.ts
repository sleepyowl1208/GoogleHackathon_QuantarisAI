import { z } from "zod";
import { BlueprintError, ServiceUnreachableError } from "./layout-api";
import type { Language } from "./chat-api";

const Schema = z.object({ texts: z.array(z.string()) });
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";
const CHUNK = 70;

async function one(language: Language, texts: string[]): Promise<string[]> {
  const response = await fetch(`${apiBase}/api/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language, texts }) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) throw new BlueprintError(String(response.status));
  const parsed = Schema.parse(await response.json());
  if (parsed.texts.length !== texts.length) throw new BlueprintError("length");
  return parsed.texts;
}

/** Translates in parallel chunks and returns the results in the same order. */
export async function translateTexts(language: Language, texts: string[]): Promise<string[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += CHUNK) chunks.push(texts.slice(i, i + CHUNK));
  return (await Promise.all(chunks.map((chunk) => one(language, chunk.map((t) => t.slice(0, 600)))))).flat();
}
