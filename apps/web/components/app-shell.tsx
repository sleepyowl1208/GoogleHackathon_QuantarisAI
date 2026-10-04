"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, Map, Orbit, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const links = [{ href: "/", label: "Command Center", icon: Sparkles }, { href: "/scenarios/scn_tshirt_1m/construction", label: "Construction", icon: Orbit }, { href: "/scenarios/scn_tshirt_1m/map", label: "Industrial Map", icon: Map }, { href: "/scenarios/scn_tshirt_1m/factory", label: "Factory Twin", icon: Factory }];
export function AppShell({ children }: { children: ReactNode }) { const pathname = usePathname(); return <div className="app-shell"><aside className="app-nav"><div className="brand"><div className="brand-mark">Q</div><span>QuantarisAI</span></div><nav className="nav-links" aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => <Link className="nav-link" aria-current={pathname === href ? "page" : undefined} href={href} key={href}><Icon size={17} aria-hidden="true"/> <span>{label}</span></Link>)}</nav></aside><main className="main"><header className="topbar"><span className="mono">Industrial intelligence / Bharat</span><span style={{display:"flex",gap:8,alignItems:"center"}}><span className="illustrative">≈ Illustrative model · not live data</span><ThemeToggle/></span></header>{children}</main></div>; }
export function ScenarioRail() { return <nav className="stage-rail" aria-label="Scenario stages"><Link href="/scenarios/scn_tshirt_1m/construction">01 Construct</Link><Link href="/scenarios/scn_tshirt_1m/map">02 India intelligence</Link><Link href="/scenarios/scn_tshirt_1m/ecosystem">03 Ecosystem</Link><Link href="/scenarios/scn_tshirt_1m/factory">04 Factory twin</Link><Link href="/demo">Replay</Link></nav>; }
