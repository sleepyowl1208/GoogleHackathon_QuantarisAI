import type { Language, Mode } from "./chat-api";
import type { Dict } from "./i18n";
import type { Message, Session } from "./sessions";
import type { Piece } from "./translate-logic";

export const PIECES: Piece[] = ["design", "improvement", "insights", "research", "practices", "costs"];
const langOf = (s: Session, piece: Piece): Language => s.pieceLang?.[piece] ?? "en";

/** The session as the user should see it in this language: each generated piece is swapped for its translation when one exists. */
export function localized(s: Session, lang: Language): Session {
  const out: Session = { ...s };
  for (const piece of PIECES) {
    if (!s[piece] || langOf(s, piece) === lang) continue;
    const translated = s.variants?.[lang]?.[piece];
    if (translated) (out as Record<string, unknown>)[piece] = translated;
  }
  return out;
}

const translatable = (m: Message, lang: Language) => m.role === "assistant" && !m.prompt && !m.error && (m.lang ?? "en") !== lang;

/** What still has to be translated for this language. */
export function missingFor(s: Session, lang: Language): { pieces: Piece[]; messages: Message[] } {
  return {
    pieces: PIECES.filter((p) => s[p] && langOf(s, p) !== lang && !s.variants?.[lang]?.[p]),
    messages: s.messages.filter((m) => translatable(m, lang) && !m.alt?.[lang]),
  };
}

/** Messages for display: the opening prompts always come from the current dictionary; other assistant messages use their translation. */
export function displayMessages(s: Session, lang: Language, t: Dict): Message[] {
  return s.messages.map((m) => {
    if (m.prompt) { const mode: Mode = m.prompt; return { ...m, text: mode === "new" ? t.promptNew : t.promptExisting, suggestions: mode === "new" ? t.examplesNew : t.examplesExisting }; }
    if (translatable(m, lang) && m.alt?.[lang]) return { ...m, ...m.alt[lang] };
    return m;
  });
}

/** Forget cached translations of a piece that has just been replaced. */
export function dropVariants(s: Session, pieces: Piece[]): Session["variants"] {
  const next: NonNullable<Session["variants"]> = {};
  for (const [lang, bucket] of Object.entries(s.variants ?? {})) { const copy = { ...bucket }; for (const p of pieces) delete copy[p]; next[lang as Language] = copy; }
  return next;
}
