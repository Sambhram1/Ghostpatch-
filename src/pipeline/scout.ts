import type { GhostpatchConfig } from "../config.js";
import type { Opportunity } from "../types.js";

export function scout(
  opportunities: Opportunity[],
  config: GhostpatchConfig
): Opportunity[] {
  return opportunities.filter((opportunity) =>
    config.supportedLanguages.includes(opportunity.repoProfile.language)
  );
}
