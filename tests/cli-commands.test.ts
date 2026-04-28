import assert from "node:assert/strict";

import { parseCli } from "../src/cli.js";

export async function testTerminalCommandParsing(): Promise<void> {
  assert.equal(parseCli(["setup"]).command, "setup");
  assert.equal(parseCli(["scan"]).command, "scan");
  assert.equal(parseCli(["review"]).command, "review");
}
