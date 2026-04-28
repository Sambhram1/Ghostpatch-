import type {
  CodingAgentName,
  Opportunity,
  PatchPlan,
  ReproResult,
  ReviewResult
} from "../types.js";
import type { GhostpatchConfig } from "../config.js";

export interface AgentConnection {
  agent: CodingAgentName;
  command?: string;
  envVar?: string;
  configuredAt?: string;
}

export interface AgentStatus {
  ready: boolean;
  detail: string;
}

export interface CodingAgentProvider {
  name: CodingAgentName;
  status(): Promise<AgentStatus>;
  generatePatch(
    opportunity: Opportunity,
    reproResult: ReproResult,
    config: GhostpatchConfig
  ): Promise<PatchPlan>;
  reviewPatch(opportunity: Opportunity, patch: PatchPlan): Promise<ReviewResult>;
}
