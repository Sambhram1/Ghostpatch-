import assert from "node:assert/strict";

import { parseCli } from "../src/cli.js";

export async function testTerminalCommandParsing(): Promise<void> {
  assert.equal(parseCli(["setup"]).command, "setup");
  const scan = parseCli(["scan", "--live"]);
  assert.equal(scan.command, "scan");
  if (scan.command !== "scan") {
    throw new Error("expected scan command");
  }
  assert.equal(scan.live, true);
  assert.equal(parseCli(["review"]).command, "review");
}
