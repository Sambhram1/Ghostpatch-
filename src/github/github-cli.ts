import { runCommand, requireSuccess } from "../process/command.js";
import type { CommandResult } from "../process/command.js";
import type { CandidateQuality, Opportunity, SupportedLanguage } from "../types.js";
import { requireGitHubToken } from "./github-auth.js";
import type { GitHubTokenEnvVar } from "../preferences/preferences-store.js";

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  url: string;
  labels: Array<{ name: string }>;
  updatedAt: string;
}

export interface GitHubRepoView {
  nameWithOwner: string;
  url: string;
  primaryLanguage?: {
    name: string;
  };
  pushedAt?: string;
  defaultBranchRef?: {
    name: string;
  };
  licenseInfo?: {
    name: string;
    spdxId?: string;
  };
}

export interface GitHubRepoSignals {
  contributionGuideFound: boolean;
  contributionGuideText: string;
  hasTests: boolean;
  licenseName?: string;
}

export interface GitHubSearchMatch {
  number: number;
  title: string;
  url: string;
  state?: string;
  isDraft?: boolean;
  headRefName?: string;
}

export interface GitHubPullRequestComment {
  id: number;
  body: string;
  created_at: string;
  html_url?: string;
}

export interface GitHubPullRequestReview {
  id: number;
  body?: string;
  state: string;
  submitted_at?: string;
  html_url?: string;
}

export interface GitHubCheckSummary {
  conclusion?: string | null;
  status?: string | null;
  name?: string;
  html_url?: string | null;
}

type CommandRunner = (
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number; input?: string }
) => Promise<CommandResult>;

