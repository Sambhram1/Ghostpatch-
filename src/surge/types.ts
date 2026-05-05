export interface SurgeLimits {
  maxPrs: number;
  maxRuntimeMinutes: number;
  maxFailures: number;
  repoLimit: number;
  minQualityScore: number;
}

export interface SurgeCounters {
  reposScanned: number;
  candidatesConsidered: number;
  solveAttempts: number;
  prsCreated: number;
  failures: number;
}

export type SurgeAttemptStatus = "published" | "skipped" | "failed";

export interface SurgeAttemptRecord {
  slug: string;
  repo: string;
  title: string;
  branch?: string;
  status: SurgeAttemptStatus;
  startedAt: string;
  completedAt: string;
  blockers: string[];
  warnings: string[];
  prUrl?: string;
  failure?: string;
}

export type SurgeStopReason =
  | "max-prs-reached"
  | "max-runtime-reached"
  | "max-failures-reached"
  | "no-candidates"
  | "auth-failed"
  | "scan-failed";

export type SurgeRunStatus = "running" | "completed" | "failed";

export interface SurgeRunState {
  runId: string;
  startedAt: string;
  updatedAt: string;
  status: SurgeRunStatus;
  limits: SurgeLimits;
  counters: SurgeCounters;
  attempts: SurgeAttemptRecord[];
  stopReason?: SurgeStopReason;
}

export const defaultSurgeLimits: SurgeLimits = {
  maxPrs: 3,
  maxRuntimeMinutes: 120,
  maxFailures: 5,
  repoLimit: 20,
  minQualityScore: 0.78
};
