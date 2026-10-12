from enum import Enum
from typing import Literal

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract


class Industry(str, Enum):
    PICKLE = "pickle"
    TSHIRT = "tshirt"


class ZoneKind(str, Enum):
    RECEIVE = "receive"
    WASH = "wash"
    PREP = "prep"
    PROCESS = "process"
    PACK = "pack"
    STORE = "store"
    DISPATCH = "dispatch"
    OFFICE = "office"
    UTILITY = "utility"
    EFFLUENT = "effluent"
    BYPRODUCT = "byproduct"
    LIVESTOCK = "livestock"


ICONS = ("truck", "droplets", "scissors", "flame", "package", "warehouse", "factory", "cog", "thermometer", "flask", "shirt", "leaf", "sun", "zap", "recycle", "wheat", "cooking", "snowflake", "wrench", "inspect", "milk", "beef", "tractor", "sprout")


class WasteStream(Contract):
    name: str
    description: str
    by_product_ideas: list[str] = Field(default_factory=list)


class EnvironmentNote(Contract):
    aspect: str
    impact: str
    mitigation: str = ""


Language = Literal["en", "hi"]


class BlueprintRequest(Contract):
    prompt: str = Field(min_length=3, max_length=1000)
    language: Language = "en"
    width_m: float | None = Field(default=None, ge=15, le=2000)
    depth_m: float | None = Field(default=None, ge=15, le=2000)


class LayoutRequest(Contract):
    industry: Industry
    width_m: float | None = Field(default=None, ge=15, le=2000)
    depth_m: float | None = Field(default=None, ge=15, le=2000)


class Point(Contract):
    x: float
    y: float


class Zone(Contract):
    """Axis-aligned rectangle in metres. Origin is the plot's south-west corner; x runs east, y runs north."""

    zone_id: str
    label: str
    kind: ZoneKind
    x: float
    y: float
    width_m: float
    depth_m: float
    height_m: float
    area_m2: float
    step: int | None = None
    note: str = ""
    equipment: list[str] = Field(default_factory=list)
    icon: str = "factory"
    detail: str = ""
    outputs: list[str] = Field(default_factory=list)
    level: int = 0  # 0 = ground floor, 1 = first floor
    elevation_m: float = 0.0  # height of this zone's floor above the ground


class Vehicle(Contract):
    """A vehicle that visits a zone (for example a truck unloading raw material). Decoration that shows the plant working."""

    kind: Literal["truck", "tanker", "tractor"] = "truck"
    zone_id: str
    direction: Literal["in", "out"] = "in"
    label: str = ""


class FlowEdge(Contract):
    from_id: str
    to_id: str


class TemplateSummary(Contract):
    industry: Industry
    label: str
    suggested_width_m: float
    suggested_depth_m: float


class LayoutResult(Contract):
    industry: str
    label: str
    width_m: float
    depth_m: float
    size_was_suggested: bool
    fits: bool
    zones: list[Zone]
    flow: list[FlowEdge]
    entry: Point
    exit: Point
    claims: list[Claim]
    freshness: str = "ILLUSTRATIVE"
    location: str | None = None
    waste_streams: list[WasteStream] = Field(default_factory=list)
    utilities: list[str] = Field(default_factory=list)
    environment: list[EnvironmentNote] = Field(default_factory=list)
    drafted_by: str = "template"
    levels: int = 1
    vehicles: list[Vehicle] = Field(default_factory=list)
    raw_inputs: list[str] = Field(default_factory=list)   # what arrives at the gate, whole and unprocessed
    products: list[str] = Field(default_factory=list)     # what leaves the dispatch dock
    farm_crop: str = ""                                   # the crop grown on a nearby farm, if the raw material is a crop
