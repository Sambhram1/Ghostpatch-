import {
  getReportId,
  listStoredReports,
  loadLatestReport,
  loadReportById
} from "../reports/report-store.js";
import {
  loadReviewState,
  rejectCandidate,
  saveReviewState,
  type ReviewState
} from "../reports/review-state-store.js";
import type { OpportunityRun, RunReport } from "../types.js";
import {
  createIssue,
  createPullRequest,
  findPotentialDuplicateIssues,
  findPotentialDuplicatePullRequests,
  parsePullRequestNumber,
  type GitHubSearchMatch
} from "../github/github-cli.js";
import { requireConfiguredGitHubAuth } from "../github/github-auth.js";
import {
  buildPrMemoryResumePrompt
} from "../memory/pr-memory-prompt.js";
import {
  refreshPrMemoryFromGitHub
} from "../memory/pr-memory-refresh.js";
import {
  linkPrMemory,
  loadPrMemoryBySlug,
  savePrMemory
} from "../memory/pr-memory-store.js";
import { loadPatchResult, type LivePatchResult } from "../live/patch-result-store.js";
import { reviewPatchSafety } from "../live/safety.js";
import { solveOpportunity, solveOpportunityFromMemory } from "../live/solver.js";
import { loadPreferences } from "../preferences/preferences-store.js";
import { evaluatePatchPublishBlockers } from "../surge/surge-gate.js";
import {
  commitAll,
  currentBranch,
  pushBranch,
  remoteBranchExists
} from "../workspace/workspace-manager.js";
import {
  ansi,
  brand,
  color,
  divider,
  printKeyValue,
  promptChoice,
  promptConfirm,
  promptText,
  spinner,
  typeLine
} from "./terminal.js";

type ReviewAction = "issue" | "publish-issue" | "solve" | "resume-memory" | "pr" | "publish-pr" | "reject" | "skip" | "quit";

