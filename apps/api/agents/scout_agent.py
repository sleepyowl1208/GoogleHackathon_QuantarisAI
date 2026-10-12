import math
import re
import time
from datetime import datetime, timezone

from apps.api.agents.orchestrator import LANGUAGE_NAME
from apps.api.agents.practices_agent import sources_in
from apps.api.application.research_service import INJECTION_PATTERN
from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.llm import GroundedLLM
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.scout import ScoutArea, ScoutRequest, ScoutResult
from apps.api.domain.siting import SourceRef
from apps.api.integrations.geocoding import Geocoder, in_india

SYSTEM = (
    "You are a site-selection researcher for Indian small and medium factories. Use Google Search to find real, named places in or near the given city, town or village where this business could best be set up. "
    "Prefer state industrial estates and parks (MIDC, GIDC, UPSIDC, SIPCOT, KSIDC, RIICO and similar), food or agro parks, and named villages or road belts known for the raw material. Never invent a place; if you cannot find enough real places, give fewer. "
    "If the owner has not decided the business and only has assets (for example cows), pick the best-fitting business for those assets and name it in the first WHY. "
    "Rank the best place first and give three to five places. Answer ONLY in this exact format, with no other text:\n"
    "AREA: <name of the estate, park, village or road belt> | <town or district>, <state>\n"
    "KIND: <industrial estate, agro park, village cluster, highway belt, or other>\n"
    "WHY: <one or two plain sentences on why it suits this business>\n"
    "ACCESS: <roads, highway or rail, and distance to the main market, as the source states it>\n"
    "UTILITIES: <power and water availability, as the source states it, or 'not found'>\n"
    "SUPPLY: <where the raw material or feed comes from nearby, or 'not found'>\n"
    "RISK: <the main drawback or thing to check>\n"
    "Repeat the block for every place."
)
FIELD = re.compile(r"^\s*(AREA|KIND|WHY|ACCESS|UTILITIES|SUPPLY|RISK)\s*:\s*(.*)$", re.IGNORECASE)


def parse_areas(text: str) -> list[tuple[dict[str, str], str]]:
    """Splits the labelled answer into one dict per AREA block, and keeps each block's own text for matching its sources."""
    blocks: list[dict[str, str]] = []
    for raw in text.replace("**", "").splitlines():
        line = raw.strip().lstrip("-*•0123456789. ").strip() if re.match(r"^\s*[-*•\d. ]*(AREA|KIND|WHY|ACCESS|UTILITIES|SUPPLY|RISK)\b", raw.replace("**", ""), re.IGNORECASE) else raw.strip()
        m = FIELD.match(line)
        if not m:
            if blocks and raw.strip():
                last = list(blocks[-1])[-1]; blocks[-1][last] += f" {raw.strip()}"
            continue
        label, value = m.group(1).upper(), m.group(2).strip()
        if label == "AREA":
            blocks.append({"AREA": value})
        elif blocks:
            blocks[-1].setdefault(label, value)
    return [(b, " ".join(b.values())) for b in blocks]


def km_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


GENERIC = re.compile(r"\b(gidc|midc|upsidc|sipcot|ksidc|riico|industrial|industries|estate|area|park|belt|village|road|highway|phase|zone|cluster|agro|agricultural|rural|cattle|dairy|corridor|farming|livestock|milk|cooperative|complex|yard|mega|food)\b|\(.*?\)", re.IGNORECASE)


def queries_for(name: str, locality: str, place: str) -> list[tuple[str, str]]:
    """The same place under simpler names, most specific first, as (query, level). Map data rarely knows an estate's official name but often knows its village.

    "exact" means the place's own name was found; "town" means only the village or town it is in was found, so the pin is approximate.
    """
    core = re.sub(r"\s+", " ", GENERIC.sub(" ", name)).strip(" ,-")
    where = locality or place
    out: list[tuple[str, str]] = [(f"{name}, {where}, India", "exact")]
    if core:
        out += [(f"{core}, {where}, India", "exact"), (f"{core}, {place}, India", "exact")]
    town = locality.split(",")[0].strip()
    if town and town.lower() != place.split(",")[0].strip().lower():  # a locality that is just the searched city would pin the city itself
        out.append((f"{town}, {place}, India", "town"))
    seen, unique = set(), []
    for q, level in out:
        if q not in seen:
            seen.add(q); unique.append((q, level))
    return unique


NOT_FOUND = re.compile(r"^\s*not found\s*\.?\s*$", re.IGNORECASE)
MAX_DISTANCE_KM = 150  # a pin further than this from the place asked about is a wrong match for the name, so it is not drawn


