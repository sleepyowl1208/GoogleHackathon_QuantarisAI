import logging
import math
import urllib.parse
import urllib.request
import json
from datetime import datetime, timezone

from apps.api.domain.siting import SiteConditions, compass_label

log = logging.getLogger("quantaris.live")


def _get(url: str, timeout: float = 10.0) -> dict:
    return json.load(urllib.request.urlopen(url, timeout=timeout))


def aqi_label(aqi: int | None) -> str | None:
    if aqi is None:
        return None
    for limit, label in ((50, "Good"), (100, "Moderate"), (150, "Unhealthy for sensitive groups"), (200, "Unhealthy"), (300, "Very unhealthy")):
        if aqi <= limit:
            return label
    return "Hazardous"


def prevailing_wind(speeds: list[float | None], directions: list[float | None]) -> tuple[float, float] | None:
    """Speed-weighted vector mean of hourly wind. Returns (direction the wind comes FROM in degrees, mean speed km/h)."""
    u = v = n = total = 0.0
    for speed, direction in zip(speeds, directions):
        if speed is None or direction is None:
            continue
        rad = math.radians(direction)
        u += -speed * math.sin(rad)  # components of where the wind blows toward
        v += -speed * math.cos(rad)
        total += speed
        n += 1
    if not n or math.hypot(u, v) < 1e-6:
        return None
    return (math.degrees(math.atan2(-u, -v)) % 360, total / n)


class OpenMeteoConditions:
    """Measured weather, air quality and sunshine from Open-Meteo (free, no key). Replaced by Google's Weather, Air Quality and Solar APIs when keys exist."""

    source = "Open-Meteo (weather and CAMS air quality)"

    def fetch(self, lat: float, lng: float, location: str) -> SiteConditions | None:
        try:
            q = urllib.parse.urlencode({"latitude": lat, "longitude": lng, "current": "temperature_2m,wind_speed_10m,wind_direction_10m", "hourly": "wind_speed_10m,wind_direction_10m", "daily": "shortwave_radiation_sum", "past_days": 30, "forecast_days": 1, "timezone": "auto"})
            weather = _get("https://api.open-meteo.com/v1/forecast?" + q)
        except Exception as error:
            log.warning("weather fetch failed: %s", type(error).__name__)
            return None
        aqi = pm25 = None
        try:
            air = _get("https://air-quality-api.open-meteo.com/v1/air-quality?" + urllib.parse.urlencode({"latitude": lat, "longitude": lng, "current": "pm2_5,us_aqi"}))
            cur = air.get("current", {})
            pm25, aqi = cur.get("pm2_5"), cur.get("us_aqi")
        except Exception as error:  # air quality is optional; the rest is still useful
            log.warning("air quality fetch failed: %s", type(error).__name__)
        cur = weather.get("current", {})
        hourly = weather.get("hourly", {})
        wind = prevailing_wind(hourly.get("wind_speed_10m", []), hourly.get("wind_direction_10m", []))
        radiation = [x for x in weather.get("daily", {}).get("shortwave_radiation_sum", []) if x is not None]
        return SiteConditions(
            location=location, lat=lat, lng=lng, retrieved_at=datetime.now(timezone.utc), source=self.source,
            temperature_c=cur.get("temperature_2m"), wind_speed_kmh=cur.get("wind_speed_10m"), wind_from_deg=cur.get("wind_direction_10m"),
            prevailing_wind_from_deg=round(wind[0], 1) if wind else None, prevailing_wind_label=compass_label(wind[0]) if wind else None, avg_wind_kmh_30d=round(wind[1], 1) if wind else None,
            avg_solar_kwh_m2_day=round(sum(radiation) / len(radiation) / 3.6, 2) if radiation else None,  # MJ/m2/day to kWh/m2/day
            pm2_5=pm25, aqi_us=int(aqi) if aqi is not None else None, aqi_label=aqi_label(int(aqi)) if aqi is not None else None,
        )
