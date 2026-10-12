"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { INDIA_BOUNDS } from "@/lib/map-logic";
import { pinned, type Scout } from "@/lib/scout-api";

/** Numbered pins for the ranked places and a ring for the place asked about. Text is added with textContent only: names come from AI and web search. */
export function ScoutMap({ scout, label }: { scout: Scout; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    let map: import("leaflet").Map | undefined; let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled) return;
      map = L.map(el, { scrollWheelZoom: false, minZoom: 3, maxBounds: L.latLngBounds(INDIA_BOUNDS).pad(0.08), maxBoundsViscosity: 1 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(map);
      const points: [number, number][] = [];
      if (typeof scout.center_lat === "number" && typeof scout.center_lng === "number") {
        L.circle([scout.center_lat, scout.center_lng], { radius: 2500, color: "#138808", weight: 2, fillOpacity: 0.12 }).addTo(map).bindTooltip(label);
        points.push([scout.center_lat, scout.center_lng]);
      }
      for (const a of pinned(scout)) {
        const icon = L.divIcon({ className: "scout-pin", html: `<span>${a.rank}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
        const pop = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = a.name; pop.append(strong);
        if (a.pin_level === "town") { const ap = document.createElement("em"); ap.textContent = "≈"; strong.append(" ", ap); }
        if (a.locality) { const sub = document.createElement("div"); sub.textContent = a.locality; pop.append(sub); }
        L.marker([a.lat, a.lng], { icon }).addTo(map).bindPopup(pop); points.push([a.lat, a.lng]);
      }
      if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.25)); else map.setView(points[0] ?? [22.5, 78.9], points.length ? 11 : 5);
    });
    return () => { cancelled = true; map?.remove(); };
  }, [scout, label]);
  return <div ref={box} className="scout-map" role="img" aria-label={label} />;
}
