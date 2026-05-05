import type { Opportunity, SupportedLanguage } from "../types.js";
import {
  ensureGitHubAuth,
  getRepoView,
  inspectRepoSignals,
  issueToOpportunity,
  listRepoIssues,
  searchReposByLanguage
} from "./github-cli.js";
import { qualifyGitHubIssue } from "./quality.js";
import type { GitHubTokenEnvVar } from "../preferences/preferences-store.js";

export interface LiveScanOptions {
  repos?: string[];
  languages: SupportedLanguage[];
  issueLimit?: number;
  autoSearch?: boolean;
  githubEnvVar?: GitHubTokenEnvVar;
  repoLimit?: number;
}

export async function scanGitHubIssues(options: LiveScanOptions): Promise<Opportunity[]> {
  await ensureGitHubAuth(options.githubEnvVar ?? "GH_TOKEN");
  const opportunities: Opportunity[] = [];
  const repos = new Set(options.repos ?? []);

  if (options.autoSearch) {
    for (const language of options.languages) {
      const discovered = await searchReposByLanguage(language);
      for (const repo of discovered) {
        repos.add(repo);
      }
    }
  }

  let scannedRepos = 0;
  for (const repoName of repos) {
    if (options.repoLimit && scannedRepos >= options.repoLimit) {
      break;
    }

    scannedRepos += 1;
    const repo = await getRepoView(repoName);
    const signals = await inspectRepoSignals(repo);
    const issues = await listRepoIssues(repoName, options.issueLimit ?? 20);
    for (const issue of issues) {
      const quality = qualifyGitHubIssue(issue, signals);
      const opportunity = issueToOpportunity(repo, issue, signals, quality);
      if (options.languages.includes(opportunity.repoProfile.language)) {
        opportunities.push(opportunity);
      }
    }
  }

  return opportunities.sort((left, right) =>
    (right.quality?.score ?? 0) - (left.quality?.score ?? 0)
  );
}
