"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { arcPoints, drawableFlows, INDIA_BOUNDS, initialView, roleStyle, spreadPins, type LatLng } from "@/lib/map-logic";
import type { Dict } from "@/lib/i18n";
import type { ResearchPlace, SiteResearch } from "@/lib/research-api";

// Set NEXT_PUBLIC_GOOGLE_MAPS_KEY to draw on Google Maps. Without it (or if Google fails to load) the same data is drawn on OpenStreetMap.
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const flowColor = (role: keyof typeof roleStyle) => (role === "candidate_site" ? "#E8780C" : roleStyle[role].color);

function line(parent: HTMLElement, tag: string, text: string, className?: string) {
  const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; parent.append(el); return el;
}
/** Built with textContent only: names and notes come from AI and web search, so they are never inserted as HTML. */
function popupNode(place: ResearchPlace, research: SiteResearch, t: Dict, spread: boolean): HTMLElement {
  const root = document.createElement("div"); root.className = "map-pop";
  line(root, "strong", place.name);
  line(root, "span", [t.roles[place.role], [place.locality, place.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "), "pop-sub");
  if (place.material) line(root, "span", place.material, "pop-tag");
  if (place.note) line(root, "p", place.note);
  if (place.address) line(root, "p", place.address, "pop-address");
  if (place.location_quality === "verified") line(root, "em", t.verifiedAddress);
  else if (place.location_quality === "place_level" && place.role !== "site") line(root, "em", spread ? `${t.townLevel}. ${t.spreadNote}` : t.townLevel);
  const links = place.source_ids.map((id) => research.sources.find((s) => s.source_id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s && s.url.startsWith("https://")));
  if (links.length) { const row = document.createElement("div"); row.className = "pop-links"; links.slice(0, 3).forEach((s) => { const a = document.createElement("a"); a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = s.title; row.append(a); }); root.append(row); }
  else if (place.role !== "site") line(root, "em", t.unsourced, "pop-warn");
  return root;
}

type Cancel = { cancelled: boolean };

async function renderLeaflet(el: HTMLElement, research: SiteResearch, t: Dict, cancel: Cancel): Promise<() => void> {
  const L = (await import("leaflet")).default;
  if (cancel.cancelled) return () => {}; // this run was superseded while the library loaded; building a second map on the same element would throw
  const india = L.latLngBounds(INDIA_BOUNDS);
  const map = L.map(el, { scrollWheelZoom: false, minZoom: 3, maxBounds: india.pad(0.08), maxBoundsViscosity: 1 }); // the map stays on India
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(map);
  const points: LatLng[] = [];
  for (const f of drawableFlows(research)) { L.polyline(arcPoints(f.from, f.to), { color: flowColor(f.role), weight: 3, dashArray: "7 9", opacity: 0.9, className: "flow-line" }).addTo(map); points.push(f.from, f.to); }
  for (const pin of spreadPins(research.places)) {
    const style = roleStyle[pin.place.role];
    const icon = L.divIcon({ className: "pin-wrap", html: `<span class="pin pin-${pin.place.role}" style="background:${style.color};border-color:${style.ring}">${pin.place.role === "site" ? "★" : ""}</span>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
    L.marker(pin.position, { icon, title: pin.place.name }).bindPopup(popupNode(pin.place, research, t, pin.spread), { maxWidth: 290 }).addTo(map);
    points.push(pin.position);
  }
  map.fitBounds(initialView(points), { padding: [12, 12], maxZoom: 9 });
  map.setMinZoom(Math.max(3, map.getBoundsZoom(india) - 0.5));
  const report = () => { el.dataset.bounds = map.getBounds().toBBoxString(); el.dataset.zoom = String(map.getZoom()); }; // current view, readable by tests and tools
  map.on("moveend", report); report();
  const observer = new ResizeObserver(() => { map.invalidateSize(); map.setMinZoom(Math.max(3, map.getBoundsZoom(india) - 0.5)); }); observer.observe(el);
  setTimeout(() => map.invalidateSize(), 60);
  return () => { observer.disconnect(); map.remove(); };
}

/* Google Maps path: written against the public JavaScript API but not yet exercised with a real key; any failure falls back to OpenStreetMap. */
declare global { interface Window { google?: any; gm_authFailure?: () => void; __gmapsLoading?: Promise<void> } }
function loadGoogle(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  window.__gmapsLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error("load")); document.head.append(script);
    setTimeout(() => reject(new Error("timeout")), 10000);
  });
  return window.__gmapsLoading;
}
async function renderGoogle(el: HTMLElement, research: SiteResearch, t: Dict, cancel: Cancel): Promise<() => void> {
  await loadGoogle(GOOGLE_KEY);
  if (cancel.cancelled) return () => {};
  const g = window.google.maps;
  const map = new g.Map(el, { center: { lat: 22.5, lng: 79 }, zoom: 4, minZoom: 4, restriction: { latLngBounds: { south: INDIA_BOUNDS[0][0], west: INDIA_BOUNDS[0][1], north: INDIA_BOUNDS[1][0], east: INDIA_BOUNDS[1][1] }, strictBounds: false }, mapTypeControl: false, streetViewControl: false, gestureHandling: "cooperative" });
  const info = new g.InfoWindow(); const bounds = new g.LatLngBounds(); const things: any[] = [];
  for (const f of drawableFlows(research)) {
    const path = arcPoints(f.from, f.to).map(([lat, lng]) => ({ lat, lng }));
    things.push(new g.Polyline({ map, path, strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3, strokeColor: flowColor(f.role) }, offset: "0", repeat: "14px" }] }));
    path.forEach((p) => bounds.extend(p));
  }
  for (const pin of spreadPins(research.places)) {
    const style = roleStyle[pin.place.role]; const position = { lat: pin.position[0], lng: pin.position[1] };
    const marker = new g.Marker({ map, position, title: pin.place.name, icon: { path: g.SymbolPath.CIRCLE, scale: pin.place.role === "site" ? 11 : 9, fillColor: style.color, fillOpacity: 1, strokeColor: style.ring, strokeWeight: 2.5 } });
    marker.addListener("click", () => { info.setContent(popupNode(pin.place, research, t, pin.spread)); info.open({ map, anchor: marker }); });
    things.push(marker); bounds.extend(position);
  }
  const view = initialView(research.places.filter((p) => p.lat != null && p.lng != null).map((p) => [p.lat as number, p.lng as number] as LatLng));
  map.fitBounds({ south: view[0][0], west: view[0][1], north: view[1][0], east: view[1][1] }, 12);
  return () => { things.forEach((x) => x.setMap(null)); };
}

export function SiteMap({ research, t, dark }: { research: SiteResearch; t: Dict; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<"google" | "osm">(GOOGLE_KEY ? "google" : "osm");
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let cleanup: (() => void) | undefined; const cancel: Cancel = { cancelled: false };
    (async () => {
      try {
        window.gm_authFailure = () => { if (!cancel.cancelled) setProvider("osm"); };
        cleanup = provider === "google" ? await renderGoogle(el, research, t, cancel) : await renderLeaflet(el, research, t, cancel);
        if (cancel.cancelled) cleanup();
      } catch (error) { console.warn("map render failed", error); if (!cancel.cancelled && provider === "google") setProvider("osm"); }
    })();
    return () => { cancel.cancelled = true; cleanup?.(); };
  }, [research, t, provider]);
  return <div ref={ref} className={`site-map ${dark ? "dark-tiles" : ""}`} data-provider={provider} role="region" aria-label="Map" />;
}
