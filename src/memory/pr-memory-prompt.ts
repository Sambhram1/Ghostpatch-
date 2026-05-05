import type { PrMemoryRecord } from "./pr-memory-store.js";

export function buildPrMemoryResumePrompt(record: PrMemoryRecord): string {
  return [
    "Resume Ghostpatch follow-up work using the stored PR memory.",
    "",
    `Repo: ${record.repo}`,
    `Branch: ${record.branch}`,
    record.prUrl ? `PR: ${record.prUrl}` : "",
    `Issue: ${record.solveContext.issueTitle}`,
    record.solveContext.issueUrl ? `Issue URL: ${record.solveContext.issueUrl}` : "",
    "",
    "What was already tried:",
    ...record.summary.whatWasTried.map((item) => `- ${item}`),
    "",
    "Current blockers:",
    ...(record.summary.currentBlockers.length > 0
      ? record.summary.currentBlockers.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "Maintainer requests:",
    ...(record.summary.maintainerRequests.length > 0
      ? record.summary.maintainerRequests.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "CI failures:",
    ...(record.summary.ciFailures.length > 0
      ? record.summary.ciFailures.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    `Validation command: ${record.solveContext.validationCommand}`,
    `Recommended next action: ${record.summary.recommendedNextAction}`
  ].filter(Boolean).join("\n");
}
