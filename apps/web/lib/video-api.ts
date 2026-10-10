import { z } from "zod";
import { BlueprintError, ServiceUnreachableError } from "./layout-api";

const Schema = z.object({ job_id: z.string(), status: z.enum(["working", "done", "failed"]), url: z.string().nullish(), message: z.string().nullish() });
export type VideoJob = z.infer<typeof Schema>;
export type VideoBody = { industry: string; label: string; equipment: string[]; outputs: string[]; detail: string; focus: "process" | "water"; water_note: string };
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

async function read(response: Response): Promise<VideoJob> {
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    throw message ? new BlueprintError(message) : new ServiceUnreachableError(String(response.status));
  }
  return Schema.parse(await response.json());
}
export const startVideo = (body: VideoBody) => fetch(`${apiBase}/api/step-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, equipment: body.equipment.slice(0, 8), outputs: body.outputs.slice(0, 6), detail: body.detail.slice(0, 420), water_note: body.water_note.slice(0, 400) }) }).catch(() => { throw new ServiceUnreachableError("network"); }).then(read);
export const videoStatus = (id: string) => fetch(`${apiBase}/api/step-video/${encodeURIComponent(id)}`).catch(() => { throw new ServiceUnreachableError("network"); }).then(read);
export const videoSrc = (url: string) => `${apiBase}${url}`;

const KEY = "quantaris-videos";
export const videoKey = (industry: string, label: string, focus: string) => `${industry.trim().toLowerCase()}|${label.trim().toLowerCase()}|${focus}`.slice(0, 300);
/** Remembers which clip belongs to which step, so reopening the step shows the clip that was already paid for instead of starting a new one. */
export function rememberedJob(key: string): string | undefined { try { return (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, string>)[key]; } catch { return undefined; } }
export function rememberJob(key: string, id: string) { try { const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, string>; all[key] = id; const keys = Object.keys(all); if (keys.length > 60) delete all[keys[0]]; window.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* not remembered */ } }
