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
  const options = parseCli(["login", "claude", "--command", "claude"]);

  assert.equal(options.command, "login");
  if (options.command !== "login") {
    throw new Error("expected login command");
  }

  assert.equal(options.agent, "claude");
  assert.equal(options.commandPath, "claude");
}
