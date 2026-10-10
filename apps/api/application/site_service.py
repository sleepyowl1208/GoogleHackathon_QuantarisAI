import logging
from typing import Protocol

from apps.api.domain.siting import SiteConditions
from apps.api.integrations.geocoding import Geocoder, in_india

log = logging.getLogger("quantaris.site")


class ConditionsProvider(Protocol):
    def fetch(self, lat: float, lng: float, location: str) -> SiteConditions | None: ...


class SiteService:
    """Turns a place name into measured conditions at that place. Every failure returns None so a missing lookup never blocks a design."""

    def __init__(self, geocoder: Geocoder, conditions: ConditionsProvider) -> None:
        self._geocoder, self._conditions = geocoder, conditions

    def lookup(self, location: str) -> SiteConditions | None:
        place = location.strip()
        if not place:
            return None
        try:
            point = self._geocoder.geocode(f"{place}, India")
            if not point or not in_india(point.lat, point.lng):
                return None
            return self._conditions.fetch(point.lat, point.lng, place)
        except Exception as error:
            log.warning("site lookup failed: %s", type(error).__name__)
            return None