function toSupportedLanguage(value: string | undefined): SupportedLanguage {
  const normalized = value?.toLowerCase();
  if (normalized === "python") {
    return "python";
  }

  return "typescript";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function ensureGitHubAuth(envVar: GitHubTokenEnvVar = "GH_TOKEN"): Promise<void> {
  await requireGitHubToken(envVar);
}

export function forkRepoName(login: string, upstreamRepo: string): string {
  const [, repoName] = upstreamRepo.split("/");
  if (!repoName) {
    throw new Error(`Invalid upstream repo: ${upstreamRepo}`);
  }

  return `${login}/${repoName}`;
}

export function buildCreatePullRequestArgs(
  upstreamRepo: string,
  title: string,
  body: string
): string[] {
  return [
    "pr",
    "create",
    "--repo",
    upstreamRepo,
    "--title",
    title,
    "--body",
    body
  ];
}

export function parsePullRequestNumber(prUrl: string): number | undefined {
  const match = prUrl.match(/\/pull\/(\d+)(?:\/|$)/);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

export async function getAuthenticatedGitHubLogin(
  runner: CommandRunner = runCommand
): Promise<string> {
  const result = await runner("gh", ["api", "user", "--jq", ".login"], { timeoutMs: 30000 });
  requireSuccess(result, "GitHub user lookup");
  const login = result.stdout.trim();
  if (!login) {
    throw new Error("Could not resolve authenticated GitHub login.");
  }

  return login;
}

export async function forkExists(
  forkRepo: string,
  runner: CommandRunner = runCommand
): Promise<boolean> {
  const result = await runner("gh", ["repo", "view", forkRepo, "--json", "nameWithOwner"], {
    timeoutMs: 30000
  });
  return result.exitCode === 0;
}

export async function ensureUserFork(
  upstreamRepo: string,
  runner: CommandRunner = runCommand
): Promise<{ login: string; forkRepo: string; created: boolean }> {
  const login = await getAuthenticatedGitHubLogin(runner);
  const forkRepo = forkRepoName(login, upstreamRepo);
  if (await forkExists(forkRepo, runner)) {
    return { login, forkRepo, created: false };
  }

  const result = await runner("gh", ["repo", "fork", upstreamRepo, "--remote=false"], {
    timeoutMs: 180000
  });
  requireSuccess(result, `Fork ${upstreamRepo}`);
  return { login, forkRepo, created: true };
}

export async function getRepoView(repo: string): Promise<GitHubRepoView> {
  const result = await runCommand("gh", [
    "repo",
    "view",
    repo,
    "--json",
    "nameWithOwner,url,primaryLanguage,pushedAt,defaultBranchRef,licenseInfo"
  ]);
  requireSuccess(result, `GitHub repo view ${repo}`);
  return JSON.parse(result.stdout) as GitHubRepoView;
}

export async function getRepoFileText(repo: string, filePath: string): Promise<string | undefined> {
  const result = await runCommand("gh", [
    "api",
    `repos/${repo}/contents/${filePath}`,
    "--jq",
    ".content"
  ], { timeoutMs: 30000 });

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return undefined;
  }

  return Buffer.from(result.stdout.replace(/\s/g, ""), "base64").toString("utf8");
}

export async function inspectRepoSignals(repo: GitHubRepoView): Promise<GitHubRepoSignals> {
  const guidePaths = [
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md"
  ];
  const testPaths = [
    "package.json",
    "pyproject.toml",
    "pytest.ini",
    "tox.ini",
    "tests"
  ];

  let contributionGuideText = "";
  for (const filePath of guidePaths) {
    const text = await getRepoFileText(repo.nameWithOwner, filePath);
    if (text) {
      contributionGuideText = text;
      break;
    }
  }

  let hasTests = false;
  for (const filePath of testPaths) {
    const text = await getRepoFileText(repo.nameWithOwner, filePath);
    if (text !== undefined) {
      hasTests = true;
      break;
    }
  }

  return {
    contributionGuideFound: contributionGuideText.length > 0,
    contributionGuideText,
    hasTests,
    licenseName: repo.licenseInfo?.spdxId || repo.licenseInfo?.name
  };
}

export async function listRepoIssues(repo: string, limit = 20): Promise<GitHubIssue[]> {
  const result = await runCommand("gh", [
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--limit",
    String(limit),
    "--json",
    "number,title,body,url,labels,updatedAt"
  ]);
  requireSuccess(result, `GitHub issue list ${repo}`);
  return JSON.parse(result.stdout) as GitHubIssue[];
}

export async function searchReposByLanguage(
  language: SupportedLanguage,
  limit = 5
): Promise<string[]> {
  const ghLanguage = language === "python" ? "python" : "typescript";
  const result = await runCommand("gh", [
    "search",
    "repos",
    "--language",
    ghLanguage,
    "--archived=false",
    "--good-first-issues",
    ">=1",
    "--sort",
    "updated",
    "--limit",
    String(limit),
    "--json",
    "fullName"
  ]);
  requireSuccess(result, `GitHub repo search ${language}`);
  const rows = JSON.parse(result.stdout) as Array<{ fullName: string }>;
  return rows.map((row) => row.fullName);
}

export async function createIssue(repo: string, title: string, body: string): Promise<string> {
  const result = await runCommand("gh", [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    body
  ]);
  requireSuccess(result, `GitHub issue create ${repo}`);
  return result.stdout;
}

export async function findPotentialDuplicateIssues(
  repo: string,
  title: string,
  limit = 5
): Promise<GitHubSearchMatch[]> {
  const result = await runCommand("gh", [
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--search",
    title,
    "--limit",
    String(limit),
    "--json",
    "number,title,url,state"
  ]);
  requireSuccess(result, `GitHub duplicate issue search ${repo}`);
  return JSON.parse(result.stdout) as GitHubSearchMatch[];
}

export async function findPotentialDuplicatePullRequests(
  repo: string,
  title: string,
  branch: string,
  limit = 10
): Promise<GitHubSearchMatch[]> {
  const result = await runCommand("gh", [
    "pr",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--search",
    title,
    "--limit",
    String(limit),
    "--json",
    "number,title,url,state,isDraft,headRefName"
  ]);
  requireSuccess(result, `GitHub duplicate PR search ${repo}`);
  const rows = JSON.parse(result.stdout) as GitHubSearchMatch[];
  return rows.filter((row) =>
    row.headRefName === branch
    || row.title.toLowerCase().includes(title.toLowerCase())
    || title.toLowerCase().includes(row.title.toLowerCase())
  );
}

export async function createPullRequest(
  repoDir: string,
  upstreamRepo: string,
  title: string,
  body: string
): Promise<string> {
  const result = await runCommand("gh", buildCreatePullRequestArgs(upstreamRepo, title, body), {
    cwd: repoDir
  });
  requireSuccess(result, "GitHub PR create");
  return result.stdout;
}

export async function fetchPullRequestComments(
  repo: string,
  prNumber: number
): Promise<GitHubPullRequestComment[]> {
  const result = await runCommand("gh", [
    "api",
    `repos/${repo}/issues/${prNumber}/comments`
  ], { timeoutMs: 30000 });
  requireSuccess(result, `GitHub PR comments ${repo}#${prNumber}`);
  return JSON.parse(result.stdout) as GitHubPullRequestComment[];
}

export async function fetchPullRequestReviews(
  repo: string,
  prNumber: number
): Promise<GitHubPullRequestReview[]> {
  const result = await runCommand("gh", [
    "api",
    `repos/${repo}/pulls/${prNumber}/reviews`
  ], { timeoutMs: 30000 });
  requireSuccess(result, `GitHub PR reviews ${repo}#${prNumber}`);
  return JSON.parse(result.stdout) as GitHubPullRequestReview[];
}

export async function fetchPullRequestChecks(
  repo: string,
  prNumber: number
): Promise<GitHubCheckSummary[]> {
  const headResult = await runCommand("gh", [
    "api",
    `repos/${repo}/pulls/${prNumber}`,
    "--jq",
    ".head.sha"
  ], { timeoutMs: 30000 });
  requireSuccess(headResult, `GitHub PR head ${repo}#${prNumber}`);
  const sha = headResult.stdout.trim();
  const checksResult = await runCommand("gh", [
    "api",
    `repos/${repo}/commits/${sha}/check-runs`
  ], { timeoutMs: 30000 });
  requireSuccess(checksResult, `GitHub PR checks ${repo}#${prNumber}`);
  const payload = JSON.parse(checksResult.stdout) as { check_runs?: GitHubCheckSummary[] };
  return payload.check_runs ?? [];
}

export function issueToOpportunity(
  repo: GitHubRepoView,
  issue: GitHubIssue,
  signals: GitHubRepoSignals = {
    contributionGuideFound: false,
    contributionGuideText: "",
    hasTests: true,
    licenseName: repo.licenseInfo?.spdxId || repo.licenseInfo?.name
  },
  quality?: CandidateQuality
): Opportunity {
  const labelNames = issue.labels.map((label) => label.name.toLowerCase());
  const hasBugLabel = labelNames.some((label) => label.includes("bug"));
  const language = toSupportedLanguage(repo.primaryLanguage?.name);
  const summary = issue.body?.split(/\r?\n/).find(Boolean) ?? issue.title;
  const repoActivityDays = repo.pushedAt
    ? Math.max(1, Math.round((Date.now() - Date.parse(repo.pushedAt)) / 86400000))
    : 30;

  return {
    slug: `${slugify(repo.nameWithOwner)}-${issue.number}`,
    title: issue.title,
    summary,
    repoProfile: {
      repo: repo.nameWithOwner,
      language,
      repoActivityDays,
      maintainerResponseDays: 7,
      hasTests: signals.hasTests,
      antiBotPolicy: quality?.safetySignals.some((signal) => signal.includes("restrict")) ?? false,
      contributionGuide: signals.contributionGuideFound
        ? "Contribution guide found and included in candidate qualification."
        : "Contribution guide was not found during live qualification.",
      licenseName: signals.licenseName
    },
    expectedBehavior: "The issue should be reproducible and fixed with a narrow patch.",
    actualBehavior: summary,
    reproductionSteps: [
      "Read the linked GitHub issue.",
      "Clone the repository into the Ghostpatch workspace.",
      "Ask the configured coding agent for a minimal patch."
    ],
    validationCommand: language === "python" ? "pytest" : "npm test",
    patchOutline: [
      "Inspect the issue and related source files.",
      "Make the smallest fix that addresses the reported behavior.",
      "Run the repository's relevant tests."
    ],
    suggestedFiles: [],
    prHint: `Fix ${issue.title}`,
    issueHint: issue.title,
    sourceType: "github",
    issueNumber: issue.number,
    issueUrl: issue.url,
    repoUrl: repo.url,
    quality,
    diffRisk: hasBugLabel ? 3 : 4,
    ambiguityRisk: Math.max(1, Math.min(5, hasBugLabel ? 3 : quality && quality.score >= 0.7 ? 3 : 5))
  };
}
