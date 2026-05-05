import { listAgentConnections } from "../agents/agent-config.js";
import { createAgentProvider } from "../agents/agent-registry.js";
import { loadFixtures } from "../fixtures/load-fixtures.js";
import { scanGitHubIssues } from "../github/live-scan.js";
import { runGhostpatch } from "../pipeline/orchestrator.js";
import { saveLatestReport } from "../reports/report-store.js";
import { renderReport } from "../report/render-report.js";
import type { Opportunity } from "../types.js";
import {
  defaultPreferences,
  loadPreferences
} from "../preferences/preferences-store.js";
import {
  ansi,
  brand,
  color,
  divider,
  printKeyValue,
  spinner,
  typeLine
} from "./terminal.js";

function filterByPreferences(opportunities: Opportunity[], languages: string[]): Opportunity[] {
  return opportunities.filter((opportunity) =>
    languages.includes(opportunity.repoProfile.language)
  );
}

function applyManualRepos(opportunities: Opportunity[], manualRepos: string[]): Opportunity[] {
  if (manualRepos.length === 0) {
    return opportunities;
  }

  const manualSet = new Set(manualRepos);
  const matched = opportunities.filter((opportunity) =>
    manualSet.has(opportunity.repoProfile.repo)
  );

  return matched.length > 0 ? matched : opportunities;
}

function applyTestCommandOverrides(
  opportunities: Opportunity[],
  overrides: Record<string, string>
): Opportunity[] {
  return opportunities.map((opportunity) => ({
    ...opportunity,
    validationCommand: overrides[opportunity.repoProfile.repo] ?? opportunity.validationCommand
  }));
}

export interface ScanSessionOptions {
  live?: boolean;
}

export async function runScanSession(options: ScanSessionOptions = {}): Promise<void> {
  brand();
  await typeLine(options.live
    ? "Scanning live GitHub issues with your saved Ghostpatch preferences."
    : "Scanning candidate repos with your saved Ghostpatch preferences.");
  divider("scan");

  const preferences = await loadPreferences();
  const effectivePreferences = preferences.setupCompletedAt ? preferences : defaultPreferences;
  const connections = await listAgentConnections();
  const connection = connections.find((item) => item.agent === effectivePreferences.agent);
  const provider = createAgentProvider(effectivePreferences.agent, connection);

  printKeyValue("agent", effectivePreferences.agent);
  printKeyValue("languages", effectivePreferences.languages.join(", "));
  printKeyValue("repo source", effectivePreferences.repoSourceMode);

  const opportunities = await spinner(options.live ? "Discovering GitHub issues" : "Loading candidate repos", async () => {
    if (!options.live) {
      return loadFixtures();
    }

    const repos = effectivePreferences.repoSourceMode === "auto"
      ? []
      : effectivePreferences.manualRepos;
    const autoSearch = effectivePreferences.repoSourceMode === "auto"
      || effectivePreferences.repoSourceMode === "both";

    if (repos.length === 0 && !autoSearch) {
      throw new Error("Live scan needs manual repos or auto-search. Run ghostpatch setup first.");
    }

    return scanGitHubIssues({
      repos,
      languages: effectivePreferences.languages,
      autoSearch,
      githubEnvVar: effectivePreferences.githubAuth.envVar
    });
  });
  const filtered = applyManualRepos(
    filterByPreferences(opportunities, effectivePreferences.languages),
    effectivePreferences.manualRepos
  );
  const withTestOverrides = applyTestCommandOverrides(filtered, effectivePreferences.repoTestCommands);
  const report = await spinner("Running Ghostpatch dry-run analysis", async () =>
    runGhostpatch(withTestOverrides, undefined, provider)
  );

  await spinner("Saving latest report", async () => saveLatestReport(report));

  divider("report");
  console.log(renderReport(report));
  console.log(`\n${color("Next:", ansi.bold)} run ${color("ghostpatch review", ansi.cyan)} to choose actions.`);
}
