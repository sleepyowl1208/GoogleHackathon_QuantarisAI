"""Deterministic factory layout engine.

Templates below are ILLUSTRATIVE assumptions about process order and relative zone sizes. They are not researched
facts, and every claim derived from them is classified accordingly. Geometry and arithmetic are plain code, never an LLM.
"""
from dataclasses import dataclass
from uuid import uuid4

from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.layout import (
    EnvironmentNote, FlowEdge, Industry, LayoutRequest, LayoutResult, Point, TemplateSummary, WasteStream, Zone, ZoneKind,
)

BOUNDARY_SETBACK_M = 3.0
SERVICE_BAND_SHARE = 0.22
USABLE_ROOF_SHARE = 0.7
SOLAR_KWP_PER_M2_ROOF = 0.12
SOLAR_KWH_PER_KWP_YEAR = 1450


@dataclass(frozen=True)
class Stage:
    key: str
    label: str
    kind: ZoneKind
    weight: float
    height_m: float
    note: str
    equipment: tuple[str, ...] = ()
    icon: str = "factory"
    detail: str = ""
    outputs: tuple[str, ...] = ()
    level: int = 0


@dataclass(frozen=True)
class Template:
    label: str
    suggested: tuple[float, float]
    min_area_m2: float
    stages: tuple[Stage, ...]
    by_product_ideas: tuple[str, ...]
    waste_notes: tuple[str, ...]
    origin: str = "template"  # "template" (illustrative, hand-written) or "ai" (drafted by a model, unsourced)
    waste_streams: tuple[WasteStream, ...] = ()
    utilities: tuple[str, ...] = ()
    location: str | None = None
    environment: tuple[EnvironmentNote, ...] = ()
    raw_inputs: tuple[str, ...] = ()
    products: tuple[str, ...] = ()
    farm_crop: str = ""


TEMPLATES: dict[Industry, Template] = {
    Industry.PICKLE: Template(
        label="Pickle factory", suggested=(50, 50), min_area_m2=1200,
        stages=(
            Stage("receive", "Raw produce receiving & sorting", ZoneKind.RECEIVE, 1.0, 5, "Reject damaged or mouldy produce here"),
            Stage("wash", "Washing & drying", ZoneKind.WASH, 1.2, 5, "Wet area with floor drains"),
            Stage("cut", "Cutting & de-stoning", ZoneKind.PREP, 1.2, 5, "Stones and peel leave from this step"),
            Stage("cure", "Salting & curing", ZoneKind.PROCESS, 2.0, 5, "Curing tanks; produces brine"),
            Stage("mix", "Spice mixing & marinating", ZoneKind.PROCESS, 1.2, 5, ""),
            Stage("fill", "Filling & sealing", ZoneKind.PACK, 1.5, 5, "Clean packing zone"),
            Stage("label", "Labelling & case packing", ZoneKind.PACK, 1.0, 5, ""),
            Stage("store", "Finished-goods store", ZoneKind.STORE, 1.5, 6, "Dry, ventilated storage"),
            Stage("dispatch", "Dispatch bay", ZoneKind.DISPATCH, 0.8, 5, "Truck loading"),
        ),
        by_product_ideas=(
            "Mango stones and peel could be explored as animal feed, compost or biogas feedstock; each needs a buyer and technical validation.",
            "Spent brine and wash water likely need treatment before reuse or discharge; limits must be confirmed with the pollution control board.",
        ),
        waste_notes=("Organic residue (peel, stones)", "Brine and wash water"),
    ),
    Industry.TSHIRT: Template(
        label="T-shirt factory", suggested=(100, 100), min_area_m2=5000,
        stages=(
            Stage("receive", "Fabric receiving & storage", ZoneKind.RECEIVE, 1.5, 7, ""),
            Stage("inspect", "Fabric inspection & relaxing", ZoneKind.PREP, 1.0, 6, ""),
            Stage("dye", "Dyeing & washing", ZoneKind.WASH, 2.0, 8, "Wet process; largest effluent source"),
            Stage("dry", "Drying", ZoneKind.PROCESS, 1.2, 8, "Heat-intensive; candidate for solar thermal"),
            Stage("cut", "Cutting", ZoneKind.PREP, 1.2, 6, "Fabric offcuts leave from this step"),
            Stage("sew", "Sewing lines", ZoneKind.PROCESS, 4.0, 6, "Typically the labour-heavy stage"),
            Stage("finish", "Finishing & ironing", ZoneKind.PACK, 1.2, 6, ""),
            Stage("pack", "Quality check & packing", ZoneKind.PACK, 1.2, 6, ""),
            Stage("store", "Finished-goods store", ZoneKind.STORE, 1.5, 7, ""),
            Stage("dispatch", "Dispatch bay", ZoneKind.DISPATCH, 0.8, 6, "Truck loading"),
        ),
        by_product_ideas=(
            "Fabric offcuts could be explored as recycled fibre or yarn, rags, or stuffing; each needs a buyer and technical validation.",
            "Dye-house wastewater likely needs treatment, and possibly reuse of treated water; limits must be confirmed with the pollution control board.",
        ),
        waste_notes=("Fabric offcuts", "Dye and wash wastewater"),
    ),
}

