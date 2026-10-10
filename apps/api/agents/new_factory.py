from collections.abc import Callable

from apps.api.application.blueprint_service import BlueprintService
from apps.api.domain.layout import BlueprintRequest, Language, LayoutResult
from apps.api.domain.siting import SiteConditions


class NewFactoryAgent:
    """Drafts the process, layout, waste and environment for a factory that does not exist yet."""

    def __init__(self, blueprints: BlueprintService) -> None:
        self._blueprints = blueprints

    def design(self, prompt: str, plot: tuple[float, float] | None, language: Language, locate: Callable[[str], SiteConditions | None] | None = None) -> LayoutResult:
        width, depth = plot if plot else (None, None)
        return self._blueprints.create(BlueprintRequest(prompt=prompt[:1000], language=language, width_m=width, depth_m=depth), locate)
