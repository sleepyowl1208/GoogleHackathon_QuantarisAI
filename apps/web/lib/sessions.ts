import type { Improvement, Language, Mode } from "./chat-api";
import type { Insights } from "./insights-api";
import type { BestPractices } from "./practices-api";
import type { BuildCosts } from "./costs-api";
import type { StepEnv } from "./step-env-api";
import type { Piece } from "./translate-logic";
import type { LayoutResult } from "./layout-api";
import type { SiteConditions, SiteResearch } from "./research-api";

export type Message = { id: string; role: "user" | "assistant"; text: string; suggestions?: string[]; files?: string[]; error?: boolean; summary?: boolean; sources?: { title: string; url: string }[]; lang?: Language; alt?: Partial<Record<Language, { text: string; suggestions?: string[] }>>; prompt?: Mode };
export type Session = { id: string; title: string; createdAt: number; updatedAt: number; mode?: Mode; messages: Message[]; design?: LayoutResult; improvement?: Improvement; lastPrompt?: string; site?: SiteConditions; research?: SiteResearch; researchKey?: string; insights?: Insights; practices?: BestPractices; practicesKey?: string; costs?: BuildCosts; costsKey?: string; stepEnvs?: Record<string, StepEnv>; pieceLang?: Partial<Record<Piece, Language>>; variants?: Partial<Record<Language, Partial<Record<Piece, unknown>>>>; industry?: string; location?: string };
type Snapshot = { sessions: Session[]; activeId?: string };

const KEY = "quantaris-sessions-v2";
const MAX_SESSIONS = 30;
const empty: Snapshot = { sessions: [] };
let cache: Snapshot = empty;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Snapshot {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as Snapshot : empty;
    // A fresh visit starts at the greeting; saved chats wait in the sidebar to be resumed, so the active chat is not restored.
    return Array.isArray(parsed.sessions) ? { sessions: parsed.sessions, activeId: undefined } : empty;
  } catch { return empty; } // private mode, blocked storage or corrupt data: start fresh rather than crash
}
function write() { try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full or blocked: chats still work for this visit */ } }
function emit() { listeners.forEach((l) => l()); }

export function getSnapshot(): Snapshot { if (!loaded && typeof window !== "undefined") { cache = read(); loaded = true; } return cache; }
export const getServerSnapshot = (): Snapshot => empty;
export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) { cache = { ...read(), activeId: cache.activeId }; emit(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
function mutate(fn: (s: Snapshot) => Snapshot) { cache = fn(getSnapshot()); write(); emit(); }

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function createSession(first?: Message, mode?: Mode): string {
  const id = uid(); const now = Date.now();
  mutate((s) => ({ activeId: id, sessions: [{ id, title: "", createdAt: now, updatedAt: now, mode, messages: first ? [first] : [] }, ...s.sessions].slice(0, MAX_SESSIONS) }));
  return id;
}
export function updateSession(id: string, fn: (s: Session) => Session) { mutate((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...fn(x), updatedAt: Date.now() } : x)) })); }
export function selectSession(id?: string) { mutate((s) => ({ ...s, activeId: id })); }
export function deleteSession(id: string) { mutate((s) => ({ activeId: s.activeId === id ? undefined : s.activeId, sessions: s.sessions.filter((x) => x.id !== id) })); }
export function renameSession(id: string, title: string) { updateSession(id, (s) => ({ ...s, title: title.trim().slice(0, 80) })); }

// Profile: who to greet and in which language. Replaced by the Google account once login exists.
export type Profile = { name: string; language: Language };
const PROFILE_KEY = "quantaris-profile";
const defaultProfile: Profile = { name: process.env.NEXT_PUBLIC_DEFAULT_USER_NAME ?? "", language: "en" };
let profile: Profile = defaultProfile;
let profileLoaded = false;
const profileListeners = new Set<() => void>();
function readProfile(): Profile {
  try { const raw = window.localStorage.getItem(PROFILE_KEY); const p = raw ? JSON.parse(raw) as Partial<Profile> : {}; return { name: typeof p.name === "string" ? p.name.slice(0, 40) : defaultProfile.name, language: p.language === "hi" ? "hi" : "en" }; } catch { return defaultProfile; }
}
export function getProfile(): Profile { if (!profileLoaded && typeof window !== "undefined") { profile = readProfile(); profileLoaded = true; } return profile; }
export const getServerProfile = (): Profile => defaultProfile;
export function subscribeProfile(listener: () => void) { profileListeners.add(listener); return () => { profileListeners.delete(listener); }; }
export function setProfile(patch: Partial<Profile>) {
  profile = { ...getProfile(), ...patch };
  try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
  profileListeners.forEach((l) => l());
}
