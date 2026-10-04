"use client";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
export function ThemeToggle(){const [dark,setDark]=useState(false);const toggle=()=>{const next=!dark;document.documentElement.dataset.theme=next?"dark":"light";setDark(next)};return <button className="button secondary" onClick={toggle} aria-label={`Switch to ${dark?"light":"dark"} theme`}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button>}