class ScoutAgent:
    """Finds and ranks real places in a city or district where a business could be set up, from Google Search, each with its sources and a map pin."""

    def __init__(self, grounded: GroundedLLM, geocoder: Geocoder) -> None:
        self._grounded = grounded
        self._geocoder = geocoder

    def scout(self, request: ScoutRequest) -> ScoutResult:
        answer = self._grounded.grounded_text(SYSTEM, [{"text": self._prompt(request)}], temperature=0.2, max_tokens=5000, timeout=100)
        now = datetime.now(timezone.utc)
        sources, index = [], {}
        for i, (title, url) in enumerate(answer.sources[:25]):
            if url.startswith("https://"):
                sid = f"src_{len(sources) + 1}"; sources.append(SourceRef(source_id=sid, title=title[:120], url=url, retrieved_at=now)); index[i] = sid
        areas: list[ScoutArea] = []
        for fields, block in parse_areas(answer.text):
            name, _, locality = fields["AREA"].partition("|")
            if not name.strip() or NOT_FOUND.match(name):
                continue
            clean = lambda key: "" if NOT_FOUND.match(fields.get(key, "")) else fields.get(key, "")[:260]  # noqa: E731
            area = ScoutArea(rank=len(areas) + 1, name=name.strip()[:100], locality=locality.strip()[:100], kind=clean("KIND")[:40], why=clean("WHY"), access=clean("ACCESS"), utilities=clean("UTILITIES"), supply=clean("SUPPLY"), risk=clean("RISK"),
                             source_ids=[index[i] for i in sources_in(block, answer.supports) if i in index])
            areas.append(area)
            if len(areas) == 5:
                break
        if not areas:
            raise PlanUnavailable("PROVIDER_ERROR", "We couldn't find named places for that location. Try a larger nearby town or district.")
        center = self._centre(request.place, areas[0].locality)
        strings = [t for a in areas for t in (a.name, a.locality, a.why, a.access, a.utilities, a.supply, a.risk)]
        if any(INJECTION_PATTERN.search(t) for t in strings):
            raise PlanUnavailable("INVALID_PLAN", "The research contained content we don't accept. Please try again.")
        for a in areas:  # pins come from the geocoder, never from the model; one that lands far from the place asked about is dropped
            for query, level in queries_for(a.name, a.locality, request.place):
                point = self._geocoder.geocode(query)
                if point and in_india(point.lat, point.lng) and (center is None or 0.3 < km_between(center, (point.lat, point.lng)) <= MAX_DISTANCE_KM):  # right on the city centre means the name was not found and the city itself came back
                    a.lat, a.lng, a.pin_level = point.lat, point.lng, level
                    if center:
                        a.distance_km = round(km_between(center, (point.lat, point.lng)), 1)
                    break
        n = time.time_ns() % 10**9
        claims = [
            Claim(claim_id=f"scout_{n}_1", statement=("These places were found with Google Search and written up by Gemini. The ranking is Gemini's judgement from what it found, not a measured score. A link appears only where Google reported a source for that place." if sources else "These places come from Gemini's general knowledge; Google reported no sources, so verify each before relying on it."),
                  classification=ClaimClassification.INFERENCE, confidence=0.4 if sources else 0.2, reason="Search-backed ranking; confirm availability, zoning and prices with the local industrial development office"),
            Claim(claim_id=f"scout_{n}_2", statement="Plot availability, price, zoning approval and utility connection for each place are unknown until checked with the local authority.", classification=ClaimClassification.UNKNOWN, reason="No live availability or price data was found"),
        ]
        return ScoutResult(place=request.place, industry=request.industry, center_lat=center[0] if center else None, center_lng=center[1] if center else None, areas=areas, sources=sources, search_queries=answer.queries[:8], claims=claims, retrieved_at=now, grounded=bool(sources))

    def _centre(self, place: str, locality: str) -> tuple[float, float] | None:
        """Where the place is, for the ring on the map and the distances. A bare town name often geocodes to the district's middle, so the town's railway station
        (almost always in the town centre) is tried first and accepted only if its label names the town; the plain name is the fallback."""
        head = place.split(",")[0].strip()
        state = next((p.strip() for p in reversed(locality.split(",")[1:]) if p.strip()), "")
        tries = [f"{head} railway station, {state}, India" if state else f"{head} railway station, India", f"{place}, {state}, India" if state and state.lower() not in place.lower() else f"{place}, India"]
        for i, query in enumerate(tries):
            point = self._geocoder.geocode(query)
            if point and in_india(point.lat, point.lng) and (i > 0 or head.lower() in point.label.lower()):
                return point.lat, point.lng
        return None

    @staticmethod
    def _prompt(r: ScoutRequest) -> str:
        business = r.industry or "not decided yet"
        return (f"Write descriptive text in {LANGUAGE_NAME[r.language]} (keep the labels AREA, KIND, WHY, ACCESS, UTILITIES, SUPPLY, RISK exactly as written, and keep place names in English).\n"
                f"Place (data): {r.place}\nBusiness (data): {business}\nWhat the owner already has (data): {r.assets or 'nothing stated'}\n"
                "Find the best named places in or near this place to set this business up, ranked best first, with the reasons.")
