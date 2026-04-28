import assert from "node:assert/strict";

import { defaultConfig } from "../src/config.js";
import { loadFixtures } from "../src/fixtures/load-fixtures.js";
import { runOpportunity } from "../src/pipeline/orchestrator.js";

export async function testDirectPrArtifact(): Promise<void> {
  const [fixture] = await loadFixtures("python-fastapi-bug");
  const run = runOpportunity(fixture, defaultConfig);

  assert.equal(run.social.mode, "direct-pr");
  assert.match(run.social.prTitle ?? "", /trailing slash/i);
}

export async function testIssueArtifact(): Promise<void> {
  const [fixture] = await loadFixtures("ts-cli-regression");
  const run = runOpportunity(fixture, defaultConfig);

  assert.equal(run.social.mode, "issue-first");
  assert.match(run.social.issueBody ?? "", /Reproduction:/);
}
