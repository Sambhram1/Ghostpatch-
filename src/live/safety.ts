import type { LivePatchResult } from "./patch-result-store.js";

export interface PatchSafetyReview {
  approved: boolean;
  diffLineCount: number;
  blockers: string[];
  warnings: string[];
  riskRemaining: string[];
}

const riskyFilePatterns = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Pipfile\.lock$/,
  /(^|\/)dist\//,
  /(^|\/)build\//
];

const secretPatterns = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /private[_-]?key/i
];

export function countDiffLines(diff: string): number {
  return diff
    .split(/\r?\n/)
    .filter((line) =>
      (line.startsWith("+") || line.startsWith("-"))
      && !line.startsWith("+++")
      && !line.startsWith("---")
    ).length;
}

export function reviewPatchSafety(result: LivePatchResult, diffBudget: number): PatchSafetyReview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const riskRemaining: string[] = [];
  const diffLineCount = countDiffLines(result.diff);

  if (result.changedFiles.length === 0) {
    blockers.push("the solved workspace has no changed files");
  }

  if (result.agentExitCode !== 0) {
    blockers.push(`the agent exited with ${result.agentExitCode}`);
  }

  if (result.testExitCode !== 0) {
    blockers.push(`the validation command exited with ${result.testExitCode}`);
  }

  if (diffLineCount > diffBudget) {
    blockers.push(`the diff has ${diffLineCount} changed lines, over the ${diffBudget} line budget`);
  }

  const riskyFiles = result.changedFiles.filter((file) =>
    riskyFilePatterns.some((pattern) => pattern.test(file.replaceAll("\\", "/")))
  );
  if (riskyFiles.length > 0) {
    warnings.push(`review generated or sensitive files manually: ${riskyFiles.join(", ")}`);
  }

  if (secretPatterns.some((pattern) => pattern.test(result.diff))) {
    blockers.push("the diff appears to contain secret-like content");
  }

  if (!result.testOutput.trim()) {
    riskRemaining.push("validation produced no output to inspect");
  }

  if (warnings.length > 0) {
    riskRemaining.push("manual review is needed for generated or sensitive files");
  }

  if (blockers.length === 0 && riskRemaining.length === 0) {
    riskRemaining.push("no automated blocker found; maintainer intent still needs human judgment");
  }

  return {
    approved: blockers.length === 0,
    diffLineCount,
    blockers,
    warnings,
    riskRemaining
  };
}
