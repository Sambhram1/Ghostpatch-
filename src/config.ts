import type { SupportedLanguage } from "./types.js";

export interface GhostpatchConfig {
  supportedLanguages: SupportedLanguage[];
  maxRepoActivityDays: number;
  maxMaintainerResponseDays: number;
  maxDiffRisk: number;
  maxAmbiguityRiskForDirectPr: number;
  minConfidenceToProceed: number;
  diffBudget: number;
}

export const defaultConfig: GhostpatchConfig = {
  supportedLanguages: ["python", "typescript"],
  maxRepoActivityDays: 45,
  maxMaintainerResponseDays: 14,
  maxDiffRisk: 4,
  maxAmbiguityRiskForDirectPr: 3,
  minConfidenceToProceed: 0.7,
  diffBudget: 120
};
