from typing import Literal, Protocol

from pydantic import Field

from apps.api.domain.contracts import Contract


class StepVideoRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    label: str = Field(min_length=2, max_length=80)
    equipment: list[str] = Field(default_factory=list, max_length=8)
    outputs: list[str] = Field(default_factory=list, max_length=6)
    detail: str = Field(default="", max_length=420)
    focus: Literal["process", "water"] = "process"
    water_note: str = Field(default="", max_length=400)  # how this step's water and waste are handled, so the water film shows the same story


class VideoJob(Contract):
    job_id: str
    status: Literal["working", "done", "failed"]
    url: str | None = None
    message: str | None = None
    model: str = ""


class VideoClient(Protocol):
    def start_video(self, prompt: str, *, model: str, duration_s: int = 4, resolution: str = "720p") -> str: ...
    def check_video(self, operation: str) -> tuple[str, str]: ...
    def download_video(self, uri: str, max_bytes: int = 60_000_000) -> bytes: ...
