/** Files are checked by what is actually inside them, not by their name: browsers trust the extension, so a PNG or WebP saved as "photo.jpg" would be refused by the server.
 *  Big photos (5 to 12 MB from a phone) are also shrunk here: the long side to at most 2000 px, saved as JPEG. */
export const MAX_EDGE = 2000;
const KEEP_AS_IS_UNDER = 1_200_000;
const SENDABLE = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export function targetSize(width: number, height: number, maxEdge = MAX_EDGE): { w: number; h: number } {
  const k = Math.min(1, maxEdge / Math.max(width, height, 1));
  return { w: Math.max(1, Math.round(width * k)), h: Math.max(1, Math.round(height * k)) };
}

/** What a file really is, from its first bytes. */
export function sniffType(head: Uint8Array): string | undefined {
  const starts = (...b: number[]) => b.every((v, i) => head[i] === v);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) return "image/webp";
  if (starts(0x47, 0x49, 0x46)) return "image/gif";
  if (starts(0x42, 0x4d)) return "image/bmp";
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return /avi[fs]/.test(String.fromCharCode(...head.slice(8, 12))) ? "image/avif" : "image/heic";
  return undefined;
}

export type Plan = { do: "keep" } | { do: "retype"; type: string } | { do: "convert" };
/** Keep a file that is what it says; relabel one that is a different sendable type; convert anything big or unsendable (AVIF, GIF, HEIC and so on) to JPEG. PDFs are never converted. */
export function planFor(actual: string | undefined, declared: string, size: number): Plan {
  const kind = actual ?? declared;
  if (kind === "application/pdf") return actual === declared ? { do: "keep" } : { do: "retype", type: kind };
  if (!kind.startsWith("image/")) return { do: "keep" };
  if (!SENDABLE.includes(kind) || size > KEEP_AS_IS_UNDER) return { do: "convert" };
  return actual && actual !== declared ? { do: "retype", type: actual } : { do: "keep" };
}

async function toJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); // throws for a format this browser cannot decode (HEIC outside Safari)
  const { w, h } = targetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode failed");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
}

export async function prepareImage(file: File): Promise<File> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const plan = planFor(sniffType(head), file.type, file.size);
  if (plan.do === "keep") return file;
  if (plan.do === "retype") return new File([file], file.name, { type: plan.type });
  return toJpeg(file);
}
