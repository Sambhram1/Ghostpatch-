import type { GhostpatchConfig } from "../config.js";
import { planPatch } from "../pipeline/patch.js";
import { reviewArtifacts } from "../pipeline/review.js";
import type {
  CodingAgentName,
  Opportunity,
  PatchPlan,
  ReproResult,
  ReviewResult
} from "../types.js";
import type { AgentConnection, CodingAgentProvider } from "./types.js";

export function createExternalAgent(
  name: Exclude<CodingAgentName, "local">,
  connection?: AgentConnection
): CodingAgentProvider {
  return {
    name,
    async status() {
      if (connection?.envVar && process.env[connection.envVar]) {
        return {
          ready: true,
          detail: `using ${connection.envVar} from environment`
        };
      }

      if (connection?.command) {
        return {
          ready: true,
          detail: `registered CLI command: ${connection.command}`
        };
      }

      return {
        ready: false,
        detail: `run ghostpatch login ${name} --command ${name}`
      };
    },
    async generatePatch(
      opportunity: Opportunity,
      reproResult: ReproResult,
      config: GhostpatchConfig
    ): Promise<PatchPlan> {
      const basePlan = planPatch(opportunity, reproResult, config);
      return {
        ...basePlan,
        outline: [
          ...basePlan.outline,
          `Prepared for ${name} handoff with repo evidence attached.`
        ],
        agentName: name,
        agentMode: "external-ready"
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
