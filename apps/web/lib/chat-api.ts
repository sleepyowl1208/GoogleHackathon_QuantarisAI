import { z } from "zod";
import { BlueprintError, ClaimSchema, LayoutResultSchema, ServiceUnreachableError, WasteSchema } from "./layout-api";
import { SiteConditionsSchema } from "./research-api";

const ImprovementSchema = z.object({
  business: z.string(),
  as_is_steps: z.array(z.object({ label: z.string(), note: z.string().default("") })).default([]),
  opportunities: z.array(z.object({
    title: z.string(), why_it_fits: z.string().default(""), needs: z.array(z.string()).default([]), outputs: z.array(z.string()).default([]),
    effort: z.enum(["low", "medium", "high"]).default("medium"), environmental_benefit: z.string().default(""), risks: z.string().default(""), verify: z.string().default(""),
  })).default([]),
  hotspots: z.array(z.object({ area: z.string(), description: z.string(), quick_fix: z.string().default("") })).default([]),
  waste_streams: z.array(WasteSchema).default([]),
  questions: z.array(z.string()).default([]),
  claims: z.array(ClaimSchema).default([]),
  attachments_used: z.number().default(0),
  as_is_layout: LayoutResultSchema.nullish(),
  proposed_layout: LayoutResultSchema.nullish(),
  proposal_map: z.array(z.object({ title: z.string(), zone_ids: z.array(z.string()) })).default([]),
});
export const ChatResponseSchema = z.object({
  route: z.enum(["clarify", "answer", "new_design", "existing_analysis"]),
  assistant_text: z.string(),
  suggestions: z.array(z.string()).default([]),
  mode: z.enum(["new", "existing"]).nullish(),
  language: z.enum(["en", "hi"]),
  design: LayoutResultSchema.nullish(),
  improvement: ImprovementSchema.nullish(),
  prompt_used: z.string().nullish(),
  title: z.string().nullish(),
  industry: z.string().nullish(),
  location: z.string().nullish(),
  site: SiteConditionsSchema.nullish(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
});

export type Improvement = z.infer<typeof ImprovementSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type Mode = "new" | "existing";
export type Language = "en" | "hi";
export type OutgoingAttachment = { name: string; mime: string; data_base64: string };
export type ChatRequestBody = {
  messages: { role: "user" | "assistant"; text: string }[]; mode: Mode | null; language: Language;
  attachments?: OutgoingAttachment[]; last_prompt?: string | null; context?: string | null;
};

// Same-origin by default: next.config.ts proxies /api to the Python service. Set NEXT_PUBLIC_LAYOUT_API_URL to call a deployed API directly.
// (Next.js only inlines NEXT_PUBLIC_* values written as literal `process.env.NEXT_PUBLIC_X` accesses.)
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendChat(body: ChatRequestBody): Promise<ChatResponse> {
  const response = await fetch(`${apiBase}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    if (response.status === 422) {
      const detail = JSON.stringify(payload?.detail ?? "");
      throw new BlueprintError(/do not match the stated type/i.test(detail) ? "That file isn't the type its name says. Please save it again as a JPEG or PNG and try once more." : /at most|too long|string_too_long/i.test(detail) ? "That message is too long. Please shorten it." : "That message or file couldn't be processed. Please try a shorter message or a different file.");
    }
    throw new ServiceUnreachableError(String(response.status));
  }
  return ChatResponseSchema.parse(await response.json());
}

export function fileToAttachment(file: File): Promise<OutgoingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => { const result = String(reader.result); resolve({ name: file.name.slice(0, 120), mime: file.type, data_base64: result.slice(result.indexOf(",") + 1) }); };
    reader.readAsDataURL(file);
  });
}
