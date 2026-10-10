import re
import time
from datetime import datetime, timezone

from pydantic import ValidationError

from apps.api.agents.orchestrator import LANGUAGE_NAME
from apps.api.agents.research_agent import _norm
from apps.api.application.research_service import INJECTION_PATTERN
from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.llm import GroundedAnswer, GroundedLLM
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.practices import BestPractices, Practice, PracticesRequest, RawPractice, RawStandard, Standard
from apps.api.domain.siting import SourceRef

SYSTEM = (
    "You are an industrial sustainability researcher. Use Google Search to find real, current, proven ways to control pollution and turn waste into value for this kind of factory, drawing on many countries (for example India, Japan, China, Bangladesh, Vietnam, Korea, Europe, the USA). "
    "Prefer government, regulator, industry-body, university and reputable company or project sources. Never invent organisations, projects, numbers or rules; if you cannot find something, leave that field out. "
    "Answer ONLY in this exact format, with no other text before or after, at most 7 practices and 4 standards, each field one or two short sentences:\n"
    "SUMMARY: two plain sentences\n"
    "PRACTICE: short name of the method\nCOUNTRIES: where it is used\nWHAT: how it works, in plain words\nWHY: the benefit the source gives\nEXAMPLE: a named real plant or project, with its country\nFOR YOU: how it could apply to this owner's situation, as an idea to check\n"
    "(repeat the PRACTICE block for each method, then)\n"
    "STANDARD: name of a rule or limit | what it says, as the source states it\n"
    "Write in simple everyday words."
)
FIELD = re.compile(r"^\s*(SUMMARY|PRACTICE|COUNTRIES|WHAT|WHY|EXAMPLE|FOR YOU|STANDARD)\s*:\s*(.*)$", re.IGNORECASE)


def parse(text: str) -> tuple[str, list[tuple[dict, str]], list[tuple[dict, str]]]:
    """Reads the labelled answer into a summary, practices and standards, each with its own text so sources can be matched to exactly that part."""
    summary, practices, standards, current, last = "", [], [], None, None
    for raw in text.replace("**", "").splitlines():
        m = FIELD.match(raw.strip().lstrip("-*• ").strip())
        if not m:
            if current is not None and last and raw.strip():  # a wrapped continuation line
                current[0][last] = (current[0][last] + " " + raw.strip()).strip(); current[1].append(raw.strip())
            elif last == "summary" and raw.strip():
                summary += " " + raw.strip()
            continue
        key, value = m.group(1).lower().replace(" ", "_"), m.group(2).strip()
        if key == "summary":
            summary, current, last = value, None, "summary"
        elif key == "practice":
            current = ({"title": value}, [value]); practices.append(current); last = "title"
        elif key == "standard":
            name, _, note = value.partition("|")
            current = ({"name": name.strip(), "note": note.strip()}, [value]); standards.append(current); last = "note"
        elif current is not None:
            field = {"countries": "countries", "what": "what", "why": "why_it_works", "example": "example", "for_you": "for_you"}[key]
            current[0][field] = value; current[1].append(value); last = field
    return summary.strip(), [(d, " ".join(parts)) for d, parts in practices], [(d, " ".join(parts)) for d, parts in standards]


def sources_in(block: str, supports: list[tuple[str, list[int]]]) -> list[int]:
    """Sources whose supported passage lies inside this block of the answer (Google reports the passages, which are pieces of the answer itself)."""
    b = _norm(block)
    bt, hits = set(b.split()), set()
    for segment, indices in supports:
        s = _norm(segment)
        if len(s) < 12:
            continue
        st = set(s.split())
        if s in b or (len(st) >= 4 and len(st & bt) / len(st) >= 0.8):
            hits.update(indices)
    return sorted(hits)


