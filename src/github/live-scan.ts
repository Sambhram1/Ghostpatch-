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

export interface LiveScanOptions {
  repos?: string[];
  languages: SupportedLanguage[];
  issueLimit?: number;
  autoSearch?: boolean;
}

export async function scanGitHubIssues(options: LiveScanOptions): Promise<Opportunity[]> {
  await ensureGitHubAuth();
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

  for (const repoName of repos) {
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
