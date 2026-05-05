# Ghostpatch PR Memory System Design

## Goal

Add a durable memory system so Ghostpatch and the coding agent can remember what was already done to solve an issue, what PR was created, what CI or maintainer follow-up happened afterward, and how to resume work without losing context.

The new memory system should:

- persist original solve context before PR creation
- link memory across candidate slug, branch, PR number, and PR URL
- append follow-up events from GitHub and local user notes
- provide a current summary that can be used to resume agent work
- let Ghostpatch continue work after CI failures or maintainer feedback without rebuilding context from scratch

## Problem

Current Ghostpatch stores:

- scan reports
- review cursor/rejections
- patch results

That is useful, but incomplete for post-PR work.

Once a PR is created, Ghostpatch does not yet maintain a durable record of:

- what the agent tried
- why it made the patch
- what tests ran and what failed
- what maintainers later requested
- what CI checks later failed
- any local notes the user wants preserved

Without that memory, the coding agent is forced to infer or rediscover prior context during follow-up work.

## Scope

V1 includes:

- a persistent PR memory store under Ghostpatch home
- linkage by both pre-PR identity and post-PR identity:
  - slug
  - branch
  - PR number
  - PR URL
- append-only event history
- initial memory creation from live solve output
- PR-linking when a PR is created
- local note support
- GitHub follow-up refresh support for:
  - PR comments
  - review comments and review outcomes
  - CI/check status
- a generated resume summary for agent prompts

V1 does not include:

- automatic memory compression or archival policies
- cross-repository global search UX
- threaded maintainer-conversation classification beyond simple event capture
- semantic embeddings or vector search
- autonomous polling or background daemons

## Identity Model

Each memory record should support both:

### Pre-PR identity

- `slug`
- `repo`
- `branch`

### Post-PR identity

- optional `prNumber`
- optional `prUrl`

Rules:

- the same record begins life before PR creation
- PR metadata is attached later when publish succeeds
- lookup should work by slug, branch, PR number, or PR URL
- a PR should not create a second disconnected memory record if one already exists for the same slug/branch

## Data Model

Memory records should live under a new store such as:

- `~/.ghostpatch/pr-memory`

Suggested record shape:

```json
{
  "slug": "owner-project-12",
  "repo": "owner/project",
  "branch": "ghostpatch/owner-project-12",
  "prNumber": 101,
  "prUrl": "https://github.com/owner/project/pull/101",
  "status": "open",
  "summary": {
    "whatWasTried": [],
    "currentBlockers": [],
    "maintainerRequests": [],
    "recommendedNextAction": ""
  },
  "solveContext": {
    "issueTitle": "",
    "issueUrl": "",
    "changedFiles": [],
    "diffStat": "",
    "validationCommand": "",
    "testExitCode": 0,
    "testOutput": "",
    "agentOutput": ""
  },
  "events": []
}
```

The store should preserve both:

- raw event history
- derived summary

Raw events are the source of truth. The summary is a convenience view for fast resumption.

## Event Model

The event timeline should be append-only.

V1 event types:

- `solve-created`
- `pr-created`
- `ci-failed`
- `ci-passed`
- `review-comment`
- `review-request-changes`
- `review-approved`
- `issue-comment`
- `local-note`
- `resume-attempt`

Each event should include:

- `type`
- `createdAt`
- relevant GitHub identifiers when available
- concise content or normalized payload
- source marker such as `ghostpatch`, `github`, or `user`

## User Flow

### Initial Solve

1. User chooses solve in Ghostpatch review.
2. Ghostpatch writes an initial memory record after local solve completes.
3. That record contains:
   - issue identity
   - repo and branch
   - changed files
   - validation/test results
   - agent output summary
   - an initial `solve-created` event

### PR Creation

1. User confirms PR publication.
2. Ghostpatch creates the PR.
3. Ghostpatch updates the existing memory record with:
   - PR number
   - PR URL
   - `pr-created` event

### Follow-up Resume

1. User asks Ghostpatch to continue work on the same issue or PR.
2. Ghostpatch loads the existing memory by slug, branch, PR number, or PR URL.
3. Ghostpatch refreshes GitHub follow-up context:
   - PR comments
   - review submissions/comments
   - check or CI status
4. Ghostpatch appends any newly observed events.
5. Ghostpatch recomputes the summary.
6. Ghostpatch builds a resume prompt for the coding agent from:
   - original solve context
   - current summary
   - newly observed follow-up events

### Local Note Flow

User can append a local note such as:

- “maintainer wants a smaller patch”
- “CI failure is Windows-only”
- “ignore flaky integration test until maintainer confirms”

That note becomes a `local-note` event in the same memory timeline.

## Summary Model

Ghostpatch should maintain a derived working summary from the event history.

Suggested summary fields:

- `whatWasTried`
- `currentBlockers`
- `maintainerRequests`
- `ciFailures`
- `lastKnownStatus`
- `recommendedNextAction`

Summary goals:

- reduce prompt size for resumption
- preserve operator readability
- never replace the raw event history

## GitHub Follow-up Integration

Ghostpatch should gather follow-up context on demand rather than through background polling.

V1 refresh should inspect:

- PR conversation comments
- review submissions and review comments
- review state such as approval or changes requested
- CI/check status for the PR head commit when available

Expected outcomes:

- no new events: memory remains unchanged except optional `resume-attempt`
- new review feedback: append normalized review events
- failed checks: append `ci-failed`
- passing checks after prior failures: append `ci-passed`

## CLI and UX Changes

Ghostpatch should gain a follow-up-oriented path in review or another explicit resume command in a later iteration. For V1, the important behavior is that resume-capable memory exists and can be loaded when the user asks to continue a known PR or candidate.

User-facing messaging should include short signals such as:

```text
Loading memory for owner/project ghostpatch/owner-project-12.
Refreshing PR comments, reviews, and CI status.
Found 2 new follow-up events since the last solve.
```

For local notes:

```text
Saved local note to PR memory.
```

## Testing

Add or update tests for:

- memory record creation from live solve output
- memory linkage after PR creation
- lookup by slug, branch, PR number, and PR URL
- append-only event behavior
- local note insertion
- summary recomputation after new events
- graceful behavior when GitHub follow-up fetch returns no new events

Prefer pure store tests and normalized event transformation tests over live GitHub interaction in unit tests.

## Risks

- repeated refreshes may duplicate events unless deduplication rules are explicit
- summary generation may omit important nuance if it becomes too aggressive
- PR lookup can be ambiguous if branch names are reused across repositories unless repo is always part of identity
- CI history can be noisy, so event normalization must avoid overwhelming the memory record

## Recommendation

Implement an append-only PR memory record linked across both pre-PR and post-PR identities, then use that memory as the canonical resume context for CI failures, maintainer feedback, and user notes.
