# Ghostpatch Surge Design

## Goal

Add an explicit autonomous extension mode that continuously finds issues, solves them, validates changes, and raises pull requests without human intervention, while keeping the current Ghostpatch review flow unchanged by default.

The new mode should:

- stay completely off unless the user explicitly invokes it
- reuse the existing Ghostpatch scan, qualify, solve, fork, publish, and PR-memory systems
- run continuously until stopped or until guardrails force an exit
- publish real PRs automatically when quality gates pass
- preserve enough run history and PR memory to support later follow-up on CI or maintainer feedback

## Problem

Current Ghostpatch is designed around supervised operation:

- the user runs scan or review
- the user selects a candidate
- the user approves solve and publish actions

That is the right default, but it is not enough for the separate workflow where the user wants Ghostpatch to operate as a continuous contribution engine.

The user wants an extended mode that can:

- keep searching for eligible issues
- solve them end to end
- raise PRs automatically
- keep doing that until the user stops it

That behavior should exist as an explicit extension, not as the main Ghostpatch experience.

## Scope

V1 includes:

- a new explicit mode named `Ghostpatch Surge`
- a dedicated command such as `ghostpatch surge`
- continuous loop execution until stopped or until hard limits are reached
- automatic use of existing find, qualify, solve, fork, publish, and PR-memory flows
- strict runtime guardrails
- strict pre-publish quality gates
- separate run logging and status output for Surge activity

V1 does not include:

- background daemons that start themselves automatically
- OS-level schedulers or installers
- parallel multi-repo solving
- autonomous follow-up on already-open PRs
- default-mode behavior changes in scan or review

## Operating Model

`Ghostpatch Surge` should behave as an explicit operator command.

Suggested invocation:

```text
ghostpatch surge
```

Possible flags:

- `--max-prs <n>`
- `--max-runtime-minutes <n>`
- `--max-failures <n>`
- `--repo-limit <n>`

Rules:

- nothing in normal Ghostpatch starts Surge implicitly
- normal `scan`, `review`, and setup flows remain the primary product path
- Surge runs only for the lifetime of the invoked command
- stopping the process stops autonomous activity

## Continuous Loop

Each Surge cycle should:

1. discover candidate repositories and issues using the existing scan pipeline
2. qualify candidates using current score and policy filters
3. choose the best next eligible candidate
4. ensure the user fork and workspace are prepared
5. run the coding agent solve flow
6. run local validation
7. evaluate the quality gate
8. publish the PR automatically if the gate passes
9. write PR memory and Surge run history
10. continue to the next candidate until a stop condition is reached

If a cycle fails, Surge should record the failure, increment failure counters, and either continue or stop depending on the configured thresholds.

## Guardrails

Surge should require both hard limits and quality gates.

### Hard Limits

V1 should enforce:

- maximum PRs created in a single run
- maximum runtime in minutes
- maximum repository scan scope per cycle
- stop after repeated failures

Expected defaults should be conservative. Surge is intentionally powerful, so the initial defaults should bias toward containment rather than throughput.

### Quality Gate

A PR should only be published when all required checks pass.

V1 gate should include:

- candidate score meets minimum threshold
- local solve completed successfully
- required validation command exits successfully
- diff remains within acceptable size or safety budget
- no detected policy blocker from repo rules or anti-bot signals
- no unresolved publish prerequisite failure, such as missing fork, missing token, or dirty workspace

If the gate fails:

- do not publish
- record the reason in Surge run history
- record the solve outcome in PR memory when applicable
- continue to the next candidate unless failure limits require stopping

## Relation To Existing PR Memory

Surge should reuse the PR memory system rather than creating a parallel memory format.

Behavior:

- local solve attempts should still write or update PR memory
- successful PR publication should still link the same memory record to the PR number and URL
- later CI failures or maintainer comments can still be resumed through the existing PR-memory review flow

V1 Surge does not automatically resume old PRs. It only creates new solve attempts. Follow-up on existing PRs remains a separate user-invoked action.

## State and Logging

Surge should keep separate operational state from the normal review cursor.

Suggested stored data:

- run identifier
- start time
- current counters:
  - repos scanned
  - candidates considered
  - solve attempts
  - PRs created
  - failures
- per-cycle failure reasons
- stop reason

Suggested storage location:

- `~/.ghostpatch/surge`

This is operational run history, not a replacement for PR memory.

## CLI and UX

User-facing output should make it obvious that Surge is a different mode.

Example signals:

```text
Starting Ghostpatch Surge.
Mode: autonomous continuous publish
Limits: max-prs=3 max-runtime-minutes=120 max-failures=5 repo-limit=20
```

Per-cycle messaging should report:

- which repo or issue is being attempted
- whether the candidate passed qualification
- whether solve and validation passed
- whether a PR was published
- why a candidate was skipped or a cycle failed

Exit messaging should report:

- total PRs created
- total failures
- stop reason

## Architecture

V1 should add a dedicated orchestrator rather than pushing loop logic into the existing review session.

Suggested responsibilities:

- CLI entrypoint parses Surge flags and starts the autonomous orchestrator
- orchestrator owns run limits, counters, loop control, and stop decisions
- existing scan, solve, publish, fork, and PR-memory modules remain the execution primitives
- Surge run-state storage is isolated from review-state storage

Likely code areas:

- `src/cli.ts`
- `src/index.ts`
- new Surge orchestrator module under `src/`
- existing integrations in:
  - `src/github/*`
  - `src/live/*`
  - `src/memory/*`
  - `src/workspace/*`

## Failure Handling

Surge should fail closed rather than publishing through uncertainty.

Examples:

- token missing: stop immediately with a setup error
- fork creation failure: treat as cycle failure
- validation failure: do not publish
- duplicate-PR condition: skip candidate and continue
- repeated agent execution failures: increment failure counter and stop when threshold is reached

When a failure is ambiguous, the safe default is to skip publish.

## Testing

V1 should add focused coverage for:

- Surge CLI entry and flag parsing
- loop stop conditions
- quality-gate enforcement
- failure counter behavior
- PR publication only after passing validation
- Surge state persistence
- PR-memory integration during autonomous solves

Manual verification should also confirm:

- default Ghostpatch review flow is unchanged
- Surge creates PRs only when explicitly invoked
- stopping the command stops further autonomous activity

## Risks

Main risks:

- autonomous PR spam
- low-quality patches at scale
- maintainers rejecting automated contribution patterns
- repeated CI failures across many repos
- long-running loops that create noisy operational state

This design addresses those risks by:

- making the mode explicit only
- keeping hard limits mandatory
- keeping the publish gate strict
- preserving PR memory for later diagnosis
- isolating Surge from the default supervised workflow

## Recommendation

Implement `Ghostpatch Surge` as an explicit extension command with conservative defaults, strict publish gating, and isolated run-state tracking.

That gives the user the continuous autonomous workflow they asked for without weakening the main Ghostpatch experience or turning autonomous publishing into the default behavior.
