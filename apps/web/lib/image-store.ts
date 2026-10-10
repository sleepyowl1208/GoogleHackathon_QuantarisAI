/** Step illustrations are kept in the browser's IndexedDB (far roomier than localStorage, which holds the chats) with a memory copy for instant reads. */
const mem = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
const bump = () => { version += 1; listeners.forEach((l) => l()); };
const DB = "quantaris", STORE = "step-images", MAX_KEPT = 60;

export const subscribeImages = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const imagesVersion = () => version;
export const peekImage = (key: string): string | undefined => mem.get(key);

/** The same step of the same kind of plant gets the same key, so a repeated design reuses its pictures. */
export function imageKey(industry: string, label: string, equipment: string[]): string {
  return `${industry.trim().toLowerCase()}|${label.trim().toLowerCase()}|${equipment.map((e) => e.trim().toLowerCase()).sort().join(",")}`.slice(0, 400);
}

function open(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(undefined); req.onblocked = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}
const done = <T,>(req: IDBRequest<T>) => new Promise<T | undefined>((resolve) => { req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(undefined); });

export async function loadImages(keys: string[]): Promise<void> {
  const need = keys.filter((k) => !mem.has(k)); if (!need.length) return;
  const db = await open(); if (!db) return;
  try {
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    let found = false;
    for (const key of need) { const value = await done(store.get(key)); if (typeof value === "string") { mem.set(key, value); found = true; } }
    if (found) bump();
  } catch { /* unreadable storage: pictures are simply fetched again */ } finally { db.close(); }
}

export async function saveImage(key: string, dataUrl: string): Promise<void> {
  mem.set(key, dataUrl); bump();
  const db = await open(); if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite"); const store = tx.objectStore(STORE);
    store.put(dataUrl, key);
    const keys = (await done(store.getAllKeys())) ?? [];
    if (keys.length > MAX_KEPT) for (const old of keys.slice(0, keys.length - MAX_KEPT)) store.delete(old);
  } catch { /* quota or blocked: the picture stays for this visit */ } finally { db.close(); }
}
