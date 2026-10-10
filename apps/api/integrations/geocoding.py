import json
import logging
import os
import threading
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from apps.api.integrations.gemini_client import load_local_env

log = logging.getLogger("quantaris.geo")
INDIA = (6.0, 37.6, 68.0, 97.5)  # lat min, lat max, lng min, lng max: a result outside this box is a wrong-country match, so it is discarded


@dataclass(frozen=True)
class GeoPoint:
    lat: float
    lng: float
    label: str
    provider: str


def in_india(lat: float, lng: float) -> bool:
    return INDIA[0] <= lat <= INDIA[1] and INDIA[2] <= lng <= INDIA[3]


class Geocoder(Protocol):
    name: str

    def geocode(self, query: str) -> GeoPoint | None: ...


def _get_json(url: str, headers: dict[str, str], timeout: float = 10.0) -> object:
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=timeout))


class GoogleGeocoder:
    """Google Geocoding API. Used automatically once GOOGLE_MAPS_SERVER_KEY is set."""

    name = "Google Geocoding"

    def __init__(self, key: str) -> None:
        self._key = key

    def geocode(self, query: str) -> GeoPoint | None:
        url = "https://maps.googleapis.com/maps/api/geocode/json?" + urllib.parse.urlencode({"address": query, "region": "in", "key": self._key})
        try:
            data = _get_json(url, {})
            if data.get("status") != "OK" or not data.get("results"):
                return None
            top = data["results"][0]
            loc = top["geometry"]["location"]
            return GeoPoint(float(loc["lat"]), float(loc["lng"]), str(top.get("formatted_address", query)), self.name)
        except Exception as error:  # never leak the key through an error message
            log.warning("google geocode failed: %s", type(error).__name__)
            return None


class NominatimGeocoder:
    """OpenStreetMap Nominatim: free and keyless, used until a Google key exists. Its policy allows one request per second and requires an identifying User-Agent."""

    name = "OpenStreetMap Nominatim"

    def __init__(self, user_agent: str | None = None, min_interval: float = 1.1) -> None:
        load_local_env()
        self._ua = user_agent or os.environ.get("GEOCODER_USER_AGENT", "QuantarisAI/0.1 (hackathon prototype)")
        self._interval = min_interval
        self._last = 0.0
        self._lock = threading.Lock()

    def geocode(self, query: str) -> GeoPoint | None:
        with self._lock:
            wait = self._interval - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": query, "format": "json", "limit": 1, "countrycodes": "in"})
        try:
            data = _get_json(url, {"User-Agent": self._ua})
            if not data:
                return None
            return GeoPoint(float(data[0]["lat"]), float(data[0]["lon"]), str(data[0].get("display_name", query))[:160], self.name)
        except Exception as error:
            log.warning("nominatim geocode failed: %s", type(error).__name__)
            return None


class CachingGeocoder:
    """Remembers answers (including misses) so the same place is never looked up twice. Persists to a gitignored file."""

    def __init__(self, inner: "Geocoder | list[Geocoder]", path: Path | None = None) -> None:
        self._chain = inner if isinstance(inner, list) else [inner]
        self.name = " → ".join(g.name for g in self._chain)
        self._path = path
        self._cache: dict[str, dict | None] = {}
        if path and path.exists():
            try:
                self._cache = json.loads(path.read_text())
            except Exception:
                self._cache = {}

    def geocode(self, query: str) -> GeoPoint | None:
        key = " ".join(query.lower().split())
        if key in self._cache:
            hit = self._cache[key]
            return GeoPoint(**hit) if hit else None
        point = next((p for g in self._chain if (p := g.geocode(query))), None)
        self._cache[key] = point.__dict__ if point else None
        if self._path:
            try:
                self._path.parent.mkdir(parents=True, exist_ok=True)
                self._path.write_text(json.dumps(self._cache))
            except OSError:
                pass
        return point


def default_geocoder() -> CachingGeocoder:
    load_local_env()
    chain: list[Geocoder] = []
    key = os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")
    if key:
        chain.append(GoogleGeocoder(key))
    chain.append(NominatimGeocoder())
    return CachingGeocoder(chain, Path(__file__).resolve().parents[3] / ".quantaris-cache" / "geocode.json")


@dataclass(frozen=True)
class FoundPlace:
    name: str
    address: str
    lat: float
    lng: float
    maps_uri: str


class PlacesFinder(Protocol):
    def find(self, query: str) -> list[FoundPlace]: ...


class GooglePlacesFinder:
    """Google Places API (New) text search: real businesses with real addresses and coordinates. Active only when GOOGLE_MAPS_SERVER_KEY is set."""

    def __init__(self, key: str) -> None:
        self._key = key

    def find(self, query: str) -> list[FoundPlace]:
        body = json.dumps({"textQuery": query, "regionCode": "IN", "pageSize": 8}).encode()
        headers = {"Content-Type": "application/json", "X-Goog-Api-Key": self._key, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.googleMapsUri"}
        try:
            response = json.load(urllib.request.urlopen(urllib.request.Request("https://places.googleapis.com/v1/places:searchText", data=body, headers=headers), timeout=12))
            found = []
            for place in response.get("places", []):
                loc = place.get("location") or {}
                if "latitude" in loc and in_india(loc["latitude"], loc["longitude"]):
                    found.append(FoundPlace(str((place.get("displayName") or {}).get("text", ""))[:80], str(place.get("formattedAddress", ""))[:200], float(loc["latitude"]), float(loc["longitude"]), str(place.get("googleMapsUri", ""))))
            return [f for f in found if f.name]
        except Exception as error:
            log.warning("google places failed: %s", type(error).__name__)
            return []


def default_places_finder() -> PlacesFinder | None:
    load_local_env()
    key = os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")
    return GooglePlacesFinder(key) if key else None
