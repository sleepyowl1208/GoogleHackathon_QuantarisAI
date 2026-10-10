import { useSyncExternalStore } from "react";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", notify);
  return () => { observer.disconnect(); media.removeEventListener("change", notify); };
}
function isDark() { const attr = document.documentElement.dataset.theme; return attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
export const useDark = () => useSyncExternalStore(subscribeTheme, isDark, () => false);

let webglCache: boolean | undefined;
function webglOk() { if (webglCache === undefined) { const canvas = document.createElement("canvas"); webglCache = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } return webglCache; }
const never = () => () => {};
export const useWebgl = () => useSyncExternalStore(never, webglOk, () => true);
