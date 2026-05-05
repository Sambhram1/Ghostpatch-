import { saveAgentConnection } from "../agents/agent-config.js";
import { createAgentProvider } from "../agents/agent-registry.js";
import type { CodingAgentName, SupportedLanguage } from "../types.js";
import {
  type ApprovalMode,
  type GitHubTokenEnvVar,
  type RepoSourceMode,
  savePreferences
} from "../preferences/preferences-store.js";
import {
  resolveGitHubToken,
  validateGitHubToken
} from "../github/github-auth.js";
import {
  ansi,
  brand,
  color,
  divider,
  printKeyValue,
  promptChoice,
  promptConfirm,
  promptMultiChoice,
  promptText,
  spinner,
  typeLine
} from "./terminal.js";

function defaultCommand(agent: CodingAgentName): string {
  if (agent === "local") {
    return "";
  }

  return agent;
}

function defaultDryRunCommand(agent: CodingAgentName): string {
  if (agent === "codex") {
    return "codex exec --sandbox read-only --cd . {{prompt}}";
  }

  if (agent === "claude") {
    return "claude -p --permission-mode default {{prompt}}";
  }

  return "";
}

function parseRepos(value: string): string[] {
  return value
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
}

function parseRepoTestCommands(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [repo, ...commandParts] = item.split("=");
        return [repo.trim(), commandParts.join("=").trim()];
      })
      .filter(([repo, command]) => repo && command)
  );
}

export function defaultGitHubEnvVarChoice(
  current?: GitHubTokenEnvVar
): GitHubTokenEnvVar {
  return current ?? "GH_TOKEN";
}

export function renderMissingGitHubTokenInstructions(
  envVar: GitHubTokenEnvVar
): string {
  return [
    `GitHub token not found in ${envVar}.`,
    "",
    "Create a GitHub personal access token, then set it like this:",
    "",
    "PowerShell (current session):",
    `  $env:${envVar}="your_token"`,
    "",
    "PowerShell (persist for future sessions):",
    `  setx ${envVar} "your_token"`,
    "",
    "You can finish setup now and add the token later."
  ].join("\n");
}

export async function runSetupWizard(): Promise<void> {
  brand();
  await typeLine("Let us set up Ghostpatch for a low-friction terminal workflow.");
  divider("setup");

  const agent = await promptChoice<CodingAgentName>("Which coding agent should Ghostpatch use?", [
    { label: "Codex CLI", value: "codex" },
    { label: "Claude CLI", value: "claude" },
    { label: "Local deterministic dry run", value: "local" }
  ]);

  let commandPath: string | undefined;
  let dryRunCommand: string | undefined;

  if (agent !== "local") {
    commandPath = await promptText("Agent command", defaultCommand(agent));
    dryRunCommand = await promptText("Safe dry-run command", defaultDryRunCommand(agent));
  }

  const languages = await promptMultiChoice<SupportedLanguage>(
    "Which languages should Ghostpatch look for?",
    [
      { label: "Python", value: "python" },
      { label: "TypeScript / JavaScript", value: "typescript" }
    ],
    ["python", "typescript"]
  );

  const repoSourceMode = await promptChoice<RepoSourceMode>("How should repos be selected?", [
    { label: "I will provide repos", value: "manual" },
    { label: "Auto-search public repos", value: "auto" },
    { label: "Both manual and auto-search", value: "both" }
  ]);

  const manualRepoInput = repoSourceMode === "manual" || repoSourceMode === "both"
    ? await promptText("Repos, comma-separated owner/name", "")
    : "";

  const testCommandInput = await promptText(
    "Per-repo test commands, comma-separated owner/name=command",
    ""
  );

  const approvalMode = await promptChoice<ApprovalMode>("How should Ghostpatch handle actions?", [
    { label: "Always ask before issue or PR", value: "always-ask" },
    { label: "Draft only, never publish", value: "draft-only" }
  ]);

  const githubEnvVar = await promptChoice<GitHubTokenEnvVar>(
    "Which GitHub token variable should Ghostpatch use?",
    [
      { label: "GH_TOKEN", value: "GH_TOKEN" },
      { label: "GITHUB_TOKEN", value: "GITHUB_TOKEN" }
    ]
  );

  const connection = await spinner("Saving agent connection", async () =>
    saveAgentConnection({
      agent,
      command: commandPath,
      dryRunCommand
    })
  );

  const provider = createAgentProvider(agent, connection);
  const status = await spinner("Checking agent status", async () => provider.status());

  const preferences = await spinner("Saving Ghostpatch preferences", async () =>
    savePreferences({
      agent,
      languages,
      repoSourceMode,
      manualRepos: parseRepos(manualRepoInput),
      repoTestCommands: parseRepoTestCommands(testCommandInput),
      approvalMode,
      githubAuth: {
        envVar: githubEnvVar
      },
      setupCompletedAt: new Date().toISOString()
    })
  );

  const { token } = resolveGitHubToken(githubEnvVar);
  let githubStatus = `not ready - ${githubEnvVar} is not set`;
  if (!token) {
    console.log("");
    console.log(renderMissingGitHubTokenInstructions(githubEnvVar));
    console.log("");
  } else {
    const authStatus = await spinner("Validating GitHub token", async () =>
      validateGitHubToken(githubEnvVar, token)
    );
    githubStatus = authStatus.ok
      ? "ready"
      : `invalid token - recheck ${githubEnvVar}`;
    if (!authStatus.ok) {
      console.log(color(authStatus.message, ansi.yellow));
    }
  }

  divider("ready");
  printKeyValue("agent", preferences.agent);
  printKeyValue("languages", preferences.languages.join(", "));
  printKeyValue("repo source", preferences.repoSourceMode);
  printKeyValue("manual repos", preferences.manualRepos.join(", ") || "none");
  printKeyValue("test overrides", Object.keys(preferences.repoTestCommands).join(", ") || "none");
  printKeyValue("approval", preferences.approvalMode);
  printKeyValue("agent status", `${status.ready ? "ready" : "not ready"} (${status.detail})`);
  printKeyValue("github", githubStatus);
  console.log(`\n${color("Next:", ansi.bold)} run ${color("ghostpatch scan", ansi.cyan)} then ${color("ghostpatch review", ansi.cyan)}`);
}
