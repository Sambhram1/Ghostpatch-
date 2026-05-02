export type SupportedLanguage = "python" | "typescript";

export type DecisionMode = "direct-pr" | "issue-first" | "skip";

export type CodingAgentName = "local" | "codex" | "claude";

export type TriageReasonCode =
  | "supported-language"
  | "unsupported-language"
  | "active-maintainers"
  | "inactive-maintainers"
  | "tests-present"
  | "tests-missing"
  | "small-diff"
  | "large-diff"
  | "low-ambiguity"
  | "high-ambiguity"
  | "bot-hostile"
  | "bot-friendly";

export interface OpportunitySeed {
  slug: string;
  title: string;
  repo: string;
  language: SupportedLanguage;
  summary: string;
  repoActivityDays: number;
  maintainerResponseDays: number;
  hasTests: boolean;
  diffRisk: number;
  ambiguityRisk: number;
  antiBotPolicy: boolean;
  contributionGuide: string;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionSteps: string[];
  validationCommand: string;
  patchOutline: string[];
  suggestedFiles: string[];
  prHint?: string;
  issueHint?: string;
}

export interface RepositoryProfile {
  repo: string;
  language: SupportedLanguage;
  repoActivityDays: number;
  maintainerResponseDays: number;
  hasTests: boolean;
  antiBotPolicy: boolean;
  contributionGuide: string;
  licenseName?: string;
}

export interface CandidateQuality {
  score: number;
  summary: string;
  positiveSignals: string[];
  riskSignals: string[];
  safetySignals: string[];
}

export interface Opportunity {
  slug: string;
  title: string;
  summary: string;
  repoProfile: RepositoryProfile;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionSteps: string[];
  validationCommand: string;
  patchOutline: string[];
  suggestedFiles: string[];
  diffRisk: number;
  ambiguityRisk: number;
  prHint?: string;
  issueHint?: string;
  sourceType?: "fixture" | "github";
  issueNumber?: number;
  issueUrl?: string;
  repoUrl?: string;
  quality?: CandidateQuality;
}

export interface TriageResult {
  proceed: boolean;
  score: number;
  modeHint: Exclude<DecisionMode, "skip">;
  reasonCodes: TriageReasonCode[];
}

export interface ReproResult {
  confirmed: boolean;
  confidence: number;
  evidence: string[];
  validationCommand: string;
}

export interface PatchPlan {
  patchTitle: string;
  files: string[];
  outline: string[];
  diffBudget: number;
  agentName?: CodingAgentName;
  agentMode?: "deterministic" | "external-ready" | "external-dry-run";
  agentOutput?: string;
  agentExitCode?: number;
}

export interface ReviewResult {
  approved: boolean;
  aiSmellScore: number;
  warnings: string[];
}

export interface SocialArtifact {
  mode: DecisionMode;
  issueTitle?: string;
  issueBody?: string;
  prTitle?: string;
  prBody?: string;
}

export interface OpportunityRun {
  opportunity: Opportunity;
  triage: TriageResult;
  repro?: ReproResult;
  patch?: PatchPlan;
  review?: ReviewResult;
  social: SocialArtifact;
}

export interface RunReport {
  generatedAt: string;
  totalCandidates: number;
  agentName: CodingAgentName;
  runs: OpportunityRun[];
}
