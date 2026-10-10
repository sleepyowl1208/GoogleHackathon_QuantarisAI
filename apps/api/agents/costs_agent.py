import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from apps.api.agents.orchestrator import LANGUAGE_NAME
from apps.api.agents.practices_agent import sources_in
from apps.api.agents.research_agent import _norm
from apps.api.application.research_service import INJECTION_PATTERN
from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.costs import Benchmark, BuildCosts, CostMachine, CostsRequest, LandOption, Supplier
from apps.api.domain.llm import GroundedAnswer, GroundedLLM
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.siting import SourceRef

MACHINES_SYSTEM = (
    "You are a procurement researcher for Indian factories. Use Google Search to find real, current, indicative prices in Indian rupees for the machines listed, and real Indian suppliers or manufacturers "
    "(prefer manufacturer sites, trade listings, government or industry sources). Never invent prices or companies; if you cannot find something write 'not found'. "
    "Answer ONLY in this exact format, with no other text:\n"
    "MACHINE: <name exactly as given>\nPRICE_INR: <lowest> - <highest>  (digits only for one unit, in rupees, or 'not found')\nBASIS: <the capacity or model the price is for>\nSUPPLIER: <company> | <city>, <state>\n"
    "(up to three SUPPLIER lines per machine; repeat the block for every machine, then)\n"
    "BENCHMARK: <metric> | <typical value with unit> | <what it applies to>\n"
    "(three to five BENCHMARK lines giving typical productivity for this kind of business, such as output per animal, yield per unit of input, output per worker or per machine, each only if a source states it). Use short plain words."
)
LAND_SYSTEM = (
    "You are a site-selection researcher for Indian factories. Use Google Search to find real places where a small or medium factory can get land near the location given: state industrial development corporation estates or parks, "
    "and other realistic options. Never invent estates, prices or rules; if you cannot find something write 'not found'. "
    "Answer ONLY in this exact format, with no other text, at most five blocks:\n"
    "LAND: <estate, park or area name> | <city>, <state>\nPRICE: <the price as the source states it, with its unit, or 'not found'>\nHOW: <who allots it and how to apply>\nKIND: <industrial estate, private, or other>\n"
    "Use short plain words."
)
FIELD = re.compile(r"^\s*(MACHINE|PRICE_INR|BASIS|SUPPLIER|BENCHMARK|LAND|PRICE|HOW|KIND)\s*:\s*(.*)$", re.IGNORECASE)
UNITS = {"lakh": 100_000, "lakhs": 100_000, "lac": 100_000, "lacs": 100_000, "crore": 10_000_000, "crores": 10_000_000, "cr": 10_000_000, "k": 1000, "thousand": 1000}
NUMBER = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|thousand|k)?\b", re.IGNORECASE)
MIN_PRICE, MAX_PRICE = 1_000, 5_000_000_000


def parse_inr(text: str) -> tuple[int, int] | None:
    """Reads a rupee price or range such as '250000 - 400000', '₹2.5 lakh' or '2 - 4 lakh'. Anything implausible or unreadable is no price at all."""
    if re.search(r"not found", text, re.IGNORECASE):
        return None
    found = [(float(m.group(1).replace(",", "")), (m.group(2) or "").lower()) for m in NUMBER.finditer(text.replace("₹", " "))]
    if not found:
        return None
    unit = next((u for _, u in reversed(found) if u), "")
    values = [int(round(n * UNITS.get(u or unit, 1))) for n, u in found[:2]]
    low, high = min(values), max(values)
    return (low, high) if MIN_PRICE <= low and high <= MAX_PRICE else None


def parse_blocks(text: str, start: str) -> list[tuple[list[tuple[str, str]], str]]:
    """Splits the labelled answer into blocks that each begin at the `start` label. Returns the (label, value) lines of each block and the block's own text."""
    blocks: list[list[tuple[str, str]]] = []
    for raw in text.replace("**", "").splitlines():
        m = FIELD.match(raw.strip().lstrip("-*• ").strip())
        if not m:
            if blocks and blocks[-1] and raw.strip():
                label, value = blocks[-1][-1]; blocks[-1][-1] = (label, f"{value} {raw.strip()}")
            continue
        label, value = m.group(1).upper(), m.group(2).strip()
        if label == start or label == "BENCHMARK":  # each benchmark stands alone, so it cannot lend its source to the machine above it
            blocks.append([(label, value)])
        elif blocks:
            blocks[-1].append((label, value))
    return [(lines, " ".join(v for _, v in lines)) for lines in blocks]


