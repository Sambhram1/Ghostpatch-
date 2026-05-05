import type { SurgeOptions } from "../cli.js";
import {
  createPullRequest,
  findPotentialDuplicatePullRequests,
  parsePullRequestNumber
} from "../github/github-cli.js";
import { requireConfiguredGitHubAuth } from "../github/github-auth.js";
import { scanGitHubIssues } from "../github/live-scan.js";
import type { LiveScanOptions } from "../github/live-scan.js";
import { solveOpportunity } from "../live/solver.js";
import { loadPreferences, type GhostpatchPreferences } from "../preferences/preferences-store.js";
import type { Opportunity } from "../types.js";
import {
  commitAll,
  currentBranch,
  pushBranch,
  remoteBranchExists
} from "../workspace/workspace-manager.js";
import {
  linkPrMemory,
  loadPrMemoryBySlug,
  savePrMemory,
  type PrMemoryRecord
} from "../memory/pr-memory-store.js";
import type { GitHubSearchMatch } from "../github/github-cli.js";
import type { LivePatchResult } from "../live/patch-result-store.js";
import { evaluateSurgeGate } from "./surge-gate.js";
import { loadSurgeRun, saveSurgeRun } from "./surge-store.js";
import {
  defaultSurgeLimits,
  type SurgeAttemptRecord,
  type SurgeCounters,
  type SurgeLimits,
  type SurgeRunState,
  type SurgeStopReason
} from "./types.js";

export interface SurgeRunnerDependencies {
  now: () => Date;
  log: (message: string) => void;
  loadPreferences: () => Promise<GhostpatchPreferences>;
  ensureGitHubAuth: (preferences: GhostpatchPreferences) => Promise<void>;
  scan: (options: LiveScanOptions) => Promise<Opportunity[]>;
  solve: (opportunity: Opportunity) => Promise<LivePatchResult>;
  currentBranch: (repoDir: string) => Promise<string>;
  remoteBranchExists: (repoDir: string, branch: string) => Promise<boolean>;
  findDuplicatePullRequests: (
    repo: string,
    title: string,
    branch: string
  ) => Promise<GitHubSearchMatch[]>;
  commitAll: (repoDir: string, message: string) => Promise<void>;
  pushBranch: (repoDir: string, branch: string) => Promise<void>;
  createPullRequest: (
    repoDir: string,
    upstreamRepo: string,
    title: string,
    body: string
  ) => Promise<string>;
  parsePullRequestNumber: (prUrl: string) => number | undefined;
  loadMemoryBySlug: (slug: string) => Promise<PrMemoryRecord | undefined>;
  saveMemory: (record: PrMemoryRecord) => Promise<void>;
  linkMemory: typeof linkPrMemory;
  saveRun: (state: SurgeRunState) => Promise<void>;
  loadRun: (runId: string) => Promise<SurgeRunState | undefined>;
}

const defaultDeps: SurgeRunnerDependencies = {
  now: () => new Date(),
  log: (message) => console.log(message),
  loadPreferences,
  ensureGitHubAuth: async (preferences) => {
    await requireConfiguredGitHubAuth(preferences);
  },
  scan: scanGitHubIssues,
  solve: solveOpportunity,
  currentBranch,
  remoteBranchExists,
  findDuplicatePullRequests: findPotentialDuplicatePullRequests,
  commitAll,
  pushBranch,
  createPullRequest,
  parsePullRequestNumber,
  loadMemoryBySlug: loadPrMemoryBySlug,
  saveMemory: savePrMemory,
  linkMemory: linkPrMemory,
  saveRun: saveSurgeRun,
  loadRun: loadSurgeRun
};

function resolveLimits(options: SurgeOptions): SurgeLimits {
  return {
    maxPrs: options.maxPrs ?? defaultSurgeLimits.maxPrs,
    maxRuntimeMinutes: options.maxRuntimeMinutes ?? defaultSurgeLimits.maxRuntimeMinutes,
    maxFailures: options.maxFailures ?? defaultSurgeLimits.maxFailures,
    repoLimit: options.repoLimit ?? defaultSurgeLimits.repoLimit,
    minQualityScore: defaultSurgeLimits.minQualityScore
  };
}

