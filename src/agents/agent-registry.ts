import type { CodingAgentName } from "../types.js";
import type { AgentConnection, CodingAgentProvider } from "./types.js";
import { createExternalAgent } from "./external-agent.js";
import { createLocalAgent } from "./local-agent.js";

export function createAgentProvider(
  name: CodingAgentName,
  connection?: AgentConnection
): CodingAgentProvider {
  if (name === "local") {
    return createLocalAgent();
  }

  return createExternalAgent(name, connection);
}