class CostsAgent:
    """Finds what the machines and land might cost and where to buy them, from Google Search, with a link wherever Google reports a source.

    Two searches run side by side (machines, and land). The answers are fixed-format text that is parsed here, so there is no second model pass.
    Prices are indicative web figures, never quotes, and an item with no price or no source says so.
    """

    def __init__(self, grounded: GroundedLLM) -> None:
        self._grounded = grounded

    def research(self, request: CostsRequest) -> BuildCosts:
        machines_prompt = self._machines_prompt(request)
        land_prompt = self._land_prompt(request)
        with ThreadPoolExecutor(max_workers=2) as pool:
            m_future = pool.submit(self._grounded.grounded_text, MACHINES_SYSTEM, [{"text": machines_prompt}], temperature=0.2, max_tokens=7000, timeout=100)
            l_future = pool.submit(self._grounded.grounded_text, LAND_SYSTEM, [{"text": land_prompt}], temperature=0.2, max_tokens=4000, timeout=100)
            m_answer = m_future.result()
            try:
                l_answer: GroundedAnswer | None = l_future.result()
            except PlanUnavailable:
                l_answer = None  # land is a bonus; machine prices alone are still useful
        now = datetime.now(timezone.utc)
        sources: list[SourceRef] = []
        index: dict[tuple[int, int], str] = {}

        def register(which: int, answer: GroundedAnswer) -> None:
            for i, (title, url) in enumerate(answer.sources[:25]):
                if url.startswith("https://"):
                    sid = f"src_{len(sources) + 1}"; sources.append(SourceRef(source_id=sid, title=title[:120], url=url, retrieved_at=now)); index[(which, i)] = sid

        register(0, m_answer)
        if l_answer:
            register(1, l_answer)
        ids = lambda which, answer, block: [index[(which, i)] for i in sources_in(block, answer.supports) if (which, i) in index]  # noqa: E731

        parsed: dict[str, CostMachine] = {}
        benchmarks: list[Benchmark] = []
        for lines, block in parse_blocks(m_answer.text, "MACHINE"):
            head = lines[0]
            if head[0] == "BENCHMARK":
                for label, value in lines:
                    if label == "BENCHMARK":
                        parts = [p.strip() for p in value.split("|")]
                        if parts[0]:
                            benchmarks.append(Benchmark(metric=parts[0][:120], value=(parts[1] if len(parts) > 1 else "")[:120], applies_to=(parts[2] if len(parts) > 2 else "")[:120], source_ids=ids(0, m_answer, value)))
                continue
            name = head[1]
            price = next((parse_inr(v) for l, v in lines if l == "PRICE_INR"), None)
            basis = next((v for l, v in lines if l == "BASIS"), "")
            sups = []
            for l, v in lines:
                if l == "SUPPLIER" and v.strip() and not re.search(r"not found", v, re.IGNORECASE):
                    company, _, place = v.partition("|")
                    sups.append(Supplier(name=company.strip()[:80], place=place.strip()[:80], source_ids=ids(0, m_answer, v)))
            parsed[_norm(name)] = CostMachine(name=name[:80], price_low_inr=price[0] if price else None, price_high_inr=price[1] if price else None, basis=basis[:160], suppliers=sups[:3], source_ids=ids(0, m_answer, block))

        machines: list[CostMachine] = []
        for ref in request.machines:
            key = _norm(ref.name)
            hit = parsed.get(key) or next((m for k, m in parsed.items() if k and (k in key or key in k)), None)
            machines.append((hit.model_copy(update={"name": ref.name, "step": ref.step}) if hit else CostMachine(name=ref.name, step=ref.step)))

        land: list[LandOption] = []
        if l_answer:
            for lines, block in parse_blocks(l_answer.text, "LAND"):
                place, _, location = lines[0][1].partition("|")
                get = lambda label: next((v for l, v in lines if l == label), "")  # noqa: E731
                if place.strip() and not re.search(r"not found", place, re.IGNORECASE):
                    land.append(LandOption(place=place.strip()[:100], location=location.strip()[:80], price_note=get("PRICE")[:160], how_to_get=get("HOW")[:240], kind=get("KIND")[:40], source_ids=ids(1, l_answer, block)))

        strings = [t for m in machines for t in (m.name, m.basis, *[s.name for s in m.suppliers])] + [t for x in land for t in (x.place, x.how_to_get, x.price_note)] + [t for b in benchmarks for t in (b.metric, b.value)]
        if any(INJECTION_PATTERN.search(t) for t in strings):
            raise PlanUnavailable("INVALID_PLAN", "The research contained content we don't accept. Please try again.")
        if not any(m.price_low_inr or m.suppliers for m in machines) and not land:
            raise PlanUnavailable("PROVIDER_ERROR", "The research came back in a form we couldn't read. Please try again.")

        priced = [m for m in machines if m.price_low_inr is not None and m.price_high_inr is not None]
        total_low = sum(m.price_low_inr for m in priced) if priced else None
        total_high = sum(m.price_high_inr for m in priced) if priced else None
        queries = (m_answer.queries + (l_answer.queries if l_answer else []))[:10]
        return BuildCosts(machines=machines[:12], land=land[:5], benchmarks=benchmarks[:5], total_low_inr=total_low, total_high_inr=total_high, priced=len(priced), requested=len(machines), sources=sources, search_queries=queries, claims=self._claims(len(priced), len(machines), bool(sources), total_low, total_high), retrieved_at=now, grounded=bool(sources))

    @staticmethod
    def _machines_prompt(r: CostsRequest) -> str:
        names = "\n".join(f"- {m.name}" + (f" (used for: {m.step})" if m.step else "") for m in r.machines)
        return f"Write descriptive text in {LANGUAGE_NAME[r.language]} (keep the labels MACHINE, PRICE_INR, BASIS, SUPPLIER, BENCHMARK exactly as written, and keep company and place names in English).\nBusiness: {r.industry}\nLocation: {r.location or 'India'}\nMachines (data):\n<<<\n{names}\n>>>\nFind indicative prices in rupees and Indian suppliers for each machine, and typical productivity figures for this kind of business."

    @staticmethod
    def _land_prompt(r: CostsRequest) -> str:
        return f"Write descriptive text in {LANGUAGE_NAME[r.language]} (keep the labels LAND, PRICE, HOW, KIND exactly as written, and keep place names in English).\nBusiness: {r.industry}\nLocation: {r.location or 'India (suggest good states)'}\nFind where a factory like this can get land near that location, who allots it, and the price as the source states it."

    @staticmethod
    def _claims(priced: int, requested: int, grounded: bool, low: int | None, high: int | None) -> list[Claim]:
        n = time.time_ns() % 10**9
        claims = [Claim(claim_id=f"cst_{n}_1", statement=("These prices, suppliers and land options were found with Google Search and written up by Gemini. They are indicative figures from web pages, not quotes. A link is attached only where Google reports that a passage came from a source; items without a link are unsourced, so check them." if grounded else "Google Search returned no sources, so these figures are Gemini's general knowledge and unverified."), classification=ClaimClassification.INFERENCE, confidence=0.35 if grounded else 0.15, reason="Web research summarised by AI; ask suppliers for a written quote before relying on it")]
        if low is not None and high is not None:
            claims.append(Claim(claim_id=f"cst_{n}_2", statement=f"Adding one unit of each machine that has a price ({priced} of {requested}) gives about Rs {low:,} to Rs {high:,}. Machines without a price are not counted, so the real total is higher.", classification=ClaimClassification.CALCULATION, confidence=0.3, methodology="Sum of the lowest and highest price found for each priced machine, one unit each. Excludes GST, transport, installation, building, power connection, licences, land and working capital."))
        claims.append(Claim(claim_id=f"cst_{n}_3", statement="Installation, building work, power connection, licences, GST, transport and working capital are unavailable.", classification=ClaimClassification.UNKNOWN, reason="No verified evidence available: these have not been researched"))
        return claims
