import assert from "node:assert/strict";

import { patchPublishBlockers, renderForkStatus } from "../src/ui/review-session.js";
import { reviewPatchSafety } from "../src/live/safety.js";
import type { LivePatchResult } from "../src/live/patch-result-store.js";

function patchResult(overrides: Partial<LivePatchResult> = {}): LivePatchResult {
  return {
    slug: "owner-project-1",
    repo: "owner/project",
    repoDir: "/tmp/ghostpatch/project",
    branch: "ghostpatch/owner-project-1",
    title: "Fix project issue",
    body: "Fixes the issue.",
    commandLog: ["agent: codex exec", "validation: npm test"],
    reproductionLog: ["Reproduction confirmed.", "validation exit: 0"],
    changedFiles: ["src/index.ts"],
    diffStat: "src/index.ts | 2 +-",
    diff: "diff --git a/src/index.ts b/src/index.ts\n+const ok = true;\n-const ok = false;",
    diffLineCount: 2,
    diffBudget: 20,
    testCommand: "npm test",
    testExitCode: 0,
    testOutput: "PASS",
    agentExitCode: 0,
    agentOutput: "done",
    reviewWarnings: [],
    createdAt: "2026-05-02T00:00:00.000Z",
    ...overrides
  };
}

export async function testPatchPublishBlockers(): Promise<void> {
  assert.deepEqual(patchPublishBlockers(patchResult()), []);

  const blockers = patchPublishBlockers(patchResult({
    changedFiles: [],
    agentExitCode: 1,
    testExitCode: 2
  }));

  assert.equal(blockers.length, 3);
  assert.match(blockers[0], /no changed files/);
  assert.match(blockers[1], /agent exited with 1/);
  assert.match(blockers[2], /validation command exited with 2/);
}

export async function testPatchSafetyReview(): Promise<void> {
  const review = reviewPatchSafety(patchResult({
    changedFiles: ["package-lock.json"],
    diff: [
      "diff --git a/package-lock.json b/package-lock.json",
      "+apiKey: abc123",
      "-apiKey: old"
    ].join("\n"),
    diffBudget: 1
  }), 1);

  assert.equal(review.approved, false);
  assert.match(review.blockers.join("\n"), /over the 1 line budget/);
  assert.match(review.blockers.join("\n"), /secret-like content/);
  assert.match(review.warnings.join("\n"), /package-lock\.json/);
}

export async function testRenderForkStatus(): Promise<void> {
  assert.equal(
    renderForkStatus("octocat/project", "owner/project"),
    "origin=octocat/project, upstream=owner/project"
  );
}
