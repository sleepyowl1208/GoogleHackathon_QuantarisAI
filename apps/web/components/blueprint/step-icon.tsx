import { Beef, CookingPot, Milk, Sprout, Tractor, Cog, Droplets, Factory, FlaskConical, Flame, Leaf, Package, Recycle, ScanSearch, Scissors, Shirt, Snowflake, Sun, Thermometer, Truck, Warehouse, Wheat, Wrench, Zap, type LucideIcon } from "lucide-react";
import { zoneColor } from "@/lib/layout-api";

const icons: Record<string, LucideIcon> = { truck: Truck, droplets: Droplets, scissors: Scissors, flame: Flame, package: Package, warehouse: Warehouse, factory: Factory, cog: Cog, thermometer: Thermometer, flask: FlaskConical, shirt: Shirt, leaf: Leaf, sun: Sun, zap: Zap, recycle: Recycle, wheat: Wheat, cooking: CookingPot, snowflake: Snowflake, wrench: Wrench, inspect: ScanSearch, milk: Milk, beef: Beef, tractor: Tractor, sprout: Sprout };

/** A tile in the same colour as the zone on the layout, so a step card and its zone are recognisably the same thing. */
export function StepIcon({ icon, kind, size = 56 }: { icon: string; kind: string; size?: number }) {
  const Icon = icons[icon] ?? Factory;
  const light = ["pack", "office"].includes(kind);
  return <span className="bp-icon" style={{ width: size, height: size, background: zoneColor[kind] ?? "#9C8B75", color: light ? "#2A1A0C" : "#fff" }} aria-hidden="true"><Icon size={Math.round(size * 0.47)} strokeWidth={1.8} /></span>;
}
