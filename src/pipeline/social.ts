import type {
  DecisionMode,
  Opportunity,
  PatchPlan,
  ReproResult,
  ReviewResult,
  SocialArtifact,
  TriageResult
} from "../types.js";

function buildIssueBody(opportunity: Opportunity, reproResult: ReproResult): string {
  const steps = opportunity.reproductionSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return [
    `I reproduced a narrow bug in \`${opportunity.repoProfile.repo}\` and wanted to confirm expected behavior before opening a patch.`,
    "",
    `Expected: ${opportunity.expectedBehavior}`,
    `Actual: ${opportunity.actualBehavior}`,
    "",
    "Reproduction:",
    steps,
    "",
    `Validation command: \`${reproResult.validationCommand}\``
  ].join("\n");
}

function buildPrBody(opportunity: Opportunity, reproResult: ReproResult, patch: PatchPlan): string {
  return [
    `This fixes a small reproduced bug in \`${opportunity.repoProfile.repo}\`.`,
    "",
    `Expected: ${opportunity.expectedBehavior}`,
    `Actual before patch: ${opportunity.actualBehavior}`,
    "",
    "Change set:",
    ...patch.outline.map((line) => `- ${line}`),
    "",
    `Validation: \`${reproResult.validationCommand}\``
  ].join("\n");
}

export function createSocialArtifact(
  opportunity: Opportunity,
  triageResult: TriageResult,
  reproResult: ReproResult | undefined,
  patch: PatchPlan | undefined,
  reviewResult: ReviewResult | undefined
): SocialArtifact {
  if (!triageResult.proceed || !reproResult?.confirmed || !patch || !reviewResult?.approved) {
    return { mode: "skip" };
  }

  const mode: DecisionMode = triageResult.modeHint;
  if (mode === "issue-first") {
    return {
      mode,
      issueTitle: opportunity.issueHint ?? opportunity.title,
      issueBody: buildIssueBody(opportunity, reproResult)
    };
  }

  return {
    mode,
    prTitle: patch.patchTitle,
    prBody: buildPrBody(opportunity, reproResult, patch)
  };
}
