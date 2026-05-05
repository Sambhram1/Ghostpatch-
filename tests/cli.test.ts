import assert from "node:assert/strict";

import { parseCli } from "../src/cli.js";

export async function testRunAgentParsing(): Promise<void> {
  const options = parseCli(["run", "--agent", "codex", "--fixture", "python-fastapi-bug"]);

  assert.equal(options.command, "run");
  if (options.command !== "run") {
    throw new Error("expected run command");
  }

  assert.equal(options.agent, "codex");
  assert.equal(options.fixture, "python-fastapi-bug");
}

export async function testLoginParsing(): Promise<void> {
  const options = parseCli([
    "login",
    "claude",
    "--command",
    "claude",
    "--dry-run-command",
    "claude -p {{prompt}}"
  ]);

  assert.equal(options.command, "login");
  if (options.command !== "login") {
    throw new Error("expected login command");
  }

  assert.equal(options.agent, "claude");
  assert.equal(options.commandPath, "claude");
  assert.equal(options.dryRunCommand, "claude -p {{prompt}}");
}

export async function testHelpMentionsTokenAuth(): Promise<void> {
  const options = parseCli(["--help"]);

  assert.equal(options.command, "help");
  if (options.command !== "help") {
    throw new Error("expected help command");
  }

  assert.match(options.message, /GH_TOKEN|GITHUB_TOKEN/);
  assert.match(options.message, /ghostpatch login configures the coding agent command/i);
  assert.match(options.message, /ghostpatch surge/i);
}

export async function testSurgeParsing(): Promise<void> {
  const options = parseCli([
    "surge",
    "--max-prs",
    "2",
    "--max-runtime-minutes",
    "15",
    "--max-failures",
    "4",
    "--repo-limit",
    "8"
  ]);

  assert.equal(options.command, "surge");
  if (options.command !== "surge") {
    throw new Error("expected surge command");
  }

  assert.equal(options.maxPrs, 2);
  assert.equal(options.maxRuntimeMinutes, 15);
  assert.equal(options.maxFailures, 4);
  assert.equal(options.repoLimit, 8);
}
