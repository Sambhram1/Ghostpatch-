import type { GhostpatchConfig } from "../config.js";
import type { Opportunity, TriageReasonCode, TriageResult } from "../types.js";

export function triage(
  opportunity: Opportunity,
  config: GhostpatchConfig
): TriageResult {
  const reasonCodes: TriageReasonCode[] = [];
  let score = 1;

  if (config.supportedLanguages.includes(opportunity.repoProfile.language)) {
    reasonCodes.push("supported-language");
  } else {
    reasonCodes.push("unsupported-language");
    score -= 0.6;
  }

  if (opportunity.repoProfile.repoActivityDays <= config.maxRepoActivityDays) {
    reasonCodes.push("active-maintainers");
  } else {
    reasonCodes.push("inactive-maintainers");
    score -= 0.3;
  }

  if (opportunity.repoProfile.hasTests) {
    reasonCodes.push("tests-present");
  } else {
    reasonCodes.push("tests-missing");
    score -= 0.2;
  }

  if (opportunity.diffRisk <= config.maxDiffRisk) {
    reasonCodes.push("small-diff");
  } else {
    reasonCodes.push("large-diff");
    score -= 0.25;
  }

  if (opportunity.ambiguityRisk <= config.maxAmbiguityRiskForDirectPr) {
    reasonCodes.push("low-ambiguity");
  } else {
    reasonCodes.push("high-ambiguity");
    score -= 0.15;
  }

  if (opportunity.repoProfile.antiBotPolicy) {
    reasonCodes.push("bot-hostile");
    score -= 0.5;
  } else {
    reasonCodes.push("bot-friendly");
  }

  if (opportunity.quality) {
    score += (opportunity.quality.score - 0.5) * 0.4;
  }

  const proceed = score >= config.minConfidenceToProceed;
  const modeHint =
    opportunity.ambiguityRisk <= config.maxAmbiguityRiskForDirectPr
      ? "direct-pr"
      : "issue-first";

  return {
    proceed,
    score: Number(score.toFixed(2)),
    modeHint,
    reasonCodes
  };
}
