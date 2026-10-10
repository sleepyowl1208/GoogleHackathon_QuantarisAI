import { ArrowUp, Gauge, Sun, Thermometer, Wind } from "lucide-react";
import { fill, type Dict } from "@/lib/i18n";
import type { SiteConditions } from "@/lib/research-api";

export function LiveConditions({ site, t }: { site: SiteConditions; t: Dict }) {
  const time = new Date(site.retrieved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const aqiTone = site.aqi_us == null ? "" : site.aqi_us <= 50 ? "good" : site.aqi_us <= 100 ? "moderate" : "bad";
  const dir = site.wind_from_deg != null ? Math.round(site.wind_from_deg) : null;
  return (
    <section className="live" aria-label={t.liveTitle}>
      <header><h3>{t.liveTitle}</h3><span className="live-tag"><span className="live-dot" aria-hidden="true" />{t.liveTag}</span></header>
      <div className="live-grid">
        {site.temperature_c != null ? <div className="live-cell"><Thermometer size={18} /><span className="live-label">{t.liveTemp}</span><strong>{Math.round(site.temperature_c)} °C</strong></div> : null}
        {site.wind_speed_kmh != null || site.prevailing_wind_label ? (
          <div className="live-cell wide">
            <Wind size={18} /><span className="live-label">{t.liveWind}</span>
            <strong className="wind-line">{dir != null ? <ArrowUp size={16} style={{ transform: `rotate(${(dir + 180) % 360}deg)` }} aria-hidden="true" /> : null}{site.wind_speed_kmh != null && dir != null ? fill(t.liveWindNow, { speed: Math.round(site.wind_speed_kmh), dir: compass(dir) }) : ""}</strong>
            {site.prevailing_wind_label ? <span className="live-sub">{fill(t.liveWindMostly, { dir: site.prevailing_wind_label, speed: site.avg_wind_kmh_30d ?? "–" })}</span> : null}
          </div>
        ) : null}
        {site.aqi_us != null ? <div className="live-cell"><Gauge size={18} /><span className="live-label">{t.liveAir}</span><strong className={`aqi ${aqiTone}`}>{site.aqi_us} · {site.aqi_label}</strong>{site.pm2_5 != null ? <span className="live-sub">PM2.5 {Math.round(site.pm2_5)} µg/m³</span> : null}</div> : null}
        {site.avg_solar_kwh_m2_day != null ? <div className="live-cell"><Sun size={18} /><span className="live-label">{t.liveSolar}</span><strong>{site.avg_solar_kwh_m2_day}</strong><span className="live-sub">{t.liveSolarUnit}</span></div> : null}
      </div>
      <p className="live-foot">{fill(t.liveUpdated, { time, source: site.source })}</p>
    </section>
  );
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
