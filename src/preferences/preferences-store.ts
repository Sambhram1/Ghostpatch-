import { mkdir, readFile, writeFile } from "node:fs/promises";

import { ghostpatchHome, ghostpatchPath } from "../config-home.js";
import type { CodingAgentName, SupportedLanguage } from "../types.js";

export type RepoSourceMode = "auto" | "manual" | "both";
export type ApprovalMode = "always-ask" | "draft-only";

export interface GhostpatchPreferences {
  agent: CodingAgentName;
  languages: SupportedLanguage[];
  repoSourceMode: RepoSourceMode;
  manualRepos: string[];
  repoTestCommands: Record<string, string>;
  approvalMode: ApprovalMode;
  setupCompletedAt?: string;
}

export const defaultPreferences: GhostpatchPreferences = {
  agent: "local",
  languages: ["python", "typescript"],
  repoSourceMode: "manual",
  manualRepos: [],
  repoTestCommands: {},
  approvalMode: "always-ask"
};

function preferencesPath(): string {
  return ghostpatchPath("preferences.json");
}

export async function loadPreferences(): Promise<GhostpatchPreferences> {
  try {
    const raw = await readFile(preferencesPath(), "utf8");
    return {
      ...defaultPreferences,
      ...(JSON.parse(raw) as Partial<GhostpatchPreferences>)
    };
  } catch {
    return defaultPreferences;
  }
}

export async function savePreferences(
  preferences: GhostpatchPreferences
): Promise<GhostpatchPreferences> {
  await mkdir(ghostpatchHome(), { recursive: true });
  await writeFile(preferencesPath(), `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
  return preferences;
}
