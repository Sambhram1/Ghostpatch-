import assert from "node:assert/strict";

import { issueToOpportunity } from "../src/github/github-cli.js";
import { qualifyGitHubIssue } from "../src/github/quality.js";

export async function testGitHubIssueQualification(): Promise<void> {
  const quality = qualifyGitHubIssue(
    {
      number: 42,
      title: "Parser crashes on trailing slash",
      body: "Steps to reproduce:\n1. Run parser\nExpected: ok\nActual: traceback",
      url: "https://github.com/owner/project/issues/42",
      labels: [{ name: "bug" }, { name: "good first issue" }],
      updatedAt: "2026-05-02T00:00:00.000Z"
    },
    {
      contributionGuideFound: true,
      contributionGuideText: "Please add tests with each fix.",
      hasTests: true,
      licenseName: "MIT"
    }
  );

  assert.equal(quality.summary, "high-quality candidate");
  assert.ok(quality.score >= 0.78);
  assert.match(quality.positiveSignals.join("\n"), /reproduction/);
  assert.match(quality.safetySignals.join("\n"), /MIT/);
}

export async function testGitHubIssueQualificationRisks(): Promise<void> {
  const quality = qualifyGitHubIssue(
    {
      number: 43,
      title: "Maybe add a new integration",
      body: "Would this be useful?",
      url: "https://github.com/owner/project/issues/43",
      labels: [{ name: "question" }],
      updatedAt: "2026-05-02T00:00:00.000Z"
    },
    {
      contributionGuideFound: true,
      contributionGuideText: "No AI generated pull requests.",
      hasTests: false,
      licenseName: "NOASSERTION"
    }
  );

  assert.equal(quality.summary, "low-quality candidate");
  assert.ok(quality.score < 0.5);
  assert.match(quality.riskSignals.join("\n"), /maintainer clarification/);
  assert.match(quality.safetySignals.join("\n"), /restrict/);
}

export async function testIssueTransformCarriesQualitySignals(): Promise<void> {
  const quality = qualifyGitHubIssue(
    {
      number: 44,
      title: "Config bug",
      body: "Expected one value, actual another value.",
      url: "https://github.com/owner/project/issues/44",
      labels: [{ name: "bug" }],
      updatedAt: "2026-05-02T00:00:00.000Z"
    },
    {
      contributionGuideFound: false,
      contributionGuideText: "",
      hasTests: false,
      licenseName: "Apache-2.0"
    }
  );

  const opportunity = issueToOpportunity(
    {
      nameWithOwner: "owner/project",
      url: "https://github.com/owner/project",
      primaryLanguage: { name: "TypeScript" },
      pushedAt: "2026-05-01T00:00:00.000Z",
      licenseInfo: { name: "Apache License 2.0", spdxId: "Apache-2.0" }
    },
    {
      number: 44,
      title: "Config bug",
      body: "Expected one value, actual another value.",
      url: "https://github.com/owner/project/issues/44",
      labels: [{ name: "bug" }],
      updatedAt: "2026-05-02T00:00:00.000Z"
    },
    {
      contributionGuideFound: false,
      contributionGuideText: "",
      hasTests: false,
      licenseName: "Apache-2.0"
    },
    quality
  );

  assert.equal(opportunity.quality?.score, quality.score);
  assert.equal(opportunity.repoProfile.hasTests, false);
  assert.equal(opportunity.repoProfile.licenseName, "Apache-2.0");
}
