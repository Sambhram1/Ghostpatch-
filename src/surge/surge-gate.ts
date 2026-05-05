import { reviewPatchSafety } from "../live/safety.js";
import type { LivePatchResult } from "../live/patch-result-store.js";
import type { Opportunity } from "../types.js";

export interface SurgeGateDecision {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}

export interface SurgeGateOptions {
  minQualityScore?: number;
}

export function evaluatePatchPublishBlockers(result: LivePatchResult): string[] {
  return reviewPatchSafety(result, result.diffBudget).blockers;
}

export function evaluateSurgeGate(
  opportunity: Opportunity,
  result: LivePatchResult,
  options: SurgeGateOptions = {}
): SurgeGateDecision {
  const safety = reviewPatchSafety(result, result.diffBudget);
  const blockers = [...safety.blockers];
  const warnings = [...safety.warnings, ...safety.riskRemaining];
  const minQualityScore = options.minQualityScore ?? 0.78;
  const score = opportunity.quality?.score ?? 0;

  if (score < minQualityScore) {
    blockers.push(`candidate quality score ${score.toFixed(2)} is below the ${minQualityScore.toFixed(2)} threshold`);
  }

  if (opportunity.repoProfile.antiBotPolicy) {
    blockers.push("repository policy appears to restrict bot or AI contributions");
  }

  const contributionGuide = opportunity.repoProfile.contributionGuide;
  if (/no\s+(bots?|ai|automated)|human\s+only|do\s+not\s+use\s+(ai|llm)|no\s+llm/i.test(contributionGuide)) {
    blockers.push("contribution guide appears to restrict bot or AI contributions");
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings
  };
}
