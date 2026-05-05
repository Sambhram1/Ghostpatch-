import assert from "node:assert/strict";

import {
  requireConfiguredGitHubAuth,
  requireGitHubToken,
  resolveGitHubToken,
  validateGitHubToken
} from "../src/github/github-auth.js";

function jsonResponse(status: number): Response {
  return new Response("{}", { status });
}

export async function testResolveGitHubToken(): Promise<void> {
  const resolved = resolveGitHubToken("GH_TOKEN", { GH_TOKEN: "abc" } as NodeJS.ProcessEnv);
  assert.equal(resolved.envVar, "GH_TOKEN");
  assert.equal(resolved.token, "abc");

  const alternate = resolveGitHubToken("GITHUB_TOKEN", {
    GITHUB_TOKEN: "xyz"
  } as NodeJS.ProcessEnv);
  assert.equal(alternate.envVar, "GITHUB_TOKEN");
  assert.equal(alternate.token, "xyz");
}

export async function testValidateGitHubTokenMissing(): Promise<void> {
  const status = await validateGitHubToken("GH_TOKEN", undefined, async () => jsonResponse(200));
  assert.equal(status.ok, false);
  assert.match(status.message, /GH_TOKEN is not set/);
}

export async function testValidateGitHubTokenUnauthorized(): Promise<void> {
  const status = await validateGitHubToken("GH_TOKEN", "bad-token", async () => jsonResponse(401));
  assert.equal(status.ok, false);
  assert.match(status.message, /invalid/i);
}

export async function testValidateGitHubTokenSuccess(): Promise<void> {
  const status = await validateGitHubToken("GH_TOKEN", "good-token", async () => jsonResponse(200));
  assert.equal(status.ok, true);
  assert.match(status.message, /ready/i);
}

export async function testRequireGitHubToken(): Promise<void> {
  await assert.rejects(
    () => requireGitHubToken("GH_TOKEN", {} as NodeJS.ProcessEnv, async () => jsonResponse(200)),
    /GH_TOKEN is not set/
  );
}

export async function testRequireConfiguredGitHubAuth(): Promise<void> {
  await assert.rejects(
    () => requireConfiguredGitHubAuth({
      githubAuth: {
        envVar: "GH_TOKEN"
      }
    }, {} as NodeJS.ProcessEnv, async () => jsonResponse(200)),
    /GH_TOKEN is not set/
  );
}
