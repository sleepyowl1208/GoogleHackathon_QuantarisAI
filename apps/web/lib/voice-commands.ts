/** Understands the short commands people say to the 3D view (zoom, turn, open a section, next...). Anything it does not recognise is a change to the design and goes to the planner. */
export type Command =
  | { type: "zoom"; factor: number }
  | { type: "rotate"; dx: number; dy: number }
  | { type: "reset" }
  | { type: "next" } | { type: "prev" }
  | { type: "open"; id: string } | { type: "close" }
  | { type: "tour" } | { type: "build" } | { type: "stop" }
  | { type: "vehicle"; kind: "truck" | "tanker" | "tractor"; direction: "in" | "out"; zoneId: string }
  | { type: "missing" }; // they asked to open a section that does not exist

export type StepRef = { zone_id: string; label: string; step: number | null };
const STOP = new Set(["the", "and", "for", "with", "area", "section", "step", "unit", "room", "plant"]);
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** Which step the words point at: by number ("step 3"), or by the words of its name ("open the packing section"). */
export function findStep(text: string, steps: StepRef[]): StepRef | undefined {
  const n = /\b(?:step|section|chamber|stage|number|no\.?|चरण)\s*(\d{1,2})\b/i.exec(text) ?? /\b(\d{1,2})(?:st|nd|rd|th)\s+(?:step|section|chamber|stage)\b/i.exec(text);
  if (n) return steps.find((s) => s.step === Number(n[1]));
  const said = new Set(words(text));
  let best: { s: StepRef; score: number } | undefined;
  for (const s of steps) {
    const own = words(s.label).filter((w) => w.length >= 4 && !STOP.has(w));
    const score = own.filter((w) => said.has(w) || [...said].some((x) => x.length >= 5 && (w.startsWith(x) || x.startsWith(w)))).length;
    if (score > 0 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s;
}

const has = (t: string, re: RegExp) => re.test(t);

export function parseCommand(raw: string, steps: StepRef[], selectedId?: string): Command | undefined {
  const t = raw.toLowerCase().trim();
  if (!t) return undefined;
  const target = findStep(t, steps);

  // a vehicle visiting: "a truck is coming with raw material", "send a tanker to collect the oil"
  if (has(t, /\b(truck|lorry|vehicle|tanker|tractor|ट्रक|गाड़ी)\b/) && has(t, /\b(come|coming|comes|bring|brings|bringing|arriv\w*|deliver\w*|unload\w*|load\w*|send|add|collect\w*|pick\w*|take|taking|आ रहा|आ रही|लाता|भेज)\b/) && !has(t, /\b(double|storey|story|floor|chamber|bay|dock|parking|yard|bigger|larger|expand|extend|construct)\b/)) {
    const out = has(t, /\b(dispatch|product|finished|collect\w*|pick\w*|take away|taking away|taking|leave|leaving|ship\w*|outbound|भेज)\b/) && !has(t, /\braw\b/);
    const first = steps[0], last = steps[steps.length - 1];
    const zone = target ?? (out ? last : first);
    if (zone) return { type: "vehicle", kind: has(t, /\b(tanker|milk|oil|juice|liquid)\b/) ? "tanker" : has(t, /\b(tractor|harvest|field|farm)\b/) ? "tractor" : "truck", direction: out ? "out" : "in", zoneId: zone.zone_id };
  }
  if (has(t, /\b(open|show me|show|go to|take me to|look at|focus on|explain|zoom (?:in )?(?:to|into|on))\b|खोलो|दिखाओ/)) {
    if (target) return { type: "open", id: target.zone_id };
    if (has(t, /\b(this|it|that|selected)\b/) && selectedId) return { type: "open", id: selectedId };
    if (has(t, /\b(open|go to|take me to|look at|focus on|explain)\b/) && has(t, /\b(step|section|chamber|stage)\b/)) return { type: "missing" };
  }
  if (has(t, /\b(close|dismiss|go back to (?:the )?(?:plant|plan|view)|exit|hide (?:it|this|the section))\b|बंद करो/)) return { type: "close" };
  if (has(t, /\b(reset|start over|default view|original view|re-?centre|re-?center)\b|रीसेट/)) return { type: "reset" };
  const short = words(t).length <= 4; // "bigger" alone means zoom, but "make the packing area bigger" is a change to the design
  if (has(t, /\b(zoom out|further|farther|back up|step back)\b|ज़ूम आउट|जूम आउट|दूर/) || (short && has(t, /\b(smaller|wider)\b/))) return { type: "zoom", factor: 0.62 };
  if (has(t, /\b(zoom in|closer|magnify|zoom)\b|ज़ूम इन|जूम इन|पास/) || (short && has(t, /\b(bigger|enlarge)\b|बड़ा/))) return { type: "zoom", factor: 1.6 };
  const dir = /\b(?:rotate|turn|spin|orbit|move|pan)\b[^.]*?\b(left|right|up|down)\b/.exec(t) ?? /\b(left|right)\b/.exec(t) ?? (has(t, /बाएं|बायीं/) ? ["", "left"] : has(t, /दाएं|दायीं/) ? ["", "right"] : null);
  if (dir && has(t, /\b(rotate|turn|spin|orbit|move|pan|left|right)\b|घुमा/)) {
    const d = dir[1] as string;
    return { type: "rotate", dx: d === "right" ? 0.12 : d === "left" ? -0.12 : 0, dy: d === "up" ? 0.09 : d === "down" ? -0.09 : 0 };
  }
  if (has(t, /\b(next|forward|continue|move on|go on)\b|अगला|आगे/)) return { type: "next" };
  if (has(t, /\b(previous|prior|go back|back one|before that|last one)\b|पिछला|पीछे/)) return { type: "prev" };
  if (has(t, /\b(walk|tour|route|walkthrough|take me through|show me around)\b|रास्ता/)) return { type: "tour" };
  if (has(t, /\b(build it|construct|replay|build step by step|build up)\b/)) return { type: "build" };
  if (has(t, /^(stop|pause|skip|enough|that'?s enough|ok stop)\b|रुको|रुकिए/)) return { type: "stop" };
  return undefined;
}
