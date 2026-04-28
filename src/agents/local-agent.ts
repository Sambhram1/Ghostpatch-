import type { GhostpatchConfig } from "../config.js";
import { planPatch } from "../pipeline/patch.js";
import { reviewArtifacts } from "../pipeline/review.js";
import type { Opportunity, PatchPlan, ReproResult, ReviewResult } from "../types.js";
import type { CodingAgentProvider } from "./types.js";

export function createLocalAgent(): CodingAgentProvider {
  return {
    name: "local",
    async status() {
      return {
        ready: true,
        detail: "built-in deterministic dry-run provider"
      };
    },
    async generatePatch(
      opportunity: Opportunity,
      reproResult: ReproResult,
      config: GhostpatchConfig
    ): Promise<PatchPlan> {
      return {
        ...planPatch(opportunity, reproResult, config),
        agentName: "local",
        agentMode: "deterministic"
      };
    },
    async reviewPatch(
      opportunity: Opportunity,
      patch: PatchPlan
    ): Promise<ReviewResult> {
      return reviewArtifacts(opportunity, patch);
    }
  };
}
