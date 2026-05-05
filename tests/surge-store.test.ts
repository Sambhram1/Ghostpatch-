import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadSurgeRun, listSurgeRuns, saveSurgeRun } from "../src/surge/surge-store.js";
import type { SurgeRunState } from "../src/surge/types.js";

function runState(runId = "run-1"): SurgeRunState {
  return {
    runId,
    startedAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
    status: "running",
    limits: {
      maxPrs: 1,
      maxRuntimeMinutes: 10,
      maxFailures: 2,
      repoLimit: 5,
      minQualityScore: 0.78
    },
    counters: {
      reposScanned: 0,
      candidatesConsidered: 0,
      solveAttempts: 0,
      prsCreated: 0,
      failures: 0
    },
    attempts: []
  };
}

async function withTempHome(test: () => Promise<void>): Promise<void> {
  const previousHome = process.env.GHOSTPATCH_HOME;
  process.env.GHOSTPATCH_HOME = await mkdtemp(path.join(os.tmpdir(), "ghostpatch-surge-"));
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

export async function testSurgeStoreRoundTrip(): Promise<void> {
  await withTempHome(async () => {
    await saveSurgeRun(runState());
    const loaded = await loadSurgeRun("run-1");
    assert.equal(loaded?.runId, "run-1");
    assert.equal(loaded?.limits.repoLimit, 5);
  });
}

export async function testSurgeRunListing(): Promise<void> {
  await withTempHome(async () => {
    await saveSurgeRun(runState("run-1"));
    await saveSurgeRun({
      ...runState("run-2"),
      startedAt: "2026-05-05T01:00:00.000Z",
      updatedAt: "2026-05-05T01:00:00.000Z"
    });
    const listed = await listSurgeRuns();
    assert.equal(listed.length, 2);
    assert.equal(listed[0]?.runId, "run-2");
  });
}
