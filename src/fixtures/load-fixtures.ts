import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Opportunity, OpportunitySeed } from "../types.js";

async function findRepoDir(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "src", "fixtures", "repos"),
    path.resolve(import.meta.dirname, "../../../src/fixtures/repos"),
    path.resolve(import.meta.dirname, "repos")
  ];

  for (const candidate of candidates) {
    try {
      await readdir(candidate);
      return candidate;
    } catch {
      // Try the next package layout.
    }
  }

  throw new Error("Could not find Ghostpatch fixture repository data.");
}

function toOpportunity(seed: OpportunitySeed): Opportunity {
  return {
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    repoProfile: {
      repo: seed.repo,
      language: seed.language,
      repoActivityDays: seed.repoActivityDays,
      maintainerResponseDays: seed.maintainerResponseDays,
      hasTests: seed.hasTests,
      antiBotPolicy: seed.antiBotPolicy,
      contributionGuide: seed.contributionGuide
    },
    expectedBehavior: seed.expectedBehavior,
    actualBehavior: seed.actualBehavior,
    reproductionSteps: seed.reproductionSteps,
    validationCommand: seed.validationCommand,
    patchOutline: seed.patchOutline,
    suggestedFiles: seed.suggestedFiles,
    diffRisk: seed.diffRisk,
    ambiguityRisk: seed.ambiguityRisk,
    prHint: seed.prHint,
    issueHint: seed.issueHint
  };
}

export async function loadFixtures(slug?: string): Promise<Opportunity[]> {
  const repoDir = await findRepoDir();
  const entries = await readdir(repoDir);
  const selectedEntries = entries.filter((entry) => entry.endsWith(".json"));
  const opportunities = await Promise.all(
    selectedEntries.map(async (entry) => {
      const raw = await readFile(path.join(repoDir, entry), "utf8");
      const seed = JSON.parse(raw) as OpportunitySeed;
      return toOpportunity(seed);
    })
  );

  if (!slug) {
    return opportunities;
  }

  return opportunities.filter((opportunity) => opportunity.slug === slug);
}
