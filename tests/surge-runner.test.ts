import assert from "node:assert/strict";

import { runSurge, type SurgeRunnerDependencies } from "../src/surge/surge-runner.js";
import type { LivePatchResult } from "../src/live/patch-result-store.js";
import type { PrMemoryRecord } from "../src/memory/pr-memory-store.js";
import type { GhostpatchPreferences } from "../src/preferences/preferences-store.js";
import type { Opportunity } from "../src/types.js";
import type { SurgeRunState } from "../src/surge/types.js";

function basePreferences(): GhostpatchPreferences {
  return {
    agent: "codex",
    languages: ["typescript"],
    repoSourceMode: "manual",
    manualRepos: ["owner/project"],
    repoTestCommands: {},
    approvalMode: "always-ask",
    githubAuth: {
      envVar: "GH_TOKEN"
    },
    setupCompletedAt: "2026-05-05T00:00:00.000Z"
  };
}

function baseOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    slug: "owner-project-1",
    title: "Fix loader",
    summary: "Loader fails on empty input.",
    repoProfile: {
      repo: "owner/project",
      language: "typescript",
      repoActivityDays: 1,
      maintainerResponseDays: 1,
      hasTests: true,
      antiBotPolicy: false,
      contributionGuide: "Please add tests."
    },
    expectedBehavior: "Should load.",
    actualBehavior: "Throws.",
    reproductionSteps: ["Run tests"],
    validationCommand: "npm test",
    patchOutline: ["Fix loader"],
    suggestedFiles: ["src/index.ts"],
    diffRisk: 2,
    ambiguityRisk: 2,
    quality: {
      score: 0.9,
      summary: "high-quality candidate",
      positiveSignals: [],
      riskSignals: [],
      safetySignals: []
    },
    issueUrl: "https://github.com/owner/project/issues/1",
    ...overrides
  };
}

function baseResult(overrides: Partial<LivePatchResult> = {}): LivePatchResult {
  return {
    slug: "owner-project-1",
    repo: "owner/project",
    upstreamRepo: "owner/project",
    forkRepo: "octocat/project",
    repoDir: "/tmp/project",
    branch: "ghostpatch/owner-project-1",
    title: "Fix loader",
    body: "Fixes loader issue.",
    commandLog: [],
    reproductionLog: [],
    changedFiles: ["src/index.ts"],
    diffStat: "src/index.ts | 2 +-",
    diff: "diff --git a/src/index.ts b/src/index.ts\n+ok\n-nope",
    diffLineCount: 2,
    diffBudget: 20,
    testCommand: "npm test",
    testExitCode: 0,
    testOutput: "PASS",
    agentExitCode: 0,
    agentOutput: "done",
    reviewWarnings: [],
    createdAt: "2026-05-05T00:00:00.000Z",
    ...overrides
  };
}

function memoryRecord(): PrMemoryRecord {
  return {
    slug: "owner-project-1",
    repo: "owner/project",
    branch: "ghostpatch/owner-project-1",
    status: "draft",
    summary: {
      whatWasTried: [],
      currentBlockers: [],
      maintainerRequests: [],
      ciFailures: [],
      lastKnownStatus: "new",
      recommendedNextAction: ""
    },
    solveContext: {
      issueTitle: "Fix loader",
      issueUrl: "https://github.com/owner/project/issues/1",
      changedFiles: ["src/index.ts"],
      diffStat: "src/index.ts | 2 +-",
      validationCommand: "npm test",
      testExitCode: 0,
      testOutput: "PASS",
      agentOutput: "done"
    },
    events: [],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  };
}

function makeNow(sequence?: string[]): () => Date {
  let index = 0;
  return () => {
    const value = sequence?.[index] ?? sequence?.at(-1) ?? "2026-05-05T00:00:00.000Z";
    index += 1;
    return new Date(value);
  };
}

function baseDeps(overrides: Partial<SurgeRunnerDependencies> = {}): SurgeRunnerDependencies {
  const saves: SurgeRunState[] = [];
  return {
    now: makeNow([
      "2026-05-05T00:00:00.000Z",
      "2026-05-05T00:00:01.000Z",
      "2026-05-05T00:00:02.000Z",
      "2026-05-05T00:00:03.000Z",
      "2026-05-05T00:00:04.000Z",
      "2026-05-05T00:00:05.000Z",
      "2026-05-05T00:00:06.000Z",
      "2026-05-05T00:00:07.000Z",
      "2026-05-05T00:00:08.000Z",
      "2026-05-05T00:00:09.000Z"
    ]),
    log: () => {},
    loadPreferences: async () => basePreferences(),
    ensureGitHubAuth: async () => {},
    scan: async () => [baseOpportunity()],
    solve: async () => baseResult(),
    currentBranch: async () => "ghostpatch/owner-project-1",
    remoteBranchExists: async () => false,
    findDuplicatePullRequests: async () => [],
    commitAll: async () => {},
    pushBranch: async () => {},
    createPullRequest: async () => "https://github.com/owner/project/pull/1",
    parsePullRequestNumber: () => 1,
    loadMemoryBySlug: async () => memoryRecord(),
    saveMemory: async () => {},
    linkMemory: (memory, metadata) => ({
      ...memory,
      ...metadata
    }),
    saveRun: async (state) => {
      saves.push(JSON.parse(JSON.stringify(state)) as SurgeRunState);
    },
    loadRun: async () => saves.at(-1),
    ...overrides
  };
}

export async function testSurgePublishesAndStopsAtMaxPrs(): Promise<void> {
  const state = await runSurge({
    command: "surge",
    maxPrs: 1
  }, baseDeps());

  assert.equal(state.counters.prsCreated, 1);
  assert.equal(state.stopReason, "max-prs-reached");
  assert.equal(state.attempts[0]?.status, "published");
}

export async function testSurgeSkipsBlockedPatch(): Promise<void> {
  const state = await runSurge({
    command: "surge",
    maxRuntimeMinutes: 1
  }, baseDeps({
    solve: async () => baseResult({
      testExitCode: 1,
      testOutput: "FAIL"
    })
  }));

  assert.equal(state.counters.prsCreated, 0);
  assert.equal(state.attempts[0]?.status, "skipped");
  assert.match(state.attempts[0]?.blockers.join("\n") ?? "", /validation command exited with 1/);
  assert.equal(state.stopReason, "no-candidates");
}

export async function testSurgeStopsAtMaxFailures(): Promise<void> {
  const state = await runSurge({
    command: "surge",
    maxFailures: 1
  }, baseDeps({
    solve: async () => {
      throw new Error("agent crashed");
    }
  }));

  assert.equal(state.counters.failures, 1);
  assert.equal(state.attempts[0]?.status, "failed");
  assert.equal(state.stopReason, "max-failures-reached");
}

export async function testSurgeStopsAtRuntimeLimit(): Promise<void> {
  const state = await runSurge({
    command: "surge",
    maxRuntimeMinutes: 1
  }, baseDeps({
    now: makeNow([
      "2026-05-05T00:00:00.000Z",
      "2026-05-05T00:02:00.000Z",
      "2026-05-05T00:02:01.000Z"
    ])
  }));

  assert.equal(state.counters.solveAttempts, 0);
  assert.equal(state.stopReason, "max-runtime-reached");
}