SERVICE_ZONES = (
    ("office", "Office & staff facilities", ZoneKind.OFFICE, 0.22, 4.0),
    ("utility", "Utilities & power room", ZoneKind.UTILITY, 0.2, 4.0),
    ("etp", "Effluent treatment plant", ZoneKind.EFFLUENT, 0.34, 3.0),
    ("byproduct", "By-product recovery bay", ZoneKind.BYPRODUCT, 0.24, 4.0),
)


def list_templates() -> list[TemplateSummary]:
    return [TemplateSummary(industry=key, label=t.label, suggested_width_m=t.suggested[0], suggested_depth_m=t.suggested[1]) for key, t in TEMPLATES.items()]


def _claim(statement: str, classification: ClaimClassification, *, reason: str | None = None, confidence: float | None = None, methodology: str | None = None) -> Claim:
    return Claim(claim_id=f"clm_{uuid4().hex[:10]}", statement=statement, classification=classification, reason=reason, confidence=confidence, methodology=methodology)


def _split_into_rows(stages: tuple[Stage, ...], rows: int) -> list[list[Stage]]:
    total = sum(s.weight for s in stages)
    groups: list[list[Stage]] = [[] for _ in range(rows)]
    running = 0.0
    for stage in stages:
        index = min(rows - 1, int((running + stage.weight / 2) / (total / rows)))
        groups[index].append(stage)
        running += stage.weight
    return [g for g in groups if g]


def generate_layout(request: LayoutRequest) -> LayoutResult:
    suggested = request.width_m is None or request.depth_m is None
    return build_layout(TEMPLATES[request.industry], request.industry.value, request.width_m, request.depth_m, suggested)


