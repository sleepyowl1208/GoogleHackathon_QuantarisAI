import re
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor

from apps.api.agents.answer_agent import AnswerAgent
from apps.api.agents.existing_factory import ExistingFactoryAgent
from apps.api.agents.new_factory import NewFactoryAgent
from apps.api.agents.orchestrator import Orchestrator
from apps.api.domain.chat import AnswerSource, PlotSize, ChatRequest, ChatResponse
from apps.api.domain.layout import Language
from apps.api.application.site_service import SiteService
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.siting import SiteConditions

DEVANAGARI = re.compile(r"[ऀ-ॿ]")
NUMBER = r"(\d+(?:[.,]\d+)?)"
PLOT_DIMENSIONS = re.compile(NUMBER + r"\s*(?:m|metres?|meters?|मीटर)?\s*(?:x|×|\*|by|बाई)\s*" + NUMBER, re.IGNORECASE)
QUESTION_START = re.compile(r"^\s*(why|how|what|where|which|who|when|can|could|should|is|are|do|does|did|will|would)\b", re.IGNORECASE)
HINDI_QUESTION = re.compile(r"क्यों|कैसे|क्या|कहाँ|कहां|कौन|कब")  # Devanagari has no word boundaries for \b to find
QUESTION_ANYWHERE = re.compile(r"\b(why|how come|what about|what is|what's|which one|how much|how do|how does|is it|are there)\b|\?\s*$", re.IGNORECASE)
NEW_FACTORY_WORDS = re.compile(r"\b(another|new|different|second|instead|else)\b[^.?!]{0,30}\b(factory|plant|unit|business|mill|industry)\b", re.IGNORECASE)
PLACE_AFTER = re.compile(r"\b(?:in|at|near|around|from)\s+([A-Za-z][A-Za-z]+(?:\s+[A-Za-z][A-Za-z]+)?)(?=\s+(?:for|to|with|and|but|so|because|that|which|as|the|a|why|what|how|where)\b|[,.;?!]|$)", re.IGNORECASE)
PLACE_STOP = {"the", "a", "an", "my", "our", "your", "this", "that", "india", "general", "particular", "fact", "case", "order", "mind", "future", "advance", "addition", "short", "detail", "total", "part", "terms", "front", "back", "need"}


def looks_like_question(text: str) -> bool:
    """A message that asks about the plan rather than asks for a new one: it starts with a question word, has one in it, or ends with a question mark."""
    return bool(QUESTION_START.search(text) or QUESTION_ANYWHERE.search(text) or HINDI_QUESTION.search(text))


def wants_another_factory(text: str) -> bool:
    return bool(NEW_FACTORY_WORDS.search(text))


def place_candidates(text: str) -> list[str]:
    """Words that could be a place, from phrases like 'in Jhansi' or 'near Kanpur'. Each still has to be found on a map before it is believed."""
    out: list[str] = []
    for m in PLACE_AFTER.finditer(text):
        name = " ".join(w for w in m.group(1).split() if w.lower() not in PLACE_STOP).strip()
        if len(name) >= 3 and name.lower() not in PLACE_STOP and name not in out:
            out.append(name)
    return out


PLOT_CONTEXT = re.compile(r"\b(plot|land|site|area|size|dimensions?)\b|\bm\b|metres?|meters?|मीटर|प्लॉट|ज़मीन|जमीन", re.IGNORECASE)


def parse_plot(text: str) -> tuple[float, float] | None:
    """Plot dimensions in metres taken from the user's own words, e.g. '77 by 53 metres' or '60 x 40 m'.

    The model is asked for these too, but they decide the whole layout, so they are read deterministically as well.
    Both sides must be 15 to 2000 and the message must talk about a plot or metres, so '100 x 200 pieces' is ignored.
    """
    match = PLOT_DIMENSIONS.search(text)
    if not match or not PLOT_CONTEXT.search(text):
        return None
    width, depth = (float(g.replace(",", ".")) for g in match.groups())
    return (width, depth) if 15 <= width <= 2000 and 15 <= depth <= 2000 else None
