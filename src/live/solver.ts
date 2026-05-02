import { listAgentConnections } from "../agents/agent-config.js";
import { invokeAgentCommand, quoteForShell } from "../agents/invoke-agent.js";
import { createSocialArtifact } from "../pipeline/social.js";
import { triage } from "../pipeline/triage.js";
import { repro } from "../pipeline/repro.js";
import { reviewArtifacts } from "../pipeline/review.js";
import { planPatch } from "../pipeline/patch.js";
import { defaultConfig } from "../config.js";
import { runCommand } from "../process/command.js";
import { loadPreferences } from "../preferences/preferences-store.js";
import type { Opportunity } from "../types.js";
import {
  changedFiles,
  cloneOrUpdateRepo,
  createBranch,
  diffStat,
  ensureCleanWorkspace,
  fullDiff
} from "../workspace/workspace-manager.js";
import { savePatchResult, type LivePatchResult } from "./patch-result-store.js";
import { countDiffLines } from "./safety.js";

function branchName(slug: string): string {
  return `ghostpatch/${slug}`.slice(0, 80);
}

function solvePrompt(opportunity: Opportunity): string {
  return [
    "You are running inside Ghostpatch live solve mode.",
    "Edit files only in this cloned repository.",
    "Make the smallest fix for the GitHub issue.",
    "Do not create branches, commit, push, open issues, or open pull requests.",
    "",
    `Repo: ${opportunity.repoProfile.repo}`,
    `Issue: ${opportunity.title}`,
    opportunity.issueUrl ? `Issue URL: ${opportunity.issueUrl}` : "",
    `Expected: ${opportunity.expectedBehavior}`,
    `Actual: ${opportunity.actualBehavior}`,
    `Validation command: ${opportunity.validationCommand}`,
    "",
    "After editing, summarize what changed and what tests should run."
  ].filter(Boolean).join("\n");
}

async function agentCommand(opportunity: Opportunity, repoDir: string): Promise<{ command: string; args: string[]; shell: boolean }> {
  const preferences = await loadPreferences();
  const connections = await listAgentConnections();
  const connection = connections.find((item) => item.agent === preferences.agent);
  const prompt = solvePrompt(opportunity);

  if (preferences.agent === "codex") {
    const command = connection?.command ?? "codex";
    return {
      command: [
        command,
        "exec",
        "--sandbox",
        "workspace-write",
        "--cd",
        repoDir,
        prompt
      ].map(quoteForShell).join(" "),
      args: [],
      shell: true
    };
  }

  if (preferences.agent === "claude") {
    const command = connection?.command ?? "claude";
    return {
      command: [
        command,
        "-p",
        "--permission-mode",
        "acceptEdits",
        "--add-dir",
        repoDir,
        prompt
      ].map(quoteForShell).join(" "),
      args: [],
      shell: true
    };
  }

  return {
    command: "node",
    args: ["--version"],
    shell: false
  };
}

function commandPreview(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

export async function solveOpportunity(opportunity: Opportunity): Promise<LivePatchResult> {
  const repoDir = await cloneOrUpdateRepo(opportunity.repoProfile.repo);
  await ensureCleanWorkspace(repoDir);
  const branch = branchName(opportunity.slug);
  await createBranch(repoDir, branch);

  const command = await agentCommand(opportunity, repoDir);
  const agent = await invokeAgentCommand(command, 240000);
  const files = await changedFiles(repoDir);
  const stat = await diffStat(repoDir);
  const diff = await fullDiff(repoDir);

  const [testExecutable, testArgs] = testCommand(opportunity);
  const test = files.length > 0
    ? await runCommand(testExecutable, testArgs, { cwd: repoDir, timeoutMs: 180000 })
    : { exitCode: 1, stdout: "", stderr: "No changed files produced by agent." };

  const triageResult = triage(opportunity, defaultConfig);
  const reproResult = repro(opportunity);
  const patch = {
    ...planPatch(opportunity, reproResult, defaultConfig),
    agentName: (await loadPreferences()).agent,
    agentMode: "external-dry-run" as const,
    agentExitCode: agent.exitCode,
    agentOutput: [agent.stdout, agent.stderr].filter(Boolean).join("\n")
  };
  const review = reviewArtifacts(opportunity, patch);
  const social = createSocialArtifact(opportunity, triageResult, reproResult, patch, review);
  const agentPreview = command.shell
    ? command.command
    : commandPreview(command.command, command.args);
  const testPreview = commandPreview(testExecutable, testArgs);

  const result: LivePatchResult = {
    slug: opportunity.slug,
    repo: opportunity.repoProfile.repo,
    repoDir,
    branch,
    title: social.prTitle ?? patch.patchTitle,
    body: social.prBody ?? `Fixes ${opportunity.issueUrl ?? opportunity.title}`,
    commandLog: [
      `clone/update: gh repo clone ${opportunity.repoProfile.repo} ${repoDir}`,
      `branch: git checkout -B ${branch}`,
      `agent: ${agentPreview}`,
      `validation: ${testPreview}`
    ],
    reproductionLog: [
      ...reproResult.evidence,
      `validation command: ${testPreview}`,
      `validation exit: ${test.exitCode}`
    ],
    changedFiles: files,
    diffStat: stat,
    diff,
    diffLineCount: countDiffLines(diff),
    diffBudget: patch.diffBudget,
    testCommand: testPreview,
    testExitCode: test.exitCode,
    testOutput: [test.stdout, test.stderr].filter(Boolean).join("\n"),
    agentExitCode: agent.exitCode,
    agentOutput: [agent.stdout, agent.stderr].filter(Boolean).join("\n"),
    reviewWarnings: review.warnings,
    createdAt: new Date().toISOString()
  };

  await savePatchResult(result);
  return result;
}

function testCommand(opportunity: Opportunity): [string, string[]] {
  const [command, ...args] = opportunity.validationCommand.split(/\s+/).filter(Boolean);
  return [command || "npm", args.length > 0 ? args : ["test"]];
}
