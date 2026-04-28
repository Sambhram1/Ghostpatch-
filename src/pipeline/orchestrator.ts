import { defaultConfig, type GhostpatchConfig } from "../config.js";
import type { Opportunity, OpportunityRun, RunReport } from "../types.js";
import { createLocalAgent } from "../agents/local-agent.js";
import type { CodingAgentProvider } from "../agents/types.js";
import { repro } from "./repro.js";
import { scout } from "./scout.js";
import { createSocialArtifact } from "./social.js";
import { triage } from "./triage.js";

export async function runOpportunity(
  opportunity: Opportunity,
  config: GhostpatchConfig = defaultConfig,
  agent: CodingAgentProvider = createLocalAgent()
): Promise<OpportunityRun> {
  const triageResult = triage(opportunity, config);
  const reproResult = triageResult.proceed ? repro(opportunity) : undefined;
  const patch = triageResult.proceed && reproResult?.confirmed
    ? await agent.generatePatch(opportunity, reproResult, config)
    : undefined;
  const review = patch ? await agent.reviewPatch(opportunity, patch) : undefined;
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

export async function runGhostpatch(
  opportunities: Opportunity[],
  config: GhostpatchConfig = defaultConfig,
  agent: CodingAgentProvider = createLocalAgent()
): Promise<RunReport> {
  const candidates = scout(opportunities, config);
  const runs = await Promise.all(
    candidates.map((opportunity) => runOpportunity(opportunity, config, agent))
  );

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: opportunities.length,
    agentName: agent.name,
    runs
  };
}
