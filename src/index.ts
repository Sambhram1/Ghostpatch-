#!/usr/bin/env node

import { loadFixtures } from "./fixtures/load-fixtures.js";
import { parseCli } from "./cli.js";
import { runGhostpatch } from "./pipeline/orchestrator.js";
import { renderReport } from "./report/render-report.js";
import {
  listAgentConnections,
  saveAgentConnection
} from "./agents/agent-config.js";
import { createAgentProvider } from "./agents/agent-registry.js";
import { runSetupWizard } from "./ui/setup-wizard.js";
import { runScanSession } from "./ui/scan-session.js";
import { runReviewSession } from "./ui/review-session.js";

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));

  if (options.command === "help") {
    console.log(options.message);
    return;
  }

  if (options.command === "agents") {
    const connections = await listAgentConnections();
    for (const connection of connections) {
      const provider = createAgentProvider(connection.agent, connection);
      const status = await provider.status();
      console.log(`${connection.agent}: ${status.ready ? "ready" : "not ready"} (${status.detail})`);
    }
    return;
  }

  if (options.command === "setup") {
    await runSetupWizard();
    return;
  }

  if (options.command === "scan") {
    await runScanSession({ live: options.live });
    return;
  }

  if (options.command === "review") {
    await runReviewSession();
    return;
  }

  if (options.command === "login") {
    const connection = await saveAgentConnection({
      agent: options.agent,
      command: options.commandPath,
      dryRunCommand: options.dryRunCommand,
      envVar: options.envVar
    });
    const provider = createAgentProvider(connection.agent, connection);
    const status = await provider.status();
    console.log(`${connection.agent}: ${status.ready ? "ready" : "configured"} (${status.detail})`);
    return;
  }

  const opportunities = await loadFixtures(options.fixture);
  const connection = (await listAgentConnections()).find((item) => item.agent === options.agent);
  const provider = createAgentProvider(options.agent, connection);
  const report = await runGhostpatch(opportunities, undefined, provider);
  console.log(renderReport(report));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
