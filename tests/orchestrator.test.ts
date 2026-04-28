import assert from "node:assert/strict";

import { loadFixtures } from "../src/fixtures/load-fixtures.js";
import { runGhostpatch } from "../src/pipeline/orchestrator.js";
import { renderReport } from "../src/report/render-report.js";

export async function testOrchestratorReport(): Promise<void> {
  const fixtures = await loadFixtures();
  const report = await runGhostpatch(fixtures);
  const rendered = renderReport(report);

  assert.equal(report.runs.length, 3);
  assert.match(rendered, /Ghostpatch Dry Run Report/);
  assert.match(rendered, /Agent: local/);
  assert.match(rendered, /Decision:/);
}
