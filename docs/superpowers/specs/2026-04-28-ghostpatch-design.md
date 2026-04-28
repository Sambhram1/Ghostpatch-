# Ghostpatch Design Spec

## Goal

Ghostpatch is an autonomous open-source contributor for public GitHub repositories. It discovers high-probability contribution opportunities in Python and TypeScript repos, validates them locally, decides whether to file an issue or open a pull request directly, and produces minimal fixes plus human-calibrated issue and PR text optimized for merge rate.

## Non-Goals

- Broad multi-language support in v1
- Large refactors or architectural proposals
- Aggressive automation that posts to maintainers without confidence gates
- “Growth hack” feeds or social virality features as part of the core system

## Product Outcome

The first version should prove one thing: Ghostpatch can behave like a careful human contributor strongly enough that maintainers accept its contributions on public repositories.

Primary success metrics:

- Pull request acceptance rate
- Maintainer response rate
- Percentage of candidate opportunities rejected before outreach
- Percentage of patches that pass local validation before any GitHub action

Secondary metrics:

- Median time from opportunity discovery to PR
- Issue-to-PR conversion rate
- Ratio of direct PRs to issue-first flows

## User Story

As the operator of Ghostpatch, I can point the system at public GitHub repositories and allow it to:

1. discover candidate bugs or small missing behaviors,
2. score them for merge likelihood,
3. reproduce them locally,
4. generate the smallest credible fix,
5. decide whether to open an issue first or a PR directly,
6. publish a contribution that reads like a competent human wrote it.

## V1 Scope

Ghostpatch v1 supports:

- Public GitHub repositories only
- Python and TypeScript/JavaScript repositories
- Small, testable bug fixes or narrowly scoped behavior corrections
- Local reproduction and validation before any GitHub action
- Automatic selection between `issue-first`, `direct-pr`, or `skip`
- Persistent records of every decision for auditability

Ghostpatch v1 does not support:

- Private repositories
- Repo-wide cleanup PRs
- Large feature work
- Comment-thread negotiation after maintainer feedback
- Automated merge, release, or follow-up changes

## System Architecture

Ghostpatch is a pipeline of narrowly scoped agents coordinated by an orchestration layer.

### 1. Scout

Responsible for discovering candidate repositories and opportunities.

Inputs:

- GitHub repository metadata
- Repository activity signals
- Issue tracker state
- Basic codebase indicators such as test presence and language

Outputs:

- Candidate opportunities with repo metadata and initial confidence scores

### 2. Triage

Responsible for estimating merge likelihood and rejecting weak candidates early.

Inputs:

- Candidate opportunities from Scout
- Repo norms such as contribution guide, issue template, PR history, and maintainer activity

Outputs:

- A structured decision: `proceed`, `needs-issue-first`, or `skip`
- Reason codes supporting the decision

Triage must strongly prefer:

- Active maintainers
- Existing tests or runnable validation paths
- Small diff surface area
- Low ambiguity
- Clear bug ownership

Triage must strongly reject:

- Inactive repos
- Politically charged or architectural changes
- Tasks that require product decisions
- Broken toolchains that prevent validation
- Repos with explicit anti-bot or no-drive-by-contribution norms

### 3. Repro

Responsible for confirming the problem locally before any patching or outreach.

Inputs:

- Repo clone
- Candidate issue description or inferred behavior gap

Outputs:

- Reproduction notes
- Exact commands run
- Evidence of failure or behavioral mismatch
- Confidence score for patch generation

If Repro cannot produce convincing evidence, the opportunity is skipped.

### 4. Patch

Responsible for creating the smallest fix that addresses the reproduced issue in repo-native style.

Inputs:

- Reproduction evidence
- Relevant source files and tests
- Repo conventions

Outputs:

- Patch diff
- Added or updated tests when appropriate
- Local validation results

Patch generation rules:

- Match existing patterns instead of introducing clever abstractions
- Avoid touching unrelated files
- Prefer minimal edits over idealized rewrites
- Add tests when the repo already uses tests or when the fix is too weak without them

