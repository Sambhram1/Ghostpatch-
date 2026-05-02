#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const packageName = "@sambhram06/ghostpatch";
const explicitCommand = process.env.GHOSTPATCH_CLI;

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
}

const attempts = explicitCommand
  ? [[explicitCommand, args]]
  : [
      ["ghostpatch", args],
      ["npx", ["--yes", packageName, ...args]]
    ];

let lastStatus = 1;
for (const [command, commandArgs] of attempts) {
  const result = run(command, commandArgs);
  if (!result.error && result.status === 0) {
    process.exit(0);
  }

  lastStatus = result.status ?? 1;
  if (explicitCommand) {
    break;
  }
}

process.exit(lastStatus);
