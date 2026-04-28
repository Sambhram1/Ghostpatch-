import { mkdir, readFile, writeFile } from "node:fs/promises";

import type { AgentConnection } from "./types.js";
import type { CodingAgentName } from "../types.js";
import { ghostpatchHome, ghostpatchPath } from "../config-home.js";

interface AgentConfigFile {
  agents: Record<string, AgentConnection>;
}

function configPath(): string {
  return ghostpatchPath("config.json");
}

const defaultConnections: AgentConnection[] = [
  {
    agent: "local",
    configuredAt: "builtin"
  }
];

async function readConfig(): Promise<AgentConfigFile> {
  try {
    const raw = await readFile(configPath(), "utf8");
    return JSON.parse(raw) as AgentConfigFile;
  } catch {
    return {
      agents: Object.fromEntries(defaultConnections.map((item) => [item.agent, item]))
    };
  }
}

async function writeConfig(config: AgentConfigFile): Promise<void> {
  await mkdir(ghostpatchHome(), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function saveAgentConnection(input: {
  agent: CodingAgentName;
  command?: string;
  dryRunCommand?: string;
  envVar?: string;
}): Promise<AgentConnection> {
  const config = await readConfig();
  const connection: AgentConnection = {
    agent: input.agent,
    command: input.command,
    dryRunCommand: input.dryRunCommand,
    envVar: input.envVar,
    configuredAt: new Date().toISOString()
  };
  config.agents[input.agent] = connection;
  await writeConfig(config);
  return connection;
}

export async function listAgentConnections(): Promise<AgentConnection[]> {
  const config = await readConfig();
  const existing = Object.values(config.agents);
  const hasLocal = existing.some((connection) => connection.agent === "local");
  return hasLocal ? existing : [...defaultConnections, ...existing];
}
