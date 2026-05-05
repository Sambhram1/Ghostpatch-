import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import { ghostpatchPath } from "../config-home.js";
import type { SurgeRunState } from "./types.js";

function surgeDir(): string {
  return ghostpatchPath("surge");
}

function runPath(runId: string): string {
  return ghostpatchPath("surge", `${runId}.json`);
}

export async function saveSurgeRun(state: SurgeRunState): Promise<void> {
  await mkdir(surgeDir(), { recursive: true });
  await writeFile(runPath(state.runId), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function loadSurgeRun(runId: string): Promise<SurgeRunState | undefined> {
  try {
    return JSON.parse(await readFile(runPath(runId), "utf8")) as SurgeRunState;
  } catch {
    return undefined;
  }
}

export async function listSurgeRuns(): Promise<SurgeRunState[]> {
  try {
    const files = await readdir(surgeDir());
    const states = await Promise.all(files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        try {
          return JSON.parse(await readFile(ghostpatchPath("surge", file), "utf8")) as SurgeRunState;
        } catch {
          return undefined;
        }
      }));
    return states
      .filter((state): state is SurgeRunState => Boolean(state))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  } catch {
    return [];
  }
}
