import type { CandidateQuality } from "../types.js";
import type { GitHubIssue, GitHubRepoSignals } from "./github-cli.js";

const positiveLabelPatterns = [/bug/i, /regression/i, /good first issue/i, /help wanted/i];
const riskyLabelPatterns = [/duplicate/i, /wontfix/i, /invalid/i, /stale/i, /needs[- ]?info/i, /question/i];
const restrictiveLicenses = [/agpl/i, /gpl/i, /noassertion/i, /^none$/i, /^unknown$/i];

function includesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function clampScore(score: number): number {
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function guideHasAntiBotPolicy(text: string): boolean {
  return /no\s+(bots?|ai|automated)|human\s+only|do\s+not\s+use\s+(ai|llm)|no\s+llm/i.test(text);
}

function summarize(score: number, riskSignals: string[]): string {
  if (score >= 0.78 && riskSignals.length === 0) {
    return "high-quality candidate";
  }

  if (score >= 0.6) {
    return "usable candidate with review risks";
  }

  return "low-quality candidate";
}

export function qualifyGitHubIssue(
  issue: GitHubIssue,
  signals: GitHubRepoSignals
): CandidateQuality {
  const labelText = issue.labels.map((label) => label.name).join(" ");
  const issueText = `${issue.title}\n${issue.body ?? ""}`;
  const positiveSignals: string[] = [];
  const riskSignals: string[] = [];
  const safetySignals: string[] = [];
  let score = 0.45;

  if (includesAny(labelText, positiveLabelPatterns)) {
    positiveSignals.push("issue has maintainer-applied fix-friendly labels");
    score += 0.18;
  }

  if (/steps to reproduce|repro|reproduction|expected|actual|stack trace|traceback|failing test/i.test(issueText)) {
    positiveSignals.push("issue includes reproduction or failure details");
    score += 0.18;
  } else {
    riskSignals.push("issue lacks explicit reproduction details");
    score -= 0.12;
  }

  if (/crash|error|exception|fails?|bug|regression|incorrect|wrong/i.test(issueText)) {
    positiveSignals.push("issue describes concrete broken behavior");
    score += 0.12;
  } else {
    riskSignals.push("issue may be enhancement or discussion work");
    score -= 0.1;
  }

  if (includesAny(labelText, riskyLabelPatterns)) {
    riskSignals.push("issue has labels that usually require maintainer clarification");
    score -= 0.25;
  }

  if (signals.hasTests) {
    positiveSignals.push("repository exposes common test files or test directory");
    score += 0.08;
  } else {
    riskSignals.push("repository tests were not detected from metadata");
    score -= 0.08;
  }

  if (signals.contributionGuideFound) {
    safetySignals.push("contribution guide found");
    score += 0.04;
  } else {
    riskSignals.push("contribution guide was not found");
    score -= 0.04;
  }

  if (guideHasAntiBotPolicy(signals.contributionGuideText)) {
    safetySignals.push("contribution guide appears to restrict bot or AI contributions");
    score -= 0.35;
  }

  const licenseName = signals.licenseName;
  if (licenseName && !restrictiveLicenses.some((pattern) => pattern.test(licenseName))) {
    safetySignals.push(`license detected: ${licenseName}`);
    score += 0.04;
  } else {
    riskSignals.push("license is missing, unknown, or needs manual review");
    score -= 0.08;
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    summary: summarize(finalScore, riskSignals),
    positiveSignals,
    riskSignals,
    safetySignals
  };
}
