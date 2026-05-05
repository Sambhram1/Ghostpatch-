import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

import { ghostpatchPath } from "../config-home.js";
import type { LivePatchResult } from "../live/patch-result-store.js";
import type { Opportunity } from "../types.js";

export type PrMemoryEventType =
  | "solve-created"
  | "pr-created"
  | "ci-failed"
  | "ci-passed"
  | "review-comment"
  | "review-request-changes"
  | "review-approved"
  | "issue-comment"
  | "local-note"
  | "resume-attempt";

export interface PrMemoryEvent {
  type: PrMemoryEventType;
  createdAt: string;
  source: "ghostpatch" | "github" | "user";
  content: string;
  githubId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PrMemorySummary {
  whatWasTried: string[];
  currentBlockers: string[];
  maintainerRequests: string[];
  ciFailures: string[];
  lastKnownStatus: string;
  recommendedNextAction: string;
}

export interface PrMemorySolveContext {
  issueTitle: string;
  issueUrl?: string;
  changedFiles: string[];
  diffStat: string;
  validationCommand: string;
  testExitCode: number;
  testOutput: string;
  agentOutput: string;
}

export interface PrMemoryRecord {
  slug: string;
  repo: string;
  branch: string;
  prNumber?: number;
  prUrl?: string;
  status: string;
  summary: PrMemorySummary;
  solveContext: PrMemorySolveContext;
  events: PrMemoryEvent[];
  createdAt: string;
  updatedAt: string;
}

function memoryDir(): string {
  return ghostpatchPath("pr-memory");
}

function slugPath(slug: string): string {
  return ghostpatchPath("pr-memory", `${slug}.json`);
}

function defaultSummary(): PrMemorySummary {
  return {
    whatWasTried: [],
    currentBlockers: [],
    maintainerRequests: [],
    ciFailures: [],
    lastKnownStatus: "new",
    recommendedNextAction: "Review the latest memory events before resuming work."
  };
}

function eventKey(event: PrMemoryEvent): string {
  return [
    event.type,
    event.githubId ?? "",
    event.createdAt,
    event.content
  ].join("|");
}

export function recomputePrMemorySummary(record: PrMemoryRecord): PrMemoryRecord {
  const summary = defaultSummary();
  summary.whatWasTried = record.events
    .filter((event) => event.type === "solve-created" || event.type === "resume-attempt")
    .map((event) => event.content);
  summary.currentBlockers = record.events
    .filter((event) => event.type === "ci-failed" || event.type === "review-request-changes")
    .map((event) => event.content);
  summary.maintainerRequests = record.events
    .filter((event) => event.type === "review-comment" || event.type === "review-request-changes" || event.type === "local-note")
    .map((event) => event.content);
  summary.ciFailures = record.events
    .filter((event) => event.type === "ci-failed")
    .map((event) => event.content);

  const last = record.events.at(-1);
  if (last) {
    summary.lastKnownStatus = last.type;
  }

  if (summary.currentBlockers.length > 0) {
    summary.recommendedNextAction = "Address the latest CI failures or maintainer requests before publishing more changes.";
  } else if (record.prNumber) {
    summary.recommendedNextAction = "Refresh GitHub follow-up and continue from the linked PR context.";
  } else if (record.events.some((event) => event.type === "local-note")) {
    summary.recommendedNextAction = "Incorporate the saved local notes into the next follow-up patch.";
  } else {
    summary.recommendedNextAction = "Review the stored solve context and continue with the next follow-up step.";
  }

  return {
    ...record,
    summary,
    updatedAt: new Date().toISOString()
  };
}

export function appendPrMemoryEvent(
  record: PrMemoryRecord,
  event: PrMemoryEvent
): PrMemoryRecord {
  const existing = new Set(record.events.map(eventKey));
  const nextEvents = existing.has(eventKey(event))
    ? record.events
    : [...record.events, event];
  return recomputePrMemorySummary({
    ...record,
    events: nextEvents
  });
}

export function linkPrMemory(
  record: PrMemoryRecord,
  identity: { prNumber: number; prUrl: string }
): PrMemoryRecord {
  return appendPrMemoryEvent({
    ...record,
    prNumber: identity.prNumber,
    prUrl: identity.prUrl,
    status: "open"
  }, {
    type: "pr-created",
    createdAt: new Date().toISOString(),
    source: "ghostpatch",
    content: `PR created: ${identity.prUrl}`,
    githubId: String(identity.prNumber)
  });
}

export function appendLocalPrMemoryNote(
  record: PrMemoryRecord,
  note: string
): PrMemoryRecord {
  return appendPrMemoryEvent(record, {
    type: "local-note",
    createdAt: new Date().toISOString(),
    source: "user",
    content: note
  });
}

export async function savePrMemory(record: PrMemoryRecord): Promise<void> {
  await mkdir(memoryDir(), { recursive: true });
  const normalized = recomputePrMemorySummary(record);
  await writeFile(slugPath(normalized.slug), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

async function loadAll(): Promise<PrMemoryRecord[]> {
  try {
    const files = (await readdir(memoryDir()))
      .filter((file) => file.endsWith(".json"))
      .sort();
    const records: PrMemoryRecord[] = [];
    for (const file of files) {
      try {
        const raw = await readFile(ghostpatchPath("pr-memory", file), "utf8");
        records.push(JSON.parse(raw) as PrMemoryRecord);
      } catch {
        // skip unreadable records
      }
    }
    return records;
  } catch {
    return [];
  }
}

export async function loadPrMemoryBySlug(slug: string): Promise<PrMemoryRecord | undefined> {
  try {
    const raw = await readFile(slugPath(slug), "utf8");
    return JSON.parse(raw) as PrMemoryRecord;
  } catch {
    return undefined;
  }
}

export async function loadPrMemoryByBranch(
  repo: string,
  branch: string
): Promise<PrMemoryRecord | undefined> {
  return (await loadAll()).find((record) => record.repo === repo && record.branch === branch);
}

export async function loadPrMemoryByPrNumber(
  repo: string,
  prNumber: number
): Promise<PrMemoryRecord | undefined> {
  return (await loadAll()).find((record) => record.repo === repo && record.prNumber === prNumber);
}

export async function loadPrMemoryByPrUrl(prUrl: string): Promise<PrMemoryRecord | undefined> {
  return (await loadAll()).find((record) => record.prUrl === prUrl);
}

export async function listPrMemory(limit = 20): Promise<PrMemoryRecord[]> {
  const all = await loadAll();
  return all
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}

export function buildInitialPrMemory(
  opportunity: Opportunity,
  result: LivePatchResult
): PrMemoryRecord {
  return recomputePrMemorySummary({
    slug: opportunity.slug,
    repo: opportunity.repoProfile.repo,
    branch: result.branch,
    status: "draft",
    summary: defaultSummary(),
    solveContext: {
      issueTitle: opportunity.title,
      issueUrl: opportunity.issueUrl,
      changedFiles: result.changedFiles,
      diffStat: result.diffStat,
      validationCommand: result.testCommand,
      testExitCode: result.testExitCode,
      testOutput: result.testOutput,
      agentOutput: result.agentOutput
    },
    events: [
      {
        type: "solve-created",
        createdAt: result.createdAt,
        source: "ghostpatch",
        content: `Created a solve patch for ${opportunity.title} on branch ${result.branch}.`
      }
    ],
    createdAt: result.createdAt,
    updatedAt: result.createdAt
  });
}

export function mergeSolvedPrMemory(
  existing: PrMemoryRecord | undefined,
  opportunity: Opportunity,
  result: LivePatchResult
): PrMemoryRecord {
  if (!existing) {
    return buildInitialPrMemory(opportunity, result);
  }

  return appendPrMemoryEvent({
    ...existing,
    branch: result.branch,
    solveContext: {
      issueTitle: opportunity.title,
      issueUrl: opportunity.issueUrl,
      changedFiles: result.changedFiles,
      diffStat: result.diffStat,
      validationCommand: result.testCommand,
      testExitCode: result.testExitCode,
      testOutput: result.testOutput,
      agentOutput: result.agentOutput
    }
  }, {
    type: "solve-created",
    createdAt: result.createdAt,
    source: "ghostpatch",
    content: `Created a follow-up solve patch for ${opportunity.title} on branch ${result.branch}.`
  });
}
