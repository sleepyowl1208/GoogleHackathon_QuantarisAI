from typing import Protocol

from pydantic import Field

from apps.api.domain.contracts import Contract


class StepImageRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    label: str = Field(min_length=2, max_length=80)
    equipment: list[str] = Field(default_factory=list, max_length=8)
    outputs: list[str] = Field(default_factory=list, max_length=6)
    detail: str = Field(default="", max_length=420)


class StepImage(Contract):
    mime_type: str
    data_base64: str


class ImageLLM(Protocol):
    def generate_image(self, prompt: str, *, timeout: float = 90) -> tuple[str, str]: ...
