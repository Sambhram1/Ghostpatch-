import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  loadPreferences,
  savePreferences
} from "../src/preferences/preferences-store.js";

export async function testPreferencesRoundTrip(): Promise<void> {
  const previousHome = process.env.GHOSTPATCH_HOME;
  process.env.GHOSTPATCH_HOME = await mkdtemp(path.join(os.tmpdir(), "ghostpatch-test-"));

  try {
    await savePreferences({
      agent: "codex",
      languages: ["python"],
      repoSourceMode: "both",
      manualRepos: ["owner/repo"],
      repoTestCommands: {},
      approvalMode: "always-ask",
      githubAuth: {
        envVar: "GITHUB_TOKEN"
      },
      setupCompletedAt: "test"
    });

    const loaded = await loadPreferences();
    assert.equal(loaded.agent, "codex");
    assert.deepEqual(loaded.languages, ["python"]);
    assert.deepEqual(loaded.manualRepos, ["owner/repo"]);
    assert.deepEqual(loaded.repoTestCommands, {});
    assert.deepEqual(loaded.githubAuth, { envVar: "GITHUB_TOKEN" });
  } finally {
    if (previousHome === undefined) {
      delete process.env.GHOSTPATCH_HOME;
    } else {
      process.env.GHOSTPATCH_HOME = previousHome;
    }
  }
}

export async function testPreferencesLegacyDefaultGitHubAuth(): Promise<void> {
  const previousHome = process.env.GHOSTPATCH_HOME;
  process.env.GHOSTPATCH_HOME = await mkdtemp(path.join(os.tmpdir(), "ghostpatch-test-"));

  try {
    const preferencesPath = path.join(process.env.GHOSTPATCH_HOME, "preferences.json");
    await writeFile(preferencesPath, JSON.stringify({
      agent: "claude",
      languages: ["typescript"],
      repoSourceMode: "manual",
      manualRepos: [],
      repoTestCommands: {},
      approvalMode: "draft-only"
    }, null, 2));

    const loaded = await loadPreferences();
    assert.deepEqual(loaded.githubAuth, { envVar: "GH_TOKEN" });
  } finally {
    if (previousHome === undefined) {
      delete process.env.GHOSTPATCH_HOME;
    } else {
      process.env.GHOSTPATCH_HOME = previousHome;
    }
  }
}
