import { defaultConfig, type GhostpatchConfig } from "../config.js";
import type { Opportunity, OpportunityRun, RunReport } from "../types.js";
import { planPatch } from "./patch.js";
import { repro } from "./repro.js";
import { reviewArtifacts } from "./review.js";
import { scout } from "./scout.js";
import { createSocialArtifact } from "./social.js";
import { triage } from "./triage.js";

export function runOpportunity(
  opportunity: Opportunity,
  config: GhostpatchConfig = defaultConfig
): OpportunityRun {
  const triageResult = triage(opportunity, config);
  const reproResult = triageResult.proceed ? repro(opportunity) : undefined;
  const patch = triageResult.proceed && reproResult?.confirmed
    ? planPatch(opportunity, reproResult, config)
    : undefined;
  const review = patch ? reviewArtifacts(opportunity, patch) : undefined;
  const social = createSocialArtifact(
    opportunity,
    triageResult,
    reproResult,
    patch,
    review
  );

  return {
    opportunity,
    triage: triageResult,
    repro: reproResult,
    patch,
    review,
    social
  };
}

export function runGhostpatch(
  opportunities: Opportunity[],
  config: GhostpatchConfig = defaultConfig
): RunReport {
  const candidates = scout(opportunities, config);
  const runs = candidates.map((opportunity) => runOpportunity(opportunity, config));

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: opportunities.length,
    runs
  };
}
