import { testOrchestratorReport } from "./orchestrator.test.js";
import { testDirectPrArtifact, testIssueArtifact } from "./social.test.js";
import {
  testDefaultGitHubEnvVarChoice,
  testRenderMissingGitHubTokenInstructions
} from "./setup-wizard.test.js";
import {
  testHelpMentionsTokenAuth,
  testLoginParsing,
  testRunAgentParsing,
  testSurgeParsing
} from "./cli.test.js";
import { testTerminalCommandParsing } from "./cli-commands.test.js";
import {
  testRequireConfiguredGitHubAuth,
  testRequireGitHubToken,
  testResolveGitHubToken,
  testValidateGitHubTokenMissing,
  testValidateGitHubTokenSuccess,
  testValidateGitHubTokenUnauthorized
} from "./github-auth.test.js";
import {
  testBuildCreatePullRequestArgs,
  testEnsureUserForkCreatesFork,
  testEnsureUserForkUsesExistingFork,
  testForkRepoName,
  testParsePullRequestNumber
} from "./github-fork.test.js";
import {
  testGitHubIssueQualification,
  testGitHubIssueQualificationRisks,
  testIssueTransformCarriesQualitySignals
} from "./github-quality.test.js";
import { testGitHubIssueTransform } from "./github-transform.test.js";
import { testBuildInitialPrMemory } from "./live-solver-memory.test.js";
import {
  testPatchPublishBlockers,
  testPatchSafetyReview,
  testRenderForkStatus
} from "./live-review.test.js";
import {
  testPreferencesLegacyDefaultGitHubAuth,
  testPreferencesRoundTrip
} from "./preferences.test.js";
import {
  testPrMemoryAppendAndLocalNote,
  testPrMemoryDedupesIdenticalEvents,
  testPrMemoryLookupByBranchAndList,
  testPrMemoryLookupByPrIdentity,
  testMergeSolvedPrMemoryPreservesPrIdentity,
  testPrMemoryStoreRoundTrip
} from "./pr-memory-store.test.js";
import { testBuildPrMemoryResumePrompt } from "./pr-memory-prompt.test.js";
import { testNormalizePrFollowUp } from "./pr-memory-refresh.test.js";
import {
  testReportHistoryRoundTrip,
  testReviewStateRoundTrip
} from "./report-history.test.js";
import {
  testDirectPrTriage,
  testIssueFirstTriage,
  testSkipTriage
} from "./triage.test.js";
import {
  testWorkspaceRemotePlan,
  testWorkspaceRepoDirName,
  testWorkspaceRepoGitUrl
} from "./workspace-manager.test.js";
import {
  testSurgeRunListing,
  testSurgeStoreRoundTrip
} from "./surge-store.test.js";
import {
  testSurgeGateAllowsCleanPatch,
  testSurgeGateBlocksAntiBotPolicy,
  testSurgeGateBlocksFailedValidation,
  testSurgeGateBlocksLowQuality
} from "./surge-gate.test.js";
import {
  testSurgePublishesAndStopsAtMaxPrs,
  testSurgeSkipsBlockedPatch,
  testSurgeStopsAtMaxFailures,
  testSurgeStopsAtRuntimeLimit
} from "./surge-runner.test.js";

const checks: Array<[string, () => Promise<void>]> = [
  ["triage direct-pr", testDirectPrTriage],
  ["triage issue-first", testIssueFirstTriage],
  ["triage skip", testSkipTriage],
  ["social PR artifact", testDirectPrArtifact],
  ["social issue artifact", testIssueArtifact],
  ["orchestrator report", testOrchestratorReport],
  ["CLI run agent parsing", testRunAgentParsing],
  ["CLI login parsing", testLoginParsing],
  ["CLI help token auth", testHelpMentionsTokenAuth],
  ["CLI surge parsing", testSurgeParsing],
  ["CLI terminal command parsing", testTerminalCommandParsing],
  ["preferences round trip", testPreferencesRoundTrip],
  ["preferences default GitHub auth", testPreferencesLegacyDefaultGitHubAuth],
  ["PR memory store round trip", testPrMemoryStoreRoundTrip],
  ["PR memory lookup by PR identity", testPrMemoryLookupByPrIdentity],
  ["PR memory lookup by branch and list", testPrMemoryLookupByBranchAndList],
  ["PR memory append and local note", testPrMemoryAppendAndLocalNote],
  ["PR memory dedupe", testPrMemoryDedupesIdenticalEvents],
  ["PR memory merge preserves PR identity", testMergeSolvedPrMemoryPreservesPrIdentity],
  ["PR memory refresh normalize", testNormalizePrFollowUp],
  ["PR memory resume prompt", testBuildPrMemoryResumePrompt],
  ["GitHub token resolve", testResolveGitHubToken],
  ["GitHub token missing", testValidateGitHubTokenMissing],
  ["GitHub token unauthorized", testValidateGitHubTokenUnauthorized],
  ["GitHub token success", testValidateGitHubTokenSuccess],
  ["GitHub token required", testRequireGitHubToken],
  ["GitHub configured token required", testRequireConfiguredGitHubAuth],
  ["GitHub fork repo name", testForkRepoName],
  ["GitHub existing fork", testEnsureUserForkUsesExistingFork],
  ["GitHub create fork", testEnsureUserForkCreatesFork],
  ["GitHub PR args", testBuildCreatePullRequestArgs],
  ["GitHub PR number parse", testParsePullRequestNumber],
  ["workspace repo dir name", testWorkspaceRepoDirName],
  ["workspace remote plan", testWorkspaceRemotePlan],
  ["workspace repo git url", testWorkspaceRepoGitUrl],
  ["setup wizard default GitHub env var", testDefaultGitHubEnvVarChoice],
  ["setup wizard missing token instructions", testRenderMissingGitHubTokenInstructions],
  ["GitHub issue transform", testGitHubIssueTransform],
  ["GitHub issue qualification", testGitHubIssueQualification],
  ["GitHub issue qualification risks", testGitHubIssueQualificationRisks],
  ["GitHub issue transform quality signals", testIssueTransformCarriesQualitySignals],
  ["live solver initial PR memory", testBuildInitialPrMemory],
  ["live review PR blockers", testPatchPublishBlockers],
  ["live patch safety review", testPatchSafetyReview],
  ["live review fork status", testRenderForkStatus],
  ["report history round trip", testReportHistoryRoundTrip],
  ["review state round trip", testReviewStateRoundTrip],
  ["surge store round trip", testSurgeStoreRoundTrip],
  ["surge run listing", testSurgeRunListing],
  ["surge gate failed validation", testSurgeGateBlocksFailedValidation],
  ["surge gate low quality", testSurgeGateBlocksLowQuality],
  ["surge gate anti bot policy", testSurgeGateBlocksAntiBotPolicy],
  ["surge gate clean patch", testSurgeGateAllowsCleanPatch],
  ["surge publish and stop", testSurgePublishesAndStopsAtMaxPrs],
  ["surge skip blocked patch", testSurgeSkipsBlockedPatch],
  ["surge stop at max failures", testSurgeStopsAtMaxFailures],
  ["surge stop at runtime limit", testSurgeStopsAtRuntimeLimit]
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
