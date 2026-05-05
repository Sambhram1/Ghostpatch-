import assert from "node:assert/strict";

import {
  desiredWorkspaceRemotes,
  repoDirName,
  repoGitUrl
} from "../src/workspace/workspace-manager.js";

export async function testWorkspaceRepoDirName(): Promise<void> {
  assert.equal(repoDirName("owner/project"), "owner__project");
}

export async function testWorkspaceRemotePlan(): Promise<void> {
  assert.deepEqual(desiredWorkspaceRemotes("owner/project", "octocat/project"), {
    originRepo: "octocat/project",
    upstreamRepo: "owner/project"
  });
}

export async function testWorkspaceRepoGitUrl(): Promise<void> {
  assert.equal(repoGitUrl("owner/project"), "https://github.com/owner/project.git");
}
