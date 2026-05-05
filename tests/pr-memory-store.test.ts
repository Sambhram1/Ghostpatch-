import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  appendLocalPrMemoryNote,
  appendPrMemoryEvent,
  buildInitialPrMemory,
  linkPrMemory,
  listPrMemory,
  loadPrMemoryByBranch,
  loadPrMemoryByPrNumber,
  loadPrMemoryByPrUrl,
  loadPrMemoryBySlug,
  mergeSolvedPrMemory,
  type PrMemoryRecord,
  savePrMemory
} from "../src/memory/pr-memory-store.js";
import type { LivePatchResult } from "../src/live/patch-result-store.js";
import type { Opportunity } from "../src/types.js";

function baseRecord(): PrMemoryRecord {
  return {
    slug: "owner-project-12",
    repo: "owner/project",
    branch: "ghostpatch/owner-project-12",
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
      issueUrl: "https://github.com/owner/project/issues/12",
      changedFiles: ["src/index.ts"],
      diffStat: "src/index.ts | 2 +-",
      validationCommand: "npm test",
      testExitCode: 0,
      testOutput: "PASS",
      agentOutput: "Fixed loader logic."
    },
    events: [],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z"
  };
}

async function withTempHome(test: () => Promise<void>): Promise<void> {
  const previousHome = process.env.GHOSTPATCH_HOME;
  process.env.GHOSTPATCH_HOME = await mkdtemp(path.join(os.tmpdir(), "ghostpatch-memory-"));
  try {
    await test();
  } finally {
    if (previousHome === undefined) {
      delete process.env.GHOSTPATCH_HOME;
    } else {
      process.env.GHOSTPATCH_HOME = previousHome;
    }
  }
}

export async function testPrMemoryStoreRoundTrip(): Promise<void> {
  await withTempHome(async () => {
    await savePrMemory(baseRecord());
    const loaded = await loadPrMemoryBySlug("owner-project-12");
    assert.equal(loaded?.slug, "owner-project-12");
    assert.equal(loaded?.branch, "ghostpatch/owner-project-12");
  });
}

export async function testPrMemoryLookupByPrIdentity(): Promise<void> {
  await withTempHome(async () => {
    const linked = linkPrMemory(baseRecord(), {
      prNumber: 101,
      prUrl: "https://github.com/owner/project/pull/101"
    });
    await savePrMemory(linked);

    assert.equal((await loadPrMemoryByPrNumber("owner/project", 101))?.slug, "owner-project-12");
    assert.equal((await loadPrMemoryByPrUrl("https://github.com/owner/project/pull/101"))?.prNumber, 101);
  });
}

export async function testPrMemoryLookupByBranchAndList(): Promise<void> {
  await withTempHome(async () => {
    await savePrMemory(baseRecord());
    assert.equal((await loadPrMemoryByBranch("owner/project", "ghostpatch/owner-project-12"))?.slug, "owner-project-12");
    assert.equal((await listPrMemory()).length, 1);
  });
}

export async function testPrMemoryAppendAndLocalNote(): Promise<void> {
  const withSolve = appendPrMemoryEvent(baseRecord(), {
    type: "solve-created",
    createdAt: "2026-05-05T01:00:00.000Z",
    source: "ghostpatch",
    content: "Created initial patch and ran npm test."
  });
  assert.equal(withSolve.events.at(-1)?.type, "solve-created");
  assert.match(withSolve.summary.whatWasTried.join("\n"), /initial patch/i);

  const withNote = appendLocalPrMemoryNote(withSolve, "maintainer wants smaller patch");
  assert.equal(withNote.events.at(-1)?.type, "local-note");
  assert.match(withNote.events.at(-1)?.content ?? "", /smaller patch/);
}

export async function testPrMemoryDedupesIdenticalEvents(): Promise<void> {
  const event = {
    type: "ci-failed" as const,
    createdAt: "2026-05-05T02:00:00.000Z",
    source: "github" as const,
    content: "CI failed on windows-latest",
    githubId: "check-1"
  };
  const once = appendPrMemoryEvent(baseRecord(), event);
  const twice = appendPrMemoryEvent(once, event);
  assert.equal(twice.events.length, 1);
  assert.match(twice.summary.currentBlockers.join("\n"), /windows-latest/);
}

function memoryOpportunity(): Opportunity {
  return {
    slug: "owner-project-12",
    title: "Fix loader",
    summary: "Loader fails on empty config.",
    repoProfile: {
      repo: "owner/project",
      language: "typescript",
      repoActivityDays: 1,
      maintainerResponseDays: 1,
      hasTests: true,
      antiBotPolicy: false,
      contributionGuide: "Add tests."
    },
    expectedBehavior: "Should work.",
    actualBehavior: "Fails.",
    reproductionSteps: ["Run app"],
    validationCommand: "npm test",
    patchOutline: ["Fix loader"],
    suggestedFiles: ["src/index.ts"],
    diffRisk: 2,
    ambiguityRisk: 2,
    issueUrl: "https://github.com/owner/project/issues/12"
  };
}

function memoryPatchResult(): LivePatchResult {
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

export async function testMergeSolvedPrMemoryPreservesPrIdentity(): Promise<void> {
  const existing = linkPrMemory(buildInitialPrMemory(memoryOpportunity(), memoryPatchResult()), {
    prNumber: 101,
    prUrl: "https://github.com/owner/project/pull/101"
  });
  const merged = mergeSolvedPrMemory(existing, memoryOpportunity(), {
    ...memoryPatchResult(),
    createdAt: "2026-05-05T02:00:00.000Z",
    branch: "ghostpatch/owner-project-12"
  });
  assert.equal(merged.prNumber, 101);
  assert.equal(merged.prUrl, "https://github.com/owner/project/pull/101");
  assert.equal(merged.events.filter((event) => event.type === "solve-created").length, 2);
}