TEXT = {
    "en": {
        "clarify": "Could you tell me a little more about the factory?",
        "answer": "I'm not sure I understood. Would you like to start a new factory, or improve one you already have?",
        "design": "Here's a starting design for {label}: {steps} steps on a {w:g} × {d:g} m plot. Open any step on the right to see what happens there.",
        "analysis": "I've looked at your operation and found {n} ideas worth exploring and {h} problem areas. Everything here is a starting point to check, not a promise. Tell me if I misunderstood anything. If you can, add photos or a sketch of your factory, especially where the water or waste is a problem, and I will study them.",
        "design_chips": ["Change the plot size", "What can I do with the waste?", "What are the environmental effects?"],
        "analysis_chips": ["Which idea is easiest to start?", "How can I cut the smell and waste?"],
    },
    "hi": {
        "clarify": "क्या आप फैक्ट्री के बारे में थोड़ा और बता सकते हैं?",
        "answer": "मुझे ठीक से समझ नहीं आया। क्या आप नई फैक्ट्री शुरू करना चाहते हैं, या अपनी मौजूदा फैक्ट्री को बेहतर बनाना चाहते हैं?",
        "design": "{label} के लिए यह शुरुआती डिज़ाइन है: {w:g} × {d:g} मीटर के प्लॉट पर {steps} चरण। हर चरण को दाईं ओर खोलकर देखिए कि वहाँ क्या होता है।",
        "analysis": "मैंने आपके काम को देखा और {n} अवसर और {h} समस्या वाले क्षेत्र पाए। ये सब जाँचने के शुरुआती सुझाव हैं, पक्के वादे नहीं। अगर मैंने कुछ गलत समझा हो तो बताइए। हो सके तो अपनी फ़ैक्टरी के फ़ोटो या स्केच जोड़ें, खासकर जहाँ पानी या कचरे की दिक़्क़त है, मैं उन्हें देखूँगा।",
        "design_chips": ["प्लॉट का आकार बदलें", "कचरे का मैं क्या कर सकता हूँ?", "पर्यावरण पर क्या असर होगा?"],
        "analysis_chips": ["कौन सा आइडिया शुरू करना सबसे आसान है?", "बदबू और कचरा कैसे कम करूँ?"],
    },
}


class CallBudget:
    """Caps AI calls per hour so a stuck client or a loop cannot run up a bill."""

    def __init__(self, calls_per_hour: int = 60) -> None:
        self._limit, self._calls = calls_per_hour, deque()

    def acquire(self, n: int = 1) -> None:
        now = time.monotonic()
        while self._calls and now - self._calls[0] > 3600:
            self._calls.popleft()
        if len(self._calls) + n > self._limit:
            raise PlanUnavailable("RATE_LIMITED", "Too many requests in the last hour. Please try again later.", 429)
        self._calls.extend([now] * n)


