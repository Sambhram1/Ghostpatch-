import { mkdir, readFile, writeFile } from "node:fs/promises";

import { ghostpatchHome, ghostpatchPath } from "../config-home.js";

export interface LivePatchResult {
  slug: string;
  repo: string;
  forkRepo?: string;
  upstreamRepo?: string;
  githubLogin?: string;
  repoDir: string;
  branch: string;
  title: string;
  body: string;
  commandLog: string[];
  reproductionLog: string[];
  changedFiles: string[];
  diffStat: string;
  diff: string;
  diffLineCount: number;
  diffBudget: number;
  testCommand: string;
  testExitCode: number;
  testOutput: string;
  agentExitCode: number;
  agentOutput: string;
  reviewWarnings: string[];
  createdAt: string;
}

function resultPath(slug: string): string {
  return ghostpatchPath("patch-results", `${slug}.json`);
}

export async function savePatchResult(result: LivePatchResult): Promise<void> {
  await mkdir(ghostpatchPath("patch-results"), { recursive: true });
  await writeFile(resultPath(result.slug), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

export async function loadPatchResult(slug: string): Promise<LivePatchResult | undefined> {
  try {
    return JSON.parse(await readFile(resultPath(slug), "utf8")) as LivePatchResult;
  } catch {
    return undefined;
  }
}
