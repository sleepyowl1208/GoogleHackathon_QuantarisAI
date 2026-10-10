from pydantic import Field

from apps.api.domain.contracts import Contract
from apps.api.domain.layout import Language


class TranslateRequest(Contract):
    language: Language
    texts: list[str] = Field(min_length=1, max_length=120)


class TranslateResponse(Contract):
    texts: list[str]
