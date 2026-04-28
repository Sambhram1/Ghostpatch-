import type { OpportunityRun, RunReport } from "../types.js";

function renderRun(run: OpportunityRun): string {
  const lines = [
    `Repo: ${run.opportunity.repoProfile.repo}`,
    `Language: ${run.opportunity.repoProfile.language}`,
    `Opportunity: ${run.opportunity.title}`,
    `Decision: ${run.social.mode}`,
    `Triage score: ${run.triage.score}`,
    `Reason codes: ${run.triage.reasonCodes.join(", ")}`
  ];

  if (run.repro) {
    lines.push(`Repro confirmed: ${run.repro.confirmed}`);
    lines.push(`Validation command: ${run.repro.validationCommand}`);
  }

  if (run.review) {
    lines.push(`AI smell score: ${run.review.aiSmellScore}`);
  }

  if (run.patch?.agentName) {
    lines.push(`Patch agent: ${run.patch.agentName} (${run.patch.agentMode})`);
  }

  if (typeof run.patch?.agentExitCode === "number") {
    lines.push(`Agent exit code: ${run.patch.agentExitCode}`);
  }

  if (run.patch?.agentOutput) {
    lines.push("Agent dry-run output:");
    lines.push(run.patch.agentOutput);
  }

  if (run.social.issueTitle) {
    lines.push(`Issue title: ${run.social.issueTitle}`);
  }

  if (run.social.prTitle) {
    lines.push(`PR title: ${run.social.prTitle}`);
  }

  return lines.join("\n");
}

export function renderReport(report: RunReport): string {
  const header = [
    "Ghostpatch Dry Run Report",
    `Generated: ${report.generatedAt}`,
    `Agent: ${report.agentName}`,
    `Fixture count: ${report.totalCandidates}`,
    ""
  ].join("\n");

  const body = report.runs.map(renderRun).join("\n\n---\n\n");
  return `${header}${body}`;
}
