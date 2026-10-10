from datetime import datetime, timezone

from apps.api.domain.research import RawFinding, ResearchRequest, ResearchTopic


class FakeResearchProvider:
    """Deterministic, explicitly illustrative provider for tests and offline development."""

    def __init__(self, scripted: dict[ResearchTopic, list[RawFinding]] | None = None) -> None:
        self._scripted = scripted if scripted is not None else {}

    def search(self, request: ResearchRequest) -> list[RawFinding]:
        return list(self._scripted.get(request.topic, []))


def illustrative_finding(statement: str, **overrides) -> RawFinding:
    base = dict(
        statement=statement,
        source_title="Illustrative fixture source",
        source_provider="fixture",
        source_url="https://example.com/illustrative",
        source_type="fixture",
        retrieved_at=datetime(2026, 10, 4, tzinfo=timezone.utc),
        geography="Jhansi, Uttar Pradesh",
        confidence=0.6,
    )
    base.update(overrides)
    return RawFinding(**base)
