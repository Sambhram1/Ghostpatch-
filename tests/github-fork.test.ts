import assert from "node:assert/strict";

import {
  buildCreatePullRequestArgs,
  ensureUserFork,
  forkRepoName,
  parsePullRequestNumber
} from "../src/github/github-cli.js";

export async function testForkRepoName(): Promise<void> {
  assert.equal(forkRepoName("octocat", "owner/project"), "octocat/project");
}

export async function testEnsureUserForkUsesExistingFork(): Promise<void> {
  const calls: string[] = [];
  const result = await ensureUserFork("owner/project", async (_command, args) => {
    calls.push(args.join(" "));
    if (args[0] === "api") {
      return { exitCode: 0, stdout: "octocat", stderr: "" };
    }

    if (args[0] === "repo" && args[1] === "view") {
      return { exitCode: 0, stdout: "{\"nameWithOwner\":\"octocat/project\"}", stderr: "" };
    }

    return { exitCode: 1, stdout: "", stderr: "unexpected" };
  });

  assert.deepEqual(result, { login: "octocat", forkRepo: "octocat/project", created: false });
  assert.equal(calls.some((call) => call.includes("repo fork")), false);
}

export async function testEnsureUserForkCreatesFork(): Promise<void> {
  let forkCalled = false;
  const result = await ensureUserFork("owner/project", async (_command, args) => {
    if (args[0] === "api") {
      return { exitCode: 0, stdout: "octocat", stderr: "" };
    }

    if (args[0] === "repo" && args[1] === "view") {
      return { exitCode: 1, stdout: "", stderr: "not found" };
    }

    if (args[0] === "repo" && args[1] === "fork") {
      forkCalled = true;
      return { exitCode: 0, stdout: "created", stderr: "" };
    }

    return { exitCode: 1, stdout: "", stderr: "unexpected" };
  });

  assert.equal(forkCalled, true);
  assert.deepEqual(result, { login: "octocat", forkRepo: "octocat/project", created: true });
}

export async function testBuildCreatePullRequestArgs(): Promise<void> {
  assert.deepEqual(buildCreatePullRequestArgs("owner/project", "Fix bug", "Body"), [
    "pr",
    "create",
    "--repo",
    "owner/project",
    "--title",
    "Fix bug",
    "--body",
    "Body"
  ]);
}

export async function testParsePullRequestNumber(): Promise<void> {
  assert.equal(parsePullRequestNumber("https://github.com/owner/project/pull/101"), 101);
}
