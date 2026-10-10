import { z } from "zod";
import { BlueprintError, ServiceUnreachableError } from "./layout-api";

const Schema = z.object({ mime_type: z.string(), data_base64: z.string() });
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";
export type StepImageBody = { industry: string; label: string; equipment: string[]; outputs: string[]; detail: string };

/** The model returns a large picture; it is shrunk in the browser so it is quick to store and light in the report. */
function shrink(mime: string, base64: string, width = 760): Promise<string> {
  return new Promise((resolve) => {
    const url = `data:${mime};base64,${base64}`;
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, width / img.naturalWidth);
        const canvas = document.createElement("canvas"); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.74));
      } catch { resolve(url); }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function fetchStepImage(body: StepImageBody): Promise<string> {
  const response = await fetch(`${apiBase}/api/step-image`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, equipment: body.equipment.slice(0, 8), outputs: body.outputs.slice(0, 6), detail: body.detail.slice(0, 420) }) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) throw new BlueprintError(String(response.status));
  const parsed = Schema.parse(await response.json());
  return shrink(parsed.mime_type, parsed.data_base64);
}
