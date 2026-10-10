"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const storageKey = "quantaris-theme";
const changeEvent = "quantaris-theme-change";

function osTheme(): Theme { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
function savedTheme(): Theme | undefined { try { const value = window.localStorage.getItem(storageKey); return value === "light" || value === "dark" ? value : undefined; } catch { return undefined; } }
// The theme actually in effect: explicit data-theme, else saved choice, else the OS preference.
function currentTheme(): Theme { const attr = document.documentElement.dataset.theme; return attr === "light" || attr === "dark" ? attr : savedTheme() ?? osTheme(); }
function subscribe(notify: () => void) { window.addEventListener(changeEvent, notify); return () => window.removeEventListener(changeEvent, notify); }
function applyTheme(next: Theme) { document.documentElement.dataset.theme = next; window.dispatchEvent(new Event(changeEvent)); }

export function ThemeToggle(){
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  useEffect(() => { applyTheme(savedTheme() ?? osTheme()); }, []);
  const toggle = () => { const next: Theme = theme === "dark" ? "light" : "dark"; applyTheme(next); try { window.localStorage.setItem(storageKey, next); } catch { /* storage unavailable: choice applies for this session only */ } };
  return <button className="button secondary" onClick={toggle} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`}>{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button>;
}