class ChatService:
    """Routes each message: the orchestrator decides the intent, then a specialist agent does the work. Routing rules are plain code."""

    def __init__(self, orchestrator: Orchestrator, new_agent: NewFactoryAgent, existing_agent: ExistingFactoryAgent, budget: CallBudget | None = None, site: SiteService | None = None, answerer: AnswerAgent | None = None) -> None:
        self._orchestrator, self._new, self._existing = orchestrator, new_agent, existing_agent
        self._answerer = answerer
        self._budget = budget or CallBudget()
        self._site = site
        self._pool = ThreadPoolExecutor(max_workers=2)

    def _site_resolver(self, hint: str):
        """Looks up measured conditions at the user's place while the AI is still drafting, so the lookup costs no extra waiting."""
        hint = hint.strip()
        future = self._pool.submit(self._site.lookup, hint) if (self._site and hint) else None
        found: dict[str, SiteConditions | None] = {}

        def locate(place: str | None) -> SiteConditions | None:
            name = (place or hint).strip()
            if not self._site or not name:
                return None
            if name.lower() not in found:
                try:
                    found[name.lower()] = future.result(timeout=20) if (future is not None and name.lower() == hint.lower()) else self._site.lookup(name)
                except Exception:
                    found[name.lower()] = None
            site = found[name.lower()]
            found["_last"] = site
            return site

        return locate, found

    def _guess_location(self, request: ChatRequest) -> str:
        """The place the user named in their own words, when the orchestrator did not pick it up. A word only counts if it is found on the map."""
        if not self._site:
            return ""
        for message in reversed([m for m in request.messages if m.role == "user"]):
            for candidate in place_candidates(message.text):
                try:
                    if self._site.lookup(candidate):
                        return candidate
                except Exception:
                    continue
        return ""

    def handle(self, request: ChatRequest) -> ChatResponse:
        self._budget.acquire(2)
        decision = self._orchestrator.decide(request)
        latest = request.messages[-1].text
        lang: Language = "hi" if DEVANAGARI.search(latest) else request.language
        words = TEXT[lang]
        ask = decision.reply or words["clarify"]
        chips = decision.suggestions

        # A question about the plan on screen is answered from the plan. It is never turned into a new design, even if it says "I want to start in Jhansi".
        asks_about_plan = bool(request.context) and decision.intent in ("new_factory", "redesign", "other") and looks_like_question(latest) and not wants_another_factory(latest)
        if asks_about_plan:
            decision = decision.model_copy(update={"intent": "other"})

        if decision.intent == "other":
            text, chips, place, found_sources = decision.reply or words["answer"], decision.suggestions, decision.location.strip(), []
            if request.context and self._answerer:
                try:
                    said = self._answerer.answer(request, lang)
                    text, chips, place, found_sources = said.answer, said.suggestions or chips, (said.location.strip() or place), said.sources
                except PlanUnavailable:
                    pass  # the orchestrator's short reply is still better than nothing
            site = None
            if place and self._site:
                locate, _ = self._site_resolver(place)
                site = locate(place)
            return ChatResponse(route="answer", assistant_text=text, suggestions=chips, mode=request.mode, language=lang, location=place or None, site=site, sources=[AnswerSource(title=t, url=u) for t, u in found_sources])

        if decision.intent == "existing_factory":
            if not decision.ready and not request.attachments:
                return ChatResponse(route="clarify", assistant_text=ask, suggestions=chips, mode="existing", language=lang)
            where = decision.location.strip() or self._guess_location(request)
            locate, found = self._site_resolver(where)
            known = (decision.plot_width_m, decision.plot_depth_m) if decision.plot_width_m and decision.plot_depth_m else parse_plot(latest)
            if known and not request.plot:  # a plot size the user stated is used as given instead of being estimated
                try:
                    request = request.model_copy(update={"plot": PlotSize(width_m=known[0], depth_m=known[1])})
                except ValueError:
                    pass
            result = self._existing.analyze(request, lang, lambda: locate(where))
            site = locate(where)
            text = words["analysis"].format(n=len(result.opportunities), h=len(result.hotspots))
            title = " · ".join(part for part in (decision.industry.strip()[:40].capitalize(), where[:30]) if part) or None
            return ChatResponse(route="existing_analysis", assistant_text=text, suggestions=words["analysis_chips"], mode="existing", language=lang, improvement=result, title=title, industry=decision.industry.strip() or None, location=where or None, site=site)

        # new_factory or redesign
        redesign = decision.intent == "redesign" and bool(request.last_prompt)
        plot = (decision.plot_width_m, decision.plot_depth_m) if decision.plot_width_m and decision.plot_depth_m else (
            parse_plot(latest) or ((request.plot.width_m, request.plot.depth_m) if request.plot and redesign else None))
        if redesign and not plot:
            return ChatResponse(route="clarify", assistant_text=ask, suggestions=chips, mode="new", language=lang)
        if not redesign and not decision.ready:
            return ChatResponse(route="clarify", assistant_text=ask, suggestions=chips, mode="new", language=lang)
        prompt = request.last_prompt if redesign else latest
        where = decision.location.strip() or self._guess_location(request)
        locate, found = self._site_resolver(where)
        design = self._new.design(prompt or latest, plot, lang, locate)
        text = words["design"].format(label=design.label, steps=sum(1 for z in design.zones if z.step), w=design.width_m, d=design.depth_m)
        return ChatResponse(route="new_design", assistant_text=text, suggestions=words["design_chips"], mode="new", language=lang, design=design, prompt_used=prompt or latest, industry=design.label, location=design.location or where or None, site=found.get("_last"))
