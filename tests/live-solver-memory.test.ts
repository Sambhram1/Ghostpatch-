import assert from "node:assert/strict";

import { buildInitialPrMemory } from "../src/memory/pr-memory-store.js";
import type { LivePatchResult } from "../src/live/patch-result-store.js";
import type { Opportunity } from "../src/types.js";

function opportunity(): Opportunity {
  return {
    slug: "owner-project-12",
    title: "Fix loader",
    summary: "Loader fails on empty config.",
    repoProfile: {
      repo: "owner/project",
      language: "typescript",
      repoActivityDays: 5,
      maintainerResponseDays: 4,
      hasTests: true,
      antiBotPolicy: false,
      contributionGuide: "Add tests."
    },
    expectedBehavior: "Loader should return defaults.",
    actualBehavior: "Loader throws.",
    reproductionSteps: ["Run app"],
    validationCommand: "npm test",
    patchOutline: ["Fix loader"],
    suggestedFiles: ["src/index.ts"],
    diffRisk: 2,
    ambiguityRisk: 2,
    issueUrl: "https://github.com/owner/project/issues/12"
  };
}

function patchResult(): LivePatchResult {
  return {
    slug: "owner-project-12",
    repo: "owner/project",
    repoDir: "/tmp/project",
    branch: "ghostpatch/owner-project-12",
    title: "Fix loader",
    body: "Fixes issue",
    commandLog: [],
    reproductionLog: [],
    changedFiles: ["src/index.ts"],
    diffStat: "src/index.ts | 2 +-",
    diff: "diff",
    diffLineCount: 2,
    diffBudget: 20,
    testCommand: "npm test",
    testExitCode: 0,
    testOutput: "PASS",
    agentExitCode: 0,
    agentOutput: "Updated loader handling.",
    reviewWarnings: [],
    createdAt: "2026-05-05T01:00:00.000Z"
  };
}

export async function testBuildInitialPrMemory(): Promise<void> {
  const record = buildInitialPrMemory(opportunity(), patchResult());
  assert.equal(record.slug, "owner-project-12");
  assert.equal(record.branch, "ghostpatch/owner-project-12");
  assert.equal(record.events[0]?.type, "solve-created");
  assert.equal(record.solveContext.validationCommand, "npm test");
  assert.match(record.summary.whatWasTried.join("\n"), /Created a solve patch/i);
}