function initialCounters(): SurgeCounters {
  return {
    reposScanned: 0,
    candidatesConsidered: 0,
    solveAttempts: 0,
    prsCreated: 0,
    failures: 0
  };
}

function createRunState(now: Date, limits: SurgeLimits): SurgeRunState {
  const timestamp = now.toISOString();
  const compact = timestamp.replace(/[-:.TZ]/g, "").slice(0, 14);
  return {
    runId: `surge-${compact}`,
    startedAt: timestamp,
    updatedAt: timestamp,
    status: "running",
    limits,
    counters: initialCounters(),
    attempts: []
  };
}

function elapsedMinutes(startedAt: string, now: Date): number {
  return (now.getTime() - Date.parse(startedAt)) / 60000;
}

function uniqueRepoCount(opportunities: Opportunity[]): number {
  return new Set(opportunities.map((opportunity) => opportunity.repoProfile.repo)).size;
}

function buildScanOptions(preferences: GhostpatchPreferences, repoLimit: number): LiveScanOptions {
  const repos = preferences.repoSourceMode === "auto" ? [] : preferences.manualRepos;
  const autoSearch = preferences.repoSourceMode === "auto" || preferences.repoSourceMode === "both";

  return {
    repos,
    languages: preferences.languages,
    autoSearch,
    githubEnvVar: preferences.githubAuth.envVar,
    repoLimit
  };
}

async function branchPublishBlockers(
  deps: SurgeRunnerDependencies,
  result: LivePatchResult
): Promise<string[]> {
  const blockers: string[] = [];
  const branch = await deps.currentBranch(result.repoDir);
  if (branch !== result.branch) {
    blockers.push(`workspace is on branch ${branch || "(detached)"}, expected ${result.branch}`);
  }

  if (await deps.remoteBranchExists(result.repoDir, result.branch)) {
    blockers.push(`remote branch ${result.branch} already exists`);
  }

  return blockers;
}

function chooseNextCandidate(
  opportunities: Opportunity[],
  attempts: SurgeAttemptRecord[]
): Opportunity | undefined {
  const attempted = new Set(attempts.map((attempt) => attempt.slug));
  return opportunities.find((opportunity) => !attempted.has(opportunity.slug));
}

function updateState(state: SurgeRunState, now: Date): void {
  state.updatedAt = now.toISOString();
}

function finishState(state: SurgeRunState, status: "completed" | "failed", stopReason: SurgeStopReason, now: Date): void {
  state.status = status;
  state.stopReason = stopReason;
  updateState(state, now);
}

function attemptRecord(
  opportunity: Opportunity,
  startedAt: string,
  completedAt: string,
  status: SurgeAttemptRecord["status"],
  blockers: string[] = [],
  warnings: string[] = [],
  extras: Partial<SurgeAttemptRecord> = {}
): SurgeAttemptRecord {
  return {
    slug: opportunity.slug,
    repo: opportunity.repoProfile.repo,
    title: opportunity.title,
    startedAt,
    completedAt,
    status,
    blockers,
    warnings,
    ...extras
  };
}

async function linkPublishedPrMemory(
  deps: SurgeRunnerDependencies,
  result: LivePatchResult,
  prUrl: string
): Promise<void> {
  const prNumber = deps.parsePullRequestNumber(prUrl);
  if (!prNumber) {
    return;
  }

  const memory = await deps.loadMemoryBySlug(result.slug);
  if (!memory) {
    return;
  }

  await deps.saveMemory(deps.linkMemory(memory, {
    prNumber,
    prUrl
  }));
}

