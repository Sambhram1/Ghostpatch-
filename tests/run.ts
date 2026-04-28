import { testOrchestratorReport } from "./orchestrator.test.js";
import { testDirectPrArtifact, testIssueArtifact } from "./social.test.js";
import { testLoginParsing, testRunAgentParsing } from "./cli.test.js";
import { testTerminalCommandParsing } from "./cli-commands.test.js";
import { testPreferencesRoundTrip } from "./preferences.test.js";
import {
  testDirectPrTriage,
  testIssueFirstTriage,
  testSkipTriage
} from "./triage.test.js";

const checks: Array<[string, () => Promise<void>]> = [
  ["triage direct-pr", testDirectPrTriage],
  ["triage issue-first", testIssueFirstTriage],
  ["triage skip", testSkipTriage],
  ["social PR artifact", testDirectPrArtifact],
  ["social issue artifact", testIssueArtifact],
  ["orchestrator report", testOrchestratorReport],
  ["CLI run agent parsing", testRunAgentParsing],
  ["CLI login parsing", testLoginParsing],
  ["CLI terminal command parsing", testTerminalCommandParsing],
  ["preferences round trip", testPreferencesRoundTrip]
];

async function main(): Promise<void> {
  for (const [name, check] of checks) {
    await check();
    console.log(`PASS ${name}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
});
