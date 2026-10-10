"use client";
import { createContext, useContext } from "react";
import type { Language } from "@/lib/chat-api";
import type { StepEnv } from "@/lib/step-env-api";

export type StepCtx = {
  language: Language; industry: string; location: string; wastes: string[];
  waterSteps: string[];                       // steps that use a lot of water, for the plant-wide water and waste layer
  envs: Record<string, StepEnv>; saveEnv: (key: string, env: StepEnv) => void;
};
export const StepContext = createContext<StepCtx | undefined>(undefined);
export const useStepCtx = () => useContext(StepContext);
export const envKey = (language: Language, zoneId: string) => `${language}:${zoneId}`;
