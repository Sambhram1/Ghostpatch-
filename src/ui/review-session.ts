import { loadLatestReport } from "../reports/report-store.js";
import type { OpportunityRun } from "../types.js";
import {
  ansi,
  brand,
  color,
  divider,
  printKeyValue,
  promptChoice,
  typeLine
} from "./terminal.js";

type ReviewAction = "issue" | "solve" | "pr" | "skip" | "quit";

function confidence(run: OpportunityRun): string {
  const score = Math.round(run.triage.score * 100);
  const repro = run.repro?.confidence ? Math.round(run.repro.confidence * 100) : 0;
  return `${Math.max(score, repro)}%`;
}

function printDraft(run: OpportunityRun, type: "issue" | "pr"): void {
  if (type === "issue") {
    divider("issue draft");
    console.log(run.social.issueTitle ?? run.opportunity.title);
    console.log("");
    console.log(run.social.issueBody ?? "No issue draft was generated for this candidate.");
    return;
  }

  divider("pr draft");
  console.log(run.social.prTitle ?? run.patch?.patchTitle ?? run.opportunity.title);
  console.log("");
  console.log(run.social.prBody ?? "No PR draft was generated for this candidate.");
}

function printRun(run: OpportunityRun, index: number, total: number): void {
  divider(`candidate ${index + 1}/${total}`);
  printKeyValue("repo", run.opportunity.repoProfile.repo);
  printKeyValue("language", run.opportunity.repoProfile.language);
  printKeyValue("issue", run.opportunity.title);
  printKeyValue("recommendation", run.social.mode);
  printKeyValue("confidence", confidence(run));
  printKeyValue("agent", run.patch?.agentName ?? "none");
  printKeyValue("validation", run.repro?.validationCommand ?? "not run");
  console.log("");
  console.log(color(run.opportunity.summary, ansi.bold));
}

export async function runReviewSession(): Promise<void> {
  brand();
  const report = await loadLatestReport();
  if (!report) {
    console.log("No scan report found. Run ghostpatch scan first.");
    return;
  }

  await typeLine("Review findings one by one. Ghostpatch will not publish anything here.");

  for (let index = 0; index < report.runs.length; index += 1) {
    const run = report.runs[index];
    printRun(run, index, report.runs.length);

    const action = await promptChoice<ReviewAction>("Choose an action", [
      { label: "Show issue draft", value: "issue" },
      { label: "Ask agent to solve next", value: "solve" },
      { label: "Show direct PR draft", value: "pr" },
      { label: "Skip", value: "skip" },
      { label: "Quit review", value: "quit" }
    ]);

    if (action === "quit") {
      console.log(color("Review stopped.", ansi.yellow));
      return;
    }

    if (action === "issue") {
      printDraft(run, "issue");
    } else if (action === "pr") {
      printDraft(run, "pr");
    } else if (action === "solve") {
      divider("solve");
      console.log("Ghostpatch would now hand this candidate to the configured coding agent.");
      console.log("Live repo mutation and GitHub publication are still intentionally gated.");
    } else {
      console.log(color("Skipped.", ansi.gray));
    }
  }

  divider("done");
  console.log("No more candidates in the latest report.");
}
