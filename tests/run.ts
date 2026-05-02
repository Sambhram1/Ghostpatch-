import { testOrchestratorReport } from "./orchestrator.test.js";
import { testDirectPrArtifact, testIssueArtifact } from "./social.test.js";
import { testLoginParsing, testRunAgentParsing } from "./cli.test.js";
import { testTerminalCommandParsing } from "./cli-commands.test.js";
import {
  testGitHubIssueQualification,
  testGitHubIssueQualificationRisks,
  testIssueTransformCarriesQualitySignals
} from "./github-quality.test.js";
import { testGitHubIssueTransform } from "./github-transform.test.js";
import {
  testPatchPublishBlockers,
  testPatchSafetyReview
} from "./live-review.test.js";
import { testPreferencesRoundTrip } from "./preferences.test.js";
import {
  testReportHistoryRoundTrip,
  testReviewStateRoundTrip
} from "./report-history.test.js";
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
  ["preferences round trip", testPreferencesRoundTrip],
  ["GitHub issue transform", testGitHubIssueTransform],
  ["GitHub issue qualification", testGitHubIssueQualification],
  ["GitHub issue qualification risks", testGitHubIssueQualificationRisks],
  ["GitHub issue transform quality signals", testIssueTransformCarriesQualitySignals],
  ["live review PR blockers", testPatchPublishBlockers],
  ["live patch safety review", testPatchSafetyReview],
  ["report history round trip", testReportHistoryRoundTrip],
  ["review state round trip", testReviewStateRoundTrip]
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
