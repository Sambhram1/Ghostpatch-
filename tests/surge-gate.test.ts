import assert from "node:assert/strict";

import { evaluateSurgeGate } from "../src/surge/surge-gate.js";
import type { LivePatchResult } from "../src/live/patch-result-store.js";
import type { Opportunity } from "../src/types.js";

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
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
      positiveSignals: ["tests exist"],
      riskSignals: [],
      safetySignals: []
    },
    ...overrides
  };
}

function patchResult(overrides: Partial<LivePatchResult> = {}): LivePatchResult {
  return {
    slug: "owner-project-1",
    repo: "owner/project",
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

export async function testSurgeGateBlocksFailedValidation(): Promise<void> {
  const decision = evaluateSurgeGate(opportunity(), patchResult({
    testExitCode: 1,
    testOutput: "FAIL"
  }));
  assert.equal(decision.allowed, false);
  assert.match(decision.blockers.join("\n"), /validation command exited with 1/);
}

export async function testSurgeGateBlocksLowQuality(): Promise<void> {
  const decision = evaluateSurgeGate(opportunity({
    quality: {
      score: 0.4,
      summary: "low-quality candidate",
      positiveSignals: [],
      riskSignals: ["ambiguous"],
      safetySignals: []
    }
  }), patchResult(), { minQualityScore: 0.7 });
  assert.equal(decision.allowed, false);
  assert.match(decision.blockers.join("\n"), /below the 0.70 threshold/);
}

export async function testSurgeGateBlocksAntiBotPolicy(): Promise<void> {
  const decision = evaluateSurgeGate(opportunity({
    repoProfile: {
      ...opportunity().repoProfile,
      antiBotPolicy: true,
      contributionGuide: "No bots or AI contributions."
    }
  }), patchResult());
  assert.equal(decision.allowed, false);
  assert.match(decision.blockers.join("\n"), /restrict bot or AI contributions/);
}

export async function testSurgeGateAllowsCleanPatch(): Promise<void> {
  const decision = evaluateSurgeGate(opportunity(), patchResult(), { minQualityScore: 0.7 });
  assert.equal(decision.allowed, true);
}