class PracticesAgent:
    """Finds what works elsewhere in the world for this industry's pollution and waste, with a link to where each idea was found.

    One Google Search call answers in a fixed format that is parsed here (no second model pass to paraphrase), and each item gets links only
    for the passages Google says came from a source. Items with none are shown as unsourced.
    """

    def __init__(self, grounded: GroundedLLM) -> None:
        self._grounded = grounded

    def research(self, request: PracticesRequest) -> BestPractices:
        answer = self._grounded.grounded_text(SYSTEM, [{"text": self._prompt(request)}], temperature=0.3, max_tokens=6000, timeout=100)
        summary, rp, rs = parse(answer.text)
        try:
            practices_raw = [(RawPractice.model_validate({**d, "title": d.get("title", "")}), block) for d, block in rp if d.get("title")]
            standards_raw = [(RawStandard.model_validate(d), block) for d, block in rs if d.get("name")]
        except ValidationError:
            raise PlanUnavailable("INVALID_PLAN", "The research didn't pass our safety checks. Please try again.") from None
        if not practices_raw:
            raise PlanUnavailable("PROVIDER_ERROR", "The research came back in a form we couldn't read. Please try again.")
        strings = [summary] + [t for p, _ in practices_raw for t in (p.title, p.countries, p.what, p.why_it_works, p.example, p.for_you)] + [t for s, _ in standards_raw for t in (s.name, s.note)]
        if any(INJECTION_PATTERN.search(t) for t in strings):
            raise PlanUnavailable("INVALID_PLAN", "The research contained content we don't accept. Please try again.")
        now = datetime.now(timezone.utc)
        usable = [i for i, (_, url) in enumerate(answer.sources[:25]) if url.startswith("https://")]
        sources = [SourceRef(source_id=f"src_{n + 1}", title=answer.sources[i][0][:120], url=answer.sources[i][1], retrieved_at=now) for n, i in enumerate(usable)]
        by_index = {i: f"src_{n + 1}" for n, i in enumerate(usable)}
        ids = lambda block: [by_index[i] for i in sources_in(block, answer.supports) if i in by_index]  # noqa: E731
        practices = [Practice(title=p.title, countries=p.countries, what=p.what, why_it_works=p.why_it_works, example=p.example, for_you=p.for_you, source_ids=ids(block)) for p, block in practices_raw[:8]]
        standards = [Standard(name=s.name, note=s.note, source_ids=ids(block)) for s, block in standards_raw[:5]]
        return BestPractices(summary=summary[:420], practices=practices, standards=standards, sources=sources, search_queries=answer.queries[:8], claims=self._claims(sources, answer), retrieved_at=now, grounded=bool(sources))

    @staticmethod
    def _prompt(r: PracticesRequest) -> str:
        problem = f"\nWhat the owner says their problem is: {r.problem}" if r.problem.strip() else ""
        goal = "They want to START a new plant and avoid these problems from day one." if r.mode == "new" else "They ALREADY RUN this operation and want to fix its pollution and waste problems."
        return f"Write all text in {LANGUAGE_NAME[r.language]} (keep the labels SUMMARY, PRACTICE, COUNTRIES, WHAT, WHY, EXAMPLE, FOR YOU, STANDARD exactly as written, in English).\nIndustry: {r.industry}\nLocation: {r.location.strip() or 'not given'}\n{goal}{problem}\n\nFind the best proven methods used around the world, real examples, the rules that apply, and low-cost first steps."

    @staticmethod
    def _claims(sources: list[SourceRef], answer: GroundedAnswer) -> list[Claim]:
        n = time.time_ns() % 10**9
        if sources:
            first = Claim(claim_id=f"prc_{n}_1", statement=f"These methods, examples and rules were found with Google Search ({len(answer.queries)} searches, {len(sources)} sources) and written up by Gemini. A link is attached only where Google reports that a passage came from a source; items without a link are unsourced, so check them.", classification=ClaimClassification.INFERENCE, confidence=0.4, reason="Web research summarised by AI; verify before relying on it")
        else:
            first = Claim(claim_id=f"prc_{n}_1", statement="Google Search returned no sources, so everything here is Gemini's general knowledge and is unverified.", classification=ClaimClassification.INFERENCE, confidence=0.2, reason="No sources were returned")
        return [first, Claim(claim_id=f"prc_{n}_2", statement="Costs, savings, discharge limits that apply to your site and approval requirements are unavailable.", classification=ClaimClassification.UNKNOWN, reason="No verified evidence available: costs and local legal limits have not been checked")]