### 5. Review

Responsible for rejecting “AI-smelling” output and over-engineered patches.

Inputs:

- Patch diff
- Issue draft
- PR draft

Outputs:

- Approved artifact set or rejection with reasons

Review checks:

- Diff size stays within configured limits
- Code matches repo conventions
- PR body is concise, specific, and non-generic
- Issue body includes exact reproduction and expected vs actual behavior
- No hedging, repetition, or templated AI phrasing

### 6. Social

Responsible for deciding the publication path and formatting the external contribution.

Decision modes:

- `direct-pr` for obvious, low-risk, validated fixes
- `issue-first` for ambiguous or behavior-sensitive problems
- `skip` when the social risk outweighs the technical confidence

Outputs:

- GitHub issue draft, PR draft, or no-op decision

## Orchestrator

The orchestrator owns end-to-end flow, state management, retries, rate limits, and safety rails.

Responsibilities:

- Persist candidate state and agent outputs
- Enforce cooldowns per repository
- Prevent duplicate work on the same opportunity
- Stop execution when confidence falls below thresholds
- Track why an opportunity was rejected

The orchestrator is the only component allowed to trigger GitHub side effects.

## Core Data Model

V1 needs explicit records for:

- `RepositoryProfile`
- `Opportunity`
- `ReproductionRun`
- `PatchAttempt`
- `ContributionDecision`
- `PublishedArtifact`

Each record should preserve enough detail to explain why Ghostpatch acted or declined to act.

## Decision Engine

The decision engine is the product moat. It must optimize for acceptance probability, not throughput.

Decision policy:

- Open a direct PR only when the bug is reproduced, the patch is minimal, the repo is active, and there is low ambiguity.
- Open an issue first when the change affects expected behavior, missing policy, or unclear intent.
- Skip when any combination of technical, social, or tooling uncertainty becomes too high.

Ghostpatch should reject far more opportunities than it pursues.

## Anti-Slop Constraints

Ghostpatch must avoid common AI failure modes.

Hard constraints:

- No generic issue or PR templates
- No broad claims unsupported by reproduction evidence
- No unnecessary abstraction in fixes
- No giant explanatory paragraphs
- No “while I was here” cleanup
- No contributions without local validation

The system should sound like a disciplined contributor, not a sales product.

## Safety Constraints

- No posting to repos with explicit rules against drive-by bot contributions
- No automatic retries after maintainer rejection without operator review
- No changes to licensing, security policy, or governance files
- No changes that require secrets or privileged infrastructure access

## Technical Shape For V1

Recommended stack:

- TypeScript for orchestration and GitHub integration
- Python worker support for Python-specific analysis and test execution helpers
- SQLite for local state in v1
- Git CLI for local repo operations
- GitHub REST/GraphQL APIs for metadata, issues, and pull requests

## Testing Strategy

V1 needs test coverage for:

- Repo qualification and rejection rules
- Issue-vs-PR decision logic
- Diff budget enforcement
- PR and issue copy generation constraints
- State-machine transitions in the orchestrator

V1 should also include fixture-based dry runs using sample repositories or recorded metadata so behavior can be validated without touching live GitHub.

## Milestones

### Milestone 1

Build a dry-run pipeline that discovers candidates, scores them, and produces a decision without touching GitHub.

### Milestone 2

Add local reproduction and patch generation against curated fixture repos.

### Milestone 3

Enable live GitHub issue and PR publication behind explicit operator approval.

## Open Questions Resolved For V1

- Target repos: public GitHub repositories
- Languages: Python and TypeScript/JavaScript
- Publication strategy: automatic choice between issue-first, direct PR, or skip
- Primary optimization: merge rate

## Acceptance Criteria

The v1 design is acceptable when Ghostpatch can:

- ingest public repo candidates,
- reject weak opportunities with explicit reason codes,
- reproduce selected bugs locally,
- generate minimal repo-style patches,
- choose issue-first versus direct PR with explicit policy,
- produce external artifacts that do not read like AI slop,
- keep a full audit trail of every decision.
