import type { CodingAgentName } from "./types.js";

export type CliOptions =
  | RunOptions
  | LoginOptions
  | AgentsOptions
  | SetupOptions
  | ScanOptions
  | SurgeOptions
  | ReviewOptions
  | HelpOptions;

export interface RunOptions {
  command: "run";
  fixture?: string;
  agent: CodingAgentName;
}

export interface LoginOptions {
  command: "login";
  agent: CodingAgentName;
  commandPath?: string;
  dryRunCommand?: string;
  envVar?: string;
}

export interface AgentsOptions {
  command: "agents";
}

export interface SetupOptions {
  command: "setup";
}

export interface ScanOptions {
  command: "scan";
  live: boolean;
}

export interface ReviewOptions {
  command: "review";
}

export interface SurgeOptions {
  command: "surge";
  maxPrs?: number;
  maxRuntimeMinutes?: number;
  maxFailures?: number;
  repoLimit?: number;
}

export interface HelpOptions {
  command: "help";
  message: string;
}

export function parseCli(argv: string[]): CliOptions {
  const [command = "run", ...rest] = argv;
  if (command === "help" || command === "--help" || command === "-h") {
    return { command: "help", message: helpText() };
  }

  if (command === "scan") {
    return {
      command,
      live: rest.includes("--live")
    };
  }

  if (command === "surge") {
    return {
      command,
      maxPrs: parseNumberFlag(rest, "--max-prs"),
      maxRuntimeMinutes: parseNumberFlag(rest, "--max-runtime-minutes"),
      maxFailures: parseNumberFlag(rest, "--max-failures"),
      repoLimit: parseNumberFlag(rest, "--repo-limit")
    };
  }

  if (command === "agents" || command === "setup" || command === "review") {
    return { command };
  }

  if (command === "login") {
    return parseLogin(rest);
  }

  if (command !== "run") {
    throw new Error(`Unsupported command: ${command}\n\n${helpText()}`);
  }

  const fixtureIndex = rest.indexOf("--fixture");
  const fixture = fixtureIndex >= 0 ? rest[fixtureIndex + 1] : undefined;
  const agentIndex = rest.indexOf("--agent");
  const agent = parseAgent(agentIndex >= 0 ? rest[agentIndex + 1] : undefined);

  return {
    command,
    fixture,
    agent
  };
}

function parseLogin(rest: string[]): LoginOptions {
  const agent = parseAgent(rest[0]);
  const commandIndex = rest.indexOf("--command");
  const dryRunCommandIndex = rest.indexOf("--dry-run-command");
  const envIndex = rest.indexOf("--env");

  return {
    command: "login",
    agent,
    commandPath: commandIndex >= 0 ? rest[commandIndex + 1] : undefined,
    dryRunCommand: dryRunCommandIndex >= 0 ? rest[dryRunCommandIndex + 1] : undefined,
    envVar: envIndex >= 0 ? rest[envIndex + 1] : undefined
  };
}

function parseAgent(value: string | undefined): CodingAgentName {
  if (!value) {
    return "local";
  }

  if (value === "local" || value === "codex" || value === "claude") {
    return value;
  }

  throw new Error(`Unsupported agent: ${value}`);
}

function parseNumberFlag(rest: string[], flag: string): number | undefined {
  const index = rest.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  const value = rest[index + 1];
  const parsed = Number(value);
  if (!value || !Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flag}: ${value ?? "(missing)"}\n\n${helpText()}`);
  }

  return parsed;
}

function helpText(): string {
  return [
    "Ghostpatch",
    "",
    "GitHub auth for live scan and publish uses GH_TOKEN or GITHUB_TOKEN.",
    "ghostpatch login configures the coding agent command, not GitHub access.",
    "",
    "Commands:",
    "  ghostpatch run [--agent local|codex|claude] [--fixture slug]",
    "  ghostpatch setup",
    "  ghostpatch scan [--live]",
    "  ghostpatch surge [--max-prs N] [--max-runtime-minutes N] [--max-failures N] [--repo-limit N]",
    "  ghostpatch review",
    "  ghostpatch login <local|codex|claude> [--command path] [--dry-run-command command] [--env ENV_VAR]",
    "  ghostpatch agents",
    "",
    "Examples:",
    "  ghostpatch setup",
    "  ghostpatch scan",
    "  ghostpatch review",
    "  ghostpatch login codex --command codex",
    "  ghostpatch login claude --command claude",
    "  ghostpatch login codex --dry-run-command \"codex exec --sandbox read-only {{prompt}}\"",
    "  ghostpatch run --agent codex --fixture python-fastapi-bug"
  ].join("\n");
}
