from typing import Protocol


class LLM(Protocol):
    """Anything that can return schema-shaped JSON for a prompt. Real: Gemini. Tests: a scripted fake."""

    def generate_json(self, system: str, parts: list[dict], schema: dict, *, temperature: float = 0.4, max_tokens: int = 6000, timeout: float | None = None) -> object: ...


class GroundedAnswer:
    """Text produced with live Google Search, plus the sources and search queries that backed it."""

    def __init__(self, text: str, sources: list[tuple[str, str]] | None = None, supports: list[tuple[str, list[int]]] | None = None, queries: list[str] | None = None) -> None:
        self.text = text
        self.sources = sources or []  # (title, url)
        self.supports = supports or []  # (text segment, indices into sources)
        self.queries = queries or []


class GroundedLLM(Protocol):
    def grounded_text(self, system: str, parts: list[dict], *, temperature: float = 0.3, max_tokens: int = 4000, timeout: float | None = None) -> GroundedAnswer: ...
