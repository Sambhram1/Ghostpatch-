import type { GhostpatchConfig } from "../config.js";
import type { Opportunity, PatchPlan, ReproResult } from "../types.js";

export function planPatch(
  opportunity: Opportunity,
  reproResult: ReproResult,
  config: GhostpatchConfig
): PatchPlan {
  const patchTitle = opportunity.prHint ?? `Fix: ${opportunity.title}`;
  const diffBudgetPenalty = opportunity.diffRisk * 12;
  const diffBudget = Math.max(24, config.diffBudget - diffBudgetPenalty);

  return {
    patchTitle,
    files: opportunity.suggestedFiles,
    outline: [
      ...opportunity.patchOutline,
      `Carry forward repro confidence ${reproResult.confidence}.`
    ],
    diffBudget
  };
}