export async function runSurge(
  options: SurgeOptions,
  deps: SurgeRunnerDependencies = defaultDeps
): Promise<SurgeRunState> {
  const limits = resolveLimits(options);
  const state = createRunState(deps.now(), limits);
  await deps.saveRun(state);

  deps.log("Starting Ghostpatch Surge.");
  deps.log("Mode: autonomous continuous publish");
  deps.log(`Limits: max-prs=${limits.maxPrs} max-runtime-minutes=${limits.maxRuntimeMinutes} max-failures=${limits.maxFailures} repo-limit=${limits.repoLimit}`);

  const preferences = await deps.loadPreferences();
  try {
    await deps.ensureGitHubAuth(preferences);
  } catch (error) {
    finishState(state, "failed", "auth-failed", deps.now());
    await deps.saveRun(state);
    throw error;
  }

  while (true) {
    const now = deps.now();
    if (state.counters.prsCreated >= limits.maxPrs) {
      finishState(state, "completed", "max-prs-reached", now);
      break;
    }

    if (state.counters.failures >= limits.maxFailures) {
      finishState(state, "failed", "max-failures-reached", now);
      break;
    }

    if (elapsedMinutes(state.startedAt, now) >= limits.maxRuntimeMinutes) {
      finishState(state, "completed", "max-runtime-reached", now);
      break;
    }

    let opportunities: Opportunity[];
    try {
      opportunities = await deps.scan(buildScanOptions(preferences, limits.repoLimit));
    } catch (error) {
      finishState(state, "failed", "scan-failed", deps.now());
      await deps.saveRun(state);
      throw error;
    }

    state.counters.reposScanned += uniqueRepoCount(opportunities);
    state.counters.candidatesConsidered += opportunities.length;
    updateState(state, deps.now());
    await deps.saveRun(state);

    const next = chooseNextCandidate(opportunities, state.attempts);
    if (!next) {
      finishState(state, "completed", "no-candidates", deps.now());
      break;
    }

    deps.log(`Attempting ${next.repoProfile.repo} - ${next.title}`);
    state.counters.solveAttempts += 1;
    const startedAt = deps.now().toISOString();

    try {
      const result = await deps.solve(next);
      const gate = evaluateSurgeGate(next, result, {
        minQualityScore: limits.minQualityScore
      });
      const branchBlockers = await branchPublishBlockers(deps, result);
      const blockers = [...gate.blockers, ...branchBlockers];

      if (blockers.length > 0) {
        deps.log(`Skipped ${next.slug}: ${blockers.join("; ")}`);
        state.attempts.push(attemptRecord(
          next,
          startedAt,
          deps.now().toISOString(),
          "skipped",
          blockers,
          gate.warnings,
          { branch: result.branch }
        ));
        updateState(state, deps.now());
        await deps.saveRun(state);
        continue;
      }

      const duplicatePrs = await deps.findDuplicatePullRequests(
        result.upstreamRepo ?? result.repo,
        result.title,
        result.branch
      );
      if (duplicatePrs.length > 0) {
        const duplicateBlocker = `possible duplicate PRs already exist for ${result.branch}`;
        deps.log(`Skipped ${next.slug}: ${duplicateBlocker}`);
        state.attempts.push(attemptRecord(
          next,
          startedAt,
          deps.now().toISOString(),
          "skipped",
          [duplicateBlocker],
          gate.warnings,
          { branch: result.branch }
        ));
        updateState(state, deps.now());
        await deps.saveRun(state);
        continue;
      }

      await deps.commitAll(result.repoDir, result.title);
      await deps.pushBranch(result.repoDir, result.branch);
      const prUrl = await deps.createPullRequest(
        result.repoDir,
        result.upstreamRepo ?? result.repo,
        result.title,
        result.body
      );
      await linkPublishedPrMemory(deps, result, prUrl);
      state.counters.prsCreated += 1;
      deps.log(`Published ${prUrl}`);
      state.attempts.push(attemptRecord(
        next,
        startedAt,
        deps.now().toISOString(),
        "published",
        [],
        gate.warnings,
        {
          branch: result.branch,
          prUrl
        }
      ));
    } catch (error) {
      state.counters.failures += 1;
      const failure = error instanceof Error ? error.message : String(error);
      deps.log(`Failed ${next.slug}: ${failure}`);
      state.attempts.push(attemptRecord(
        next,
        startedAt,
        deps.now().toISOString(),
        "failed",
        [],
        [],
        { failure }
      ));
    }

    updateState(state, deps.now());
    await deps.saveRun(state);
  }

  await deps.saveRun(state);
  deps.log(`Ghostpatch Surge finished. prs=${state.counters.prsCreated} failures=${state.counters.failures} stop=${state.stopReason ?? "unknown"}`);
  return state;
}