async function ensurePublishGitHubAuth(
  envVar: "GH_TOKEN" | "GITHUB_TOKEN"
): Promise<void> {
  try {
    await requireConfiguredGitHubAuth({
      githubAuth: {
        envVar
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message} Set ${envVar} before live GitHub actions.`);
  }
}

export function patchPublishBlockers(result: LivePatchResult): string[] {
  return evaluatePatchPublishBlockers(result);
}

export function renderForkStatus(forkRepo: string, upstreamRepo: string): string {
  return `origin=${forkRepo}, upstream=${upstreamRepo}`;
}

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

function printList(label: string, values: string[]): void {
  printKeyValue(label, values.length > 0 ? values.join(", ") : "none");
}

function printMatches(label: string, matches: GitHubSearchMatch[]): void {
  divider(label);
  if (matches.length === 0) {
    console.log("No open duplicates found.");
    return;
  }

  for (const match of matches) {
    console.log(`#${match.number} ${match.title}`);
    console.log(match.url);
  }
}

function issueBody(run: OpportunityRun): string {
  return run.social.issueBody ?? [
    run.opportunity.summary,
    "",
    run.opportunity.issueUrl ? `Related issue: ${run.opportunity.issueUrl}` : "",
    `Expected: ${run.opportunity.expectedBehavior}`,
    `Actual: ${run.opportunity.actualBehavior}`
  ].filter(Boolean).join("\n");
}

function prBody(run: OpportunityRun, result?: LivePatchResult): string {
  return result?.body ?? run.social.prBody ?? "No PR draft was generated for this candidate.";
}

async function editDraft(title: string, body: string): Promise<{ title: string; body: string }> {
  const editedTitle = await promptText("Title to publish", title);
  console.log("");
  console.log(body);
  console.log("");
  const replaceBody = await promptConfirm("Replace body with a one-line override?", false);
  const editedBody = replaceBody ? await promptText("Replacement body") : body;
  return {
    title: editedTitle,
    body: editedBody
  };
}

function printRun(run: OpportunityRun, index: number, total: number): void {
  divider(`candidate ${index + 1}/${total}`);
  printKeyValue("repo", run.opportunity.repoProfile.repo);
  printKeyValue("language", run.opportunity.repoProfile.language);
  printKeyValue("issue", run.opportunity.title);
  printKeyValue("quality", run.opportunity.quality
    ? `${run.opportunity.quality.score} (${run.opportunity.quality.summary})`
    : "not scored");
  printKeyValue("recommendation", run.social.mode);
  printKeyValue("confidence", confidence(run));
  printKeyValue("agent", run.patch?.agentName ?? "none");
  printKeyValue("validation", run.repro?.validationCommand ?? "not run");
  printKeyValue("why this candidate", run.opportunity.quality?.positiveSignals.join("; ") || run.triage.reasonCodes.join(", "));
  printList("quality risks", run.opportunity.quality?.riskSignals ?? []);
  printList("safety signals", run.opportunity.quality?.safetySignals ?? []);
  printList("risk remains", run.review?.warnings ?? []);
  console.log("");
  console.log(color(run.opportunity.summary, ansi.bold));
}

function printCandidateComparison(runs: OpportunityRun[]): void {
  divider("candidate quality comparison");
  const sorted = [...runs].sort((left, right) =>
    (right.opportunity.quality?.score ?? 0) - (left.opportunity.quality?.score ?? 0)
  );
  sorted.slice(0, 8).forEach((run, index) => {
    const score = run.opportunity.quality?.score ?? 0;
    console.log(`${index + 1}. ${score.toFixed(2)} ${run.opportunity.repoProfile.repo} #${run.opportunity.issueNumber ?? "fixture"} ${run.opportunity.title}`);
  });
}

function printSolvePreview(run: OpportunityRun): void {
  divider("commands to run");
  console.log(`gh repo fork ${run.opportunity.repoProfile.repo} --remote=false`);
  console.log(`gh repo clone <your-fork-of-${run.opportunity.repoProfile.repo}> <ghostpatch workspace>`);
  console.log(`git checkout -B ghostpatch/${run.opportunity.slug}`);
  console.log("configured agent in workspace-write mode");
  console.log(run.opportunity.validationCommand);
}

function printPatchSummary(result: LivePatchResult): void {
  const safety = reviewPatchSafety(result, result.diffBudget);
  divider("patch summary");
  printKeyValue("workspace", result.repoDir);
  if (result.forkRepo && result.upstreamRepo) {
    printKeyValue("remotes", renderForkStatus(result.forkRepo, result.upstreamRepo));
  }
  printKeyValue("branch", result.branch);
  printList("changed files", result.changedFiles);
  printKeyValue("diff lines", `${safety.diffLineCount}/${result.diffBudget}`);
  printKeyValue("agent exit", String(result.agentExitCode));
  printKeyValue("test command", result.testCommand);
  printKeyValue("test exit", String(result.testExitCode));
  printList("blockers", safety.blockers);
  printList("warnings", [...result.reviewWarnings, ...safety.warnings]);
  printList("risk remains", safety.riskRemaining);
  divider("diff stat");
  console.log(result.diffStat);
}

async function branchPublishBlockers(result: LivePatchResult): Promise<string[]> {
  const blockers: string[] = [];
  const branch = await currentBranch(result.repoDir);
  if (branch !== result.branch) {
    blockers.push(`workspace is on branch ${branch || "(detached)"}, expected ${result.branch}`);
  }

  if (await remoteBranchExists(result.repoDir, result.branch)) {
    blockers.push(`remote branch ${result.branch} already exists`);
  }

  return blockers;
}

async function chooseReport(): Promise<{ report: RunReport; reportId: string } | undefined> {
  const latest = await loadLatestReport();
  const stored = await listStoredReports();
  if (!latest) {
    console.log("No scan report found. Run ghostpatch scan first.");
    return undefined;
  }

  if (stored.length <= 1) {
    return { report: latest, reportId: getReportId(latest) };
  }

  const choices = [
    { label: `Latest (${latest.generatedAt})`, value: "latest" },
    ...stored.map((report) => ({
      label: `${report.generatedAt} - ${report.totalCandidates} candidates`,
      value: report.id
    }))
  ];
  const selected = await promptChoice("Choose scan report", choices);
  if (selected === "latest") {
    return { report: latest, reportId: getReportId(latest) };
  }

  const report = await loadReportById(selected);
  return report ? { report, reportId: selected } : { report: latest, reportId: getReportId(latest) };
}

function printRejected(state: ReviewState): void {
  if (state.rejected.length === 0) {
    return;
  }

  divider("rejected candidates");
  for (const rejected of state.rejected) {
    console.log(`${rejected.slug}: ${rejected.reason}`);
  }
}

export async function runReviewSession(): Promise<void> {
  brand();
  const selected = await chooseReport();
  if (!selected) {
    return;
  }
  const { report, reportId } = selected;
  let state = await loadReviewState(reportId);

  const preferences = await loadPreferences();
  const publishingEnabled = preferences.approvalMode !== "draft-only";
  await typeLine("Review findings one by one.");
  await typeLine(publishingEnabled
    ? "Publishing actions still require explicit confirmation."
    : "Draft-only mode is enabled, so issue and PR publishing are disabled.");
  printCandidateComparison(report.runs);
  printRejected(state);

  if (state.cursor > 0 && state.cursor < report.runs.length) {
    const resume = await promptConfirm(`Resume at candidate ${state.cursor + 1}/${report.runs.length}?`, true);
    if (!resume) {
      state = { ...state, cursor: 0 };
      await saveReviewState(state);
    }
  }

  for (let index = state.cursor; index < report.runs.length; index += 1) {
    const run = report.runs[index];
    if (state.rejected.some((item) => item.slug === run.opportunity.slug)) {
      continue;
    }
    printRun(run, index, report.runs.length);

    const action = await promptChoice<ReviewAction>("Choose an action", [
      { label: "Show issue draft", value: "issue" },
      { label: "Publish issue with gh", value: "publish-issue" },
      { label: "Ask agent to solve next", value: "solve" },
      { label: "Resume From PR memory", value: "resume-memory" },
      { label: "Show direct PR draft", value: "pr" },
      { label: "Publish PR from solved patch", value: "publish-pr" },
      { label: "Reject with reason", value: "reject" },
      { label: "Skip", value: "skip" },
      { label: "Quit review", value: "quit" }
    ]);

    if (action === "quit") {
      await saveReviewState({ ...state, cursor: index });
      console.log(color("Review stopped.", ansi.yellow));
      return;
    }

    if (action === "issue") {
      printDraft(run, "issue");
    } else if (action === "publish-issue") {
      if (!publishingEnabled) {
        console.log(color("Draft-only mode is enabled. Issue creation skipped.", ansi.yellow));
        continue;
      }

      await spinner("Checking GitHub token", async () =>
        ensurePublishGitHubAuth(preferences.githubAuth.envVar)
      );

      const duplicateIssues = await spinner("Checking for duplicate open issues", async () =>
        findPotentialDuplicateIssues(
          run.opportunity.repoProfile.repo,
          run.social.issueTitle ?? run.opportunity.title
        )
      );
      if (duplicateIssues.length > 0) {
        printMatches("possible duplicate issues", duplicateIssues);
        console.log(color("Issue creation blocked until duplicates are reviewed manually.", ansi.yellow));
        continue;
      }

      const draft = await editDraft(
        run.social.issueTitle ?? run.opportunity.title,
        issueBody(run)
      );
      divider("what will be posted");
      console.log(draft.title);
      console.log("");
      console.log(draft.body);

      const confirmed = await promptConfirm("Create this GitHub issue now?", false);
      if (!confirmed) {
        console.log(color("Issue creation cancelled.", ansi.yellow));
        continue;
      }

      const url = await spinner("Creating GitHub issue", async () =>
        createIssue(
          run.opportunity.repoProfile.repo,
          draft.title,
          draft.body
        )
      );
      console.log(url);
    } else if (action === "pr") {
      printDraft(run, "pr");
    } else if (action === "solve") {
      divider("solve");
      const confirmed = await promptConfirm("Clone the repo and ask the configured agent to solve locally?", false);
      if (!confirmed) {
        console.log(color("Solve cancelled.", ansi.yellow));
        continue;
      }

      printSolvePreview(run);
      const result = await spinner("Solving in Ghostpatch workspace", async () =>
        solveOpportunity(run.opportunity)
      );
      printPatchSummary(result);
    } else if (action === "resume-memory") {
      const memory = await spinner("Loading PR memory", async () =>
        loadPrMemoryBySlug(run.opportunity.slug)
      );
      if (!memory) {
        console.log(color("No PR memory found for this candidate. Solve it first to create memory.", ansi.yellow));
        continue;
      }

      let currentMemory = memory;
      if (memory.prNumber) {
        await spinner("Checking GitHub token", async () =>
          ensurePublishGitHubAuth(preferences.githubAuth.envVar)
        );
        currentMemory = await spinner("Refreshing PR follow-up memory", async () =>
          refreshPrMemoryFromGitHub(memory)
        );
        await spinner("Saving refreshed PR memory", async () =>
          savePrMemory(currentMemory)
        );
      }

      divider("pr memory");
      const resumePrompt = buildPrMemoryResumePrompt(currentMemory);
      console.log(resumePrompt);
      const confirmed = await promptConfirm("Use this memory to resume solve now?", false);
      if (!confirmed) {
        console.log(color("Resume solve cancelled.", ansi.yellow));
        continue;
      }

      const result = await spinner("Resuming solve from PR memory", async () =>
        solveOpportunityFromMemory(run.opportunity, resumePrompt)
      );
      printPatchSummary(result);
    } else if (action === "publish-pr") {
      if (!publishingEnabled) {
        console.log(color("Draft-only mode is enabled. PR creation skipped.", ansi.yellow));
        continue;
      }

      await spinner("Checking GitHub token", async () =>
        ensurePublishGitHubAuth(preferences.githubAuth.envVar)
      );

      const result = await loadPatchResult(run.opportunity.slug);
      if (!result) {
        console.log(color("No solved patch found. Choose 'Ask agent to solve next' first.", ansi.yellow));
        continue;
      }

      printPatchSummary(result);
      const blockers = [
        ...patchPublishBlockers(result),
        ...await spinner("Checking branch hygiene", async () => branchPublishBlockers(result))
      ];
      if (blockers.length > 0) {
        console.log(color(`PR publication blocked: ${blockers.join("; ")}.`, ansi.yellow));
        continue;
      }

      const duplicatePrs = await spinner("Checking for duplicate open PRs", async () =>
        findPotentialDuplicatePullRequests(
          result.upstreamRepo ?? result.repo,
          result.title,
          result.branch
        )
      );
      if (duplicatePrs.length > 0) {
        printMatches("possible duplicate PRs", duplicatePrs);
        console.log(color("PR creation blocked until duplicates are reviewed manually.", ansi.yellow));
        continue;
      }

      const draft = await editDraft(result.title, prBody(run, result));
      divider("what will be posted");
      console.log(draft.title);
      console.log("");
      console.log(draft.body);

      const confirmed = await promptConfirm("Commit, push, and create this GitHub PR now?", false);
      if (!confirmed) {
        console.log(color("PR creation cancelled.", ansi.yellow));
        continue;
      }

      await spinner("Committing patch", async () =>
        commitAll(result.repoDir, draft.title)
      );
      await spinner("Pushing branch", async () =>
        pushBranch(result.repoDir, result.branch)
      );
      const prUrl = await spinner("Creating GitHub PR", async () =>
        createPullRequest(result.repoDir, result.upstreamRepo ?? result.repo, draft.title, draft.body)
      );
      const prNumber = parsePullRequestNumber(prUrl);
      if (prNumber) {
        const memory = await loadPrMemoryBySlug(result.slug);
        if (memory) {
          await savePrMemory(linkPrMemory(memory, {
            prNumber,
            prUrl
          }));
        }
      }
      console.log(prUrl);
    } else if (action === "reject") {
      const reason = await promptText("Reject reason", "not worth pursuing");
      state = await rejectCandidate(state, run.opportunity.slug, reason);
      console.log(color("Candidate rejected.", ansi.yellow));
    } else {
      console.log(color("Skipped.", ansi.gray));
    }

    state = {
      ...state,
      cursor: index + 1
    };
    await saveReviewState(state);
  }

  divider("done");
  console.log("No more candidates in the latest report.");
}
