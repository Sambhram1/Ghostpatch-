import { saveAgentConnection } from "../agents/agent-config.js";
import { createAgentProvider } from "../agents/agent-registry.js";
import type { CodingAgentName, SupportedLanguage } from "../types.js";
import {
  type ApprovalMode,
  type RepoSourceMode,
  savePreferences
} from "../preferences/preferences-store.js";
import {
  ansi,
  brand,
  color,
  divider,
  printKeyValue,
  promptChoice,
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

  const approvalMode = await promptChoice<ApprovalMode>("How should Ghostpatch handle actions?", [
    { label: "Always ask before issue or PR", value: "always-ask" },
    { label: "Draft only, never publish", value: "draft-only" }
  ]);

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
      approvalMode,
      setupCompletedAt: new Date().toISOString()
    })
  );

  divider("ready");
  printKeyValue("agent", preferences.agent);
  printKeyValue("languages", preferences.languages.join(", "));
  printKeyValue("repo source", preferences.repoSourceMode);
  printKeyValue("manual repos", preferences.manualRepos.join(", ") || "none");
  printKeyValue("approval", preferences.approvalMode);
  printKeyValue("agent status", `${status.ready ? "ready" : "not ready"} (${status.detail})`);
  console.log(`\n${color("Next:", ansi.bold)} run ${color("ghostpatch scan", ansi.cyan)} then ${color("ghostpatch review", ansi.cyan)}`);
}
