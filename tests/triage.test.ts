import assert from "node:assert/strict";

import { defaultConfig } from "../src/config.js";
import { loadFixtures } from "../src/fixtures/load-fixtures.js";
import { triage } from "../src/pipeline/triage.js";

export async function testDirectPrTriage(): Promise<void> {
  const [fixture] = await loadFixtures("python-fastapi-bug");
  const result = triage(fixture, defaultConfig);

  assert.equal(result.proceed, true);
  assert.equal(result.modeHint, "direct-pr");
}

export async function testIssueFirstTriage(): Promise<void> {
  const [fixture] = await loadFixtures("ts-cli-regression");
  const result = triage(fixture, defaultConfig);

  assert.equal(result.proceed, true);
  assert.equal(result.modeHint, "issue-first");
}

export async function testSkipTriage(): Promise<void> {
  const [fixture] = await loadFixtures("inactive-ambiguous");
  const result = triage(fixture, defaultConfig);

  assert.equal(result.proceed, false);
  assert.ok(result.reasonCodes.includes("bot-hostile"));
}
