import assert from "node:assert/strict";

import {
  defaultGitHubEnvVarChoice,
  renderMissingGitHubTokenInstructions
} from "../src/ui/setup-wizard.js";

export async function testDefaultGitHubEnvVarChoice(): Promise<void> {
  assert.equal(defaultGitHubEnvVarChoice(undefined), "GH_TOKEN");
  assert.equal(defaultGitHubEnvVarChoice("GITHUB_TOKEN"), "GITHUB_TOKEN");
}

export async function testRenderMissingGitHubTokenInstructions(): Promise<void> {
  assert.match(renderMissingGitHubTokenInstructions("GH_TOKEN"), /setx GH_TOKEN/);
  assert.match(renderMissingGitHubTokenInstructions("GITHUB_TOKEN"), /\$env:GITHUB_TOKEN=/);
}