def build_layout(template: Template, industry_key: str, width_m: float | None, depth_m: float | None, suggested: bool, *, downwind: str = "east", solar_kwh_m2_day: float | None = None) -> LayoutResult:
    width, depth = template.suggested if suggested else (width_m, depth_m)
    setback = min(BOUNDARY_SETBACK_M, 0.06 * min(width, depth))
    bw, bd = width - 2 * setback, depth - 2 * setback
    service_w = bw * SERVICE_BAND_SHARE
    block_w = bw - service_w
    zones: list[Zone] = []

    # A plant can have a first floor: those stages are laid out the same way over the same footprint, one storey up.
    ground = [s for s in template.stages if s.level == 0] or list(template.stages)
    upper = [s for s in template.stages if s.level >= 1 and s not in ground]
    storey = min(max(sorted(s.height_m for s in ground)[len(ground) // 2], 4.5), 8.0) if upper else 0.0

    def place(stage_list: list[Stage], level: int, elevation: float, share: float = 1.0) -> int:
        # An upper floor is as big as what it holds: it covers only its share of the footprint, centred above the ground floor.
        k = share ** 0.5
        lw, ld = block_w * k, bd * k
        ox, oy = (block_w - lw) / 2, (bd - ld) / 2
        # Pick the row count that keeps zones roughly square for this plot: wide plots get fewer rows, deep plots more.
        wanted_rows = max(1, min(4, round((len(stage_list) * ld / lw) ** 0.5), len(stage_list)))
        rows = _split_into_rows(tuple(stage_list), wanted_rows)
        row_d = ld / len(rows)
        for r, group in enumerate(rows):
            forward = r % 2 == 0  # serpentine: row 0 runs west to east, row 1 east to west, ...
            ordered = group if forward else list(reversed(group))
            total = sum(s.weight for s in ordered)
            cursor = setback + ox
            for stage in ordered:
                x0, x1 = round(cursor, 3), round(cursor + lw * stage.weight / total, 3)  # shared edges are rounded once so neighbours abut exactly
                y0, y1 = round(setback + oy + r * row_d, 3), round(setback + oy + (r + 1) * row_d, 3)
                step_number = template.stages.index(stage) + 1
                zones.append(Zone(zone_id=stage.key, label=stage.label, kind=stage.kind, x=x0, y=y0, width_m=round(x1 - x0, 3), depth_m=round(y1 - y0, 3), height_m=stage.height_m if level == 0 else min(stage.height_m, 12.0), area_m2=round((x1 - x0) * (y1 - y0), 2), step=step_number, note=stage.note, equipment=list(stage.equipment), icon=stage.icon, detail=stage.detail, outputs=list(stage.outputs), level=level, elevation_m=elevation))
                cursor += lw * stage.weight / total
        return len(rows)

    ground_rows = place(ground, 0, 0.0)
    if upper:
        place(upper, 1, storey, min(1.0, max(0.3, 1.8 * sum(x.weight for x in upper) / sum(x.weight for x in ground))))

    service_total = sum(s[3] for s in SERVICE_ZONES)
    y = setback
    for key, label, kind, share, height in SERVICE_ZONES:
        d = bd * share / service_total
        x0, x1 = round(setback + block_w, 3), round(setback + bw, 3)
        y0, y1 = round(y, 3), round(y + d, 3)
        zones.append(Zone(zone_id=key, label=label, kind=kind, x=x0, y=y0, width_m=round(x1 - x0, 3), depth_m=round(y1 - y0, 3), height_m=height, area_m2=round((x1 - x0) * (y1 - y0), 2)))
        y += d

    by_step = {z.step: z for z in zones if z.step}
    ordered_steps = [by_step[i] for i in sorted(by_step)]
    flow = [FlowEdge(from_id=a.zone_id, to_id=b.zone_id) for a, b in zip(ordered_steps, ordered_steps[1:])]
    first, last = ordered_steps[0], ordered_steps[-1]
    entry = Point(x=0, y=round(first.y + first.depth_m / 2, 3))
    ends_west = (last.x + last.width_m / 2 < width / 2) if upper else (ground_rows - 1) % 2 == 1
    exit_ = Point(x=0 if ends_west else width, y=round(last.y + last.depth_m / 2, 3))

    if downwind == "west":  # put the service side (furnace, boiler, treatment, by-products) on the downwind side by mirroring the whole plan
        zones = [z.model_copy(update={"x": round(width - (z.x + z.width_m), 3)}) for z in zones]
        entry = Point(x=round(width - entry.x, 3), y=entry.y)
        exit_ = Point(x=round(width - exit_.x, 3), y=exit_.y)
    process_area = sum(z.area_m2 for z in zones if z.step)
    roof_m2 = process_area * USABLE_ROOF_SHARE
    kwp = roof_m2 * SOLAR_KWP_PER_M2_ROOF
    kwh = kwp * (solar_kwh_m2_day * 365 * 0.75 if solar_kwh_m2_day else SOLAR_KWH_PER_KWP_YEAR)  # measured sunshine x 365 days x 75% system efficiency, else an assumed yield
    plot_area = width * depth
    fits = plot_area >= template.min_area_m2

    claims: list[Claim] = [
        _claim(f"Plot size of {width:g} m x {depth:g} m was {'suggested by QuantarisAI as a typical starting size' if suggested else 'provided by you'}.", ClaimClassification.ASSUMPTION if suggested else ClaimClassification.FACT, methodology="Illustrative template default" if suggested else "User input"),
        (_claim(f"The process steps, equipment and relative zone sizes for {template.label.lower()} were drafted by AI from general knowledge. They are not yet backed by sources, so treat them as a starting point to check with someone who runs this kind of plant.", ClaimClassification.INFERENCE, confidence=0.3, reason="AI-drafted; needs validation") if template.origin == "ai" else _claim(f"Process order, zone proportions and a {setback:.1f} m boundary setback come from an illustrative {template.label.lower()} template, not from a surveyed design.", ClaimClassification.ASSUMPTION, confidence=0.3)),
        _claim(f"The process runs through {len(ordered_steps)} stages in a serpentine flow with one gate; service zones (office, utilities, effluent treatment, by-products) sit on the {downwind} side.", ClaimClassification.CALCULATION, methodology="Deterministic layout rules" + (" (service side chosen from measured wind)" if downwind == "west" else "")),
        _claim(f"Usable roof area is about {roof_m2:,.0f} m2, giving an indicative solar capacity of {kwp:,.0f} kWp and about {kwh:,.0f} kWh per year.", ClaimClassification.CALCULATION, confidence=0.3, methodology=(f"{USABLE_ROOF_SHARE:.0%} of process-zone area is usable roof x {SOLAR_KWP_PER_M2_ROOF} kWp/m2 x measured sunshine of {solar_kwh_m2_day} kWh/m2/day x 365 x 75% system efficiency. The sunshine figure is measured at your site; the roof share and panel density are assumptions." if solar_kwh_m2_day else f"{USABLE_ROOF_SHARE:.0%} of process-zone area is usable roof x {SOLAR_KWP_PER_M2_ROOF} kWp/m2 x {SOLAR_KWH_PER_KWP_YEAR} kWh/kWp/year. All three constants are illustrative assumptions pending site data.")),
        # AI-drafted ideas are shown with their waste stream (tagged "ideas to validate"), so repeating each one here would only add noise.
        *([] if template.origin == "ai" else [_claim(note, ClaimClassification.INFERENCE, confidence=0.3, reason="Hypothesis that needs validation") for note in template.by_product_ideas]),
        _claim("Share of electricity demand that solar could cover is unavailable.", ClaimClassification.UNKNOWN, reason="No verified evidence available: electricity demand and tariff have not been researched"),
        _claim("Capital cost and payback for this layout are unavailable.", ClaimClassification.UNKNOWN, reason="No verified evidence available: equipment and construction costs have not been researched"),
    ]
    if upper:
        claims.append(_claim(f"This is a double-storey plant: {len(ground)} steps on the ground floor and {len(upper)} on the first floor, which sits about {storey:.1f} m up and uses the same footprint. The storey height is an assumption.", ClaimClassification.ASSUMPTION, confidence=0.4))
    if not fits:
        claims.append(_claim(f"This plot ({plot_area:,.0f} m2) is smaller than the illustrative minimum of {template.min_area_m2:,.0f} m2 for this industry, so zones are compressed and may not be practical.", ClaimClassification.INFERENCE, confidence=0.4, reason="Based on an illustrative minimum area"))

    return LayoutResult(industry=industry_key, label=template.label, width_m=width, depth_m=depth, size_was_suggested=suggested, fits=fits, zones=zones, flow=flow, entry=entry, exit=exit_, claims=claims, location=template.location, waste_streams=list(template.waste_streams), utilities=list(template.utilities), environment=list(template.environment), drafted_by=template.origin, levels=2 if upper else 1, raw_inputs=list(template.raw_inputs), products=list(template.products), farm_crop=template.farm_crop)
