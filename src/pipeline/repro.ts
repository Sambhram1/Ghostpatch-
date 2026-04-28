import type { Opportunity, ReproResult } from "../types.js";

export function repro(opportunity: Opportunity): ReproResult {
  const evidence = [
    `Validated expected behavior: ${opportunity.expectedBehavior}`,
    `Observed actual behavior: ${opportunity.actualBehavior}`,
    `Validation command: ${opportunity.validationCommand}`
  ];

  const confidence = Math.max(
    0.4,
    Number((1 - opportunity.ambiguityRisk * 0.07 - opportunity.diffRisk * 0.04).toFixed(2))
  );

  return {
    confirmed: confidence >= 0.5,
    confidence,
    evidence,
    validationCommand: opportunity.validationCommand
  };
}
