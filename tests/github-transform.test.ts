import assert from "node:assert/strict";

import { issueToOpportunity } from "../src/github/github-cli.js";

export async function testGitHubIssueTransform(): Promise<void> {
  const opportunity = issueToOpportunity(
    {
      nameWithOwner: "owner/project",
      url: "https://github.com/owner/project",
      primaryLanguage: { name: "Python" },
      pushedAt: new Date().toISOString()
    },
    {
      number: 12,
      title: "Config loader crashes",
      body: "The loader crashes on missing config.",
      url: "https://github.com/owner/project/issues/12",
      labels: [{ name: "bug" }],
      updatedAt: new Date().toISOString()
    }
  );

  assert.equal(opportunity.repoProfile.repo, "owner/project");
  assert.equal(opportunity.repoProfile.language, "python");
  assert.equal(opportunity.issueNumber, 12);
  assert.equal(opportunity.sourceType, "github");
  assert.equal(opportunity.ambiguityRisk, 3);
}
