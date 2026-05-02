import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  getReportId,
  listStoredReports,
  loadReportById,
  saveLatestReport
} from "../src/reports/report-store.js";
import {
  loadReviewState,
  rejectCandidate,
  saveReviewState
} from "../src/reports/review-state-store.js";
import type { RunReport } from "../src/types.js";

function report(generatedAt: string): RunReport {
  return {
    generatedAt,
    totalCandidates: 0,
    agentName: "local",
    runs: []
  };
}

async function withTempHome(test: () => Promise<void>): Promise<void> {
  const previousHome = process.env.GHOSTPATCH_HOME;
  process.env.GHOSTPATCH_HOME = await mkdtemp(path.join(os.tmpdir(), "ghostpatch-history-"));
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

export async function testReportHistoryRoundTrip(): Promise<void> {
  await withTempHome(async () => {
    const first = report("2026-05-02T01:00:00.000Z");
    const second = report("2026-05-02T02:00:00.000Z");
    await saveLatestReport(first);
    await saveLatestReport(second);

    const stored = await listStoredReports();
    assert.equal(stored.length, 2);
    assert.equal(stored[0].generatedAt, second.generatedAt);

    const loaded = await loadReportById(getReportId(first));
    assert.equal(loaded?.generatedAt, first.generatedAt);
  });
}

export async function testReviewStateRoundTrip(): Promise<void> {
  await withTempHome(async () => {
    const initial = await loadReviewState("scan-1");
    assert.equal(initial.cursor, 0);

    await saveReviewState({ ...initial, cursor: 2 });
    const saved = await loadReviewState("scan-1");
    assert.equal(saved.cursor, 2);

    const rejected = await rejectCandidate(saved, "owner-project-12", "too ambiguous");
    assert.equal(rejected.rejected.length, 1);
    assert.equal((await loadReviewState("scan-1")).rejected[0]?.reason, "too ambiguous");
  });
}
