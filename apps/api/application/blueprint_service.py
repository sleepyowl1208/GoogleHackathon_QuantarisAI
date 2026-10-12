import math
import time
from collections import deque
from collections.abc import Callable

from pydantic import ValidationError

from apps.api.application.layout_engine import Stage, Template, build_layout
from apps.api.application.research_service import INJECTION_PATTERN
from apps.api.domain.layout import BlueprintRequest, EnvironmentNote, LayoutResult, WasteStream, ZoneKind
from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.plan import PlanProvider, PlanUnavailable, ProcessPlan
from apps.api.domain.siting import SiteConditions

def downwind_side(wind_from_deg: float) -> str:
    """The plot side the wind blows toward. Wind from the west blows toward the east, so the east is downwind."""
    return "east" if math.sin(math.radians((wind_from_deg + 180) % 360)) >= 0 else "west"


MAX_ASPECT = 4.0
CALLS_PER_HOUR = 30


def _text_fields(plan: ProcessPlan) -> list[str]:
    out = [plan.industry, plan.location, plan.suggested_plot.reasoning, *plan.utilities]
    for e in plan.environment:
        out += [e.aspect, e.impact, e.mitigation]
    for s in plan.stages:
        out += [s.label, s.note, s.detail, *s.outputs, *s.equipment]
    for w in plan.waste_streams:
        out += [w.name, w.description, *w.by_product_ideas]
    return out


def _plot(plan: ProcessPlan) -> tuple[float, float]:
    w = min(max(plan.suggested_plot.width_m, 15), 2000)
    d = min(max(plan.suggested_plot.depth_m, 15), 2000)
    if w / d > MAX_ASPECT:
        w = d * MAX_ASPECT
    if d / w > MAX_ASPECT:
        d = w * MAX_ASPECT
    return round(w, 1), round(d, 1)


class BlueprintService:
    """Turns a free-text factory idea into a layout. The model drafts the process; strict validation and plain code do the rest."""

    def __init__(self, provider: PlanProvider, calls_per_hour: int = CALLS_PER_HOUR) -> None:
        self._provider = provider
        self._limit = calls_per_hour
        self._calls: deque[float] = deque()

    def create(self, request: BlueprintRequest, locate: Callable[[str], SiteConditions | None] | None = None) -> LayoutResult:
        self._check_budget()
        plan = self._draft(request.prompt, request.language)
        suggested = request.width_m is None or request.depth_m is None
        sw, sd = _plot(plan)
        stages = tuple(Stage(s.key, s.label, ZoneKind(s.kind), s.weight, s.height_m, s.note, tuple(s.equipment), s.icon, s.detail, tuple(s.outputs), s.level) for s in plan.stages)
        ideas = tuple(idea for w in plan.waste_streams for idea in w.by_product_ideas)
        template = Template(
            label=plan.industry, suggested=(sw, sd), min_area_m2=0.5 * sw * sd, stages=stages, by_product_ideas=ideas,
            waste_notes=tuple(w.name for w in plan.waste_streams), origin="ai",
            waste_streams=tuple(WasteStream(name=w.name, description=w.description, by_product_ideas=w.by_product_ideas) for w in plan.waste_streams),
            utilities=tuple(plan.utilities), location=plan.location or None,
            environment=tuple(EnvironmentNote(aspect=e.aspect, impact=e.impact, mitigation=e.mitigation) for e in plan.environment),
            raw_inputs=tuple(plan.raw_inputs), products=tuple(plan.products), farm_crop=plan.farm_crop,
        )
        site = locate(plan.location) if locate else None  # measured conditions at the place the plan is for, if we can find them
        wind = site.prevailing_wind_from_deg if site else None
        side = downwind_side(wind) if wind is not None else "east"
        result = build_layout(template, "custom", request.width_m, request.depth_m, suggested, downwind=side, solar_kwh_m2_day=site.avg_solar_kwh_m2_day if site else None)
        if site and wind is not None and site.prevailing_wind_label:
            result.claims.insert(2, Claim(claim_id=f"clm_wind_{abs(hash(site.location)) % 10**8}", classification=ClaimClassification.CALCULATION, confidence=0.6,
                statement=f"Measured wind at {site.location} over the last 30 days blew mostly from the {site.prevailing_wind_label} (average {site.avg_wind_kmh_30d} km/h), so the furnace, boiler, treatment and by-product zones are on the {side} side, where smoke and smell drift away from the production area and the gate.",
                methodology=f"Hourly wind, speed-weighted vector mean, from {site.source}, retrieved {site.retrieved_at:%d %b %Y %H:%M} UTC. This is 30 days of weather, not a climate study."))
        return result

    def _check_budget(self) -> None:
        now = time.monotonic()
        while self._calls and now - self._calls[0] > 3600:
            self._calls.popleft()
        if len(self._calls) >= self._limit:
            raise PlanUnavailable("RATE_LIMITED", "Too many designs in the last hour. Please try again later.", 429)
        self._calls.append(now)

    def _draft(self, prompt: str, language: str = "en") -> ProcessPlan:
        raw = self._provider.draft(prompt, language)
        try:
            plan = ProcessPlan.model_validate(raw)
        except ValidationError:
            raise PlanUnavailable("INVALID_PLAN", "The AI's draft didn't pass our safety checks. Please try again or describe your factory a little differently.") from None
        seen: set[str] = set()
        for index, stage in enumerate(plan.stages, start=1):  # ids must be unique; suffix repeats rather than discard the plan
            key = stage.key
            while key in seen:
                key = f"{stage.key[:20]}_{index}"
                index += 100
            seen.add(key)
            stage.key = key
        if any(INJECTION_PATTERN.search(text) for text in _text_fields(plan)):
            raise PlanUnavailable("INVALID_PLAN", "The AI's draft contained content we don't accept. Please try again.")
        return plan
