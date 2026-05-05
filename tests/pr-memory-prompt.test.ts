import assert from "node:assert/strict";

import { buildPrMemoryResumePrompt } from "../src/memory/pr-memory-prompt.js";
import type { PrMemoryRecord } from "../src/memory/pr-memory-store.js";

function record(): PrMemoryRecord {
  return {
    slug: "owner-project-12",
    repo: "owner/project",
    branch: "ghostpatch/owner-project-12",
    prNumber: 101,
    prUrl: "https://github.com/owner/project/pull/101",
    status: "open",
    summary: {
      whatWasTried: ["Created a patch and ran npm test."],
      currentBlockers: ["build failed on windows-latest"],
      maintainerRequests: ["Please add one more regression test."],
      ciFailures: ["build failed on windows-latest"],
      lastKnownStatus: "ci-failed",
      recommendedNextAction: "Fix the failing CI check and add the requested regression test."
    },
    solveContext: {
      issueTitle: "Fix loader",
      issueUrl: "https://github.com/owner/project/issues/12",
      changedFiles: ["src/index.ts"],
      diffStat: "src/index.ts | 2 +-",
      validationCommand: "npm test",
      testExitCode: 0,
      testOutput: "PASS",
      agentOutput: "Updated loader path handling."
    },
    events: [],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  };
}

export async function testBuildPrMemoryResumePrompt(): Promise<void> {
  const prompt = buildPrMemoryResumePrompt(record());
  assert.match(prompt, /What was already tried/i);
  assert.match(prompt, /Maintainer requests/i);
  assert.match(prompt, /CI failures/i);
  assert.match(prompt, /Recommended next action/i);
}
