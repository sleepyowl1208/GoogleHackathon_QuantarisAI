import base64
import binascii
from typing import ClassVar, Literal

from pydantic import Field, field_validator, model_validator

from apps.api.domain.contracts import Contract
from apps.api.domain.improvement import ImprovementResult
from apps.api.domain.layout import Language, LayoutResult
from apps.api.domain.plan import UntrustedModel
from apps.api.domain.siting import SiteConditions

Mode = Literal["new", "existing"]
MAX_ATTACHMENT_B64 = 5_600_000  # about 4 MB of file
MAX_TOTAL_B64 = 12_000_000
MAGIC = {"image/png": (b"\x89PNG",), "image/jpeg": (b"\xff\xd8\xff",), "image/webp": (b"RIFF",), "application/pdf": (b"%PDF",)}


class ChatMessage(Contract):
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=2000)


class Attachment(Contract):
    name: str = Field(min_length=1, max_length=120)
    mime: str
    data_base64: str = Field(min_length=8, max_length=MAX_ATTACHMENT_B64)

    @model_validator(mode="after")
    def is_really_that_file_type(self):
        if self.mime not in MAGIC:
            raise ValueError("Only PNG, JPEG, WebP images and PDFs can be uploaded")
        try:
            head = base64.b64decode(self.data_base64[:64] + "=" * (-len(self.data_base64[:64]) % 4))[:8]
            base64.b64decode(self.data_base64, validate=True)
        except (binascii.Error, ValueError):
            raise ValueError("Attachment is not valid base64") from None
        if not any(head.startswith(m) for m in MAGIC[self.mime]):
            raise ValueError("File contents do not match the stated type")
        return self


class PlotSize(Contract):
    width_m: float = Field(ge=15, le=2000)
    depth_m: float = Field(ge=15, le=2000)


class ChatRequest(Contract):
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)
    mode: Mode | None = None
    language: Language = "en"
    attachments: list[Attachment] = Field(default_factory=list, max_length=3)
    plot: PlotSize | None = None
    last_prompt: str | None = Field(default=None, max_length=1000)
    context: str | None = Field(default=None, max_length=6500)

    @model_validator(mode="after")
    def ends_with_user_and_is_bounded(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be from the user")
        if sum(len(a.data_base64) for a in self.attachments) > MAX_TOTAL_B64:
            raise ValueError("Attachments are too large in total")
        return self


class OrchestratorDecision(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"suggestions": 4}
    intent: Literal["new_factory", "existing_factory", "redesign", "other"]
    ready: bool = False
    language: Language = "en"
    industry: str = Field(default="", max_length=100)
    location: str = Field(default="", max_length=120)
    plot_width_m: float | None = None
    plot_depth_m: float | None = None
    summary: str = Field(default="", max_length=260)
    reply: str = Field(default="", max_length=800)
    suggestions: list[str] = Field(default_factory=list, max_length=4)

    @field_validator("suggestions")
    @classmethod
    def suggestions_short(cls, value: list[str]) -> list[str]:
        return [item.strip()[:90] for item in value if item.strip()]

    @field_validator("plot_width_m", "plot_depth_m")
    @classmethod
    def plot_in_range(cls, value: float | None) -> float | None:
        return value if value is not None and 15 <= value <= 2000 else None


class AnswerSource(Contract):
    title: str
    url: str


class ChatResponse(Contract):
    route: Literal["clarify", "answer", "new_design", "existing_analysis"]
    assistant_text: str
    suggestions: list[str] = Field(default_factory=list)
    mode: Mode | None = None
    language: Language = "en"
    design: LayoutResult | None = None
    improvement: ImprovementResult | None = None
    prompt_used: str | None = None
    title: str | None = None
    industry: str | None = None
    location: str | None = None
    site: SiteConditions | None = None
    sources: list[AnswerSource] = Field(default_factory=list)
