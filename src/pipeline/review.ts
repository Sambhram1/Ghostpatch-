import type { Opportunity, PatchPlan, ReviewResult } from "../types.js";

export function reviewArtifacts(
  opportunity: Opportunity,
  patch: PatchPlan
): ReviewResult {
  const warnings: string[] = [];
  let aiSmellScore = 0.1;

  if (patch.outline.length > 5) {
    warnings.push("Patch plan is too chatty.");
    aiSmellScore += 0.25;
  }

  if (patch.diffBudget < 30) {
    warnings.push("Diff budget is too tight for a credible patch.");
    aiSmellScore += 0.2;
  }

  if (opportunity.summary.toLowerCase().includes("maybe")) {
    warnings.push("Opportunity statement is too ambiguous.");
    aiSmellScore += 0.25;
  }

  return {
    approved: aiSmellScore < 0.45,
    aiSmellScore: Number(aiSmellScore.toFixed(2)),
    warnings
  };
}
