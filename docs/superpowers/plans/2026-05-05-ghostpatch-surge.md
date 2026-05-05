# Ghostpatch Surge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit `ghostpatch surge` mode that continuously finds candidates, solves them, validates them, and publishes PRs automatically under strict hard limits and quality gates, without changing the default supervised Ghostpatch workflow.

**Architecture:** Introduce a dedicated Surge orchestrator that reuses existing live scan, solve, publish, fork, and PR-memory primitives. Keep Surge-specific loop control, limits, quality gating, and run-state persistence isolated in new `src/surge/*` modules, then wire a single new CLI command into `src/cli.ts` and `src/index.ts`.

**Tech Stack:** TypeScript, Node.js `fs/promises`, existing Ghostpatch CLI/runtime modules, GitHub CLI-backed integrations, existing in-repo test harness in `tests/run.ts`.

---

## File Structure

### New files

- `src/surge/types.ts`
  - Surge config, counters, stop reasons, candidate attempt records, and run-state types.
- `src/surge/surge-store.ts`
  - Persist and load Surge run history under `~/.ghostpatch/surge`.
- `src/surge/surge-gate.ts`
  - Evaluate hard publish blockers and quality-gate decisions from `Opportunity`, `LivePatchResult`, and policy signals.
- `src/surge/surge-runner.ts`
  - Own the continuous loop, stop conditions, candidate selection, solve/validate/publish flow, and run-state updates.
- `tests/surge-store.test.ts`
  - Run-state persistence coverage.
- `tests/surge-gate.test.ts`
  - Gate-pass and gate-fail coverage.
- `tests/surge-runner.test.ts`
  - Loop, stop conditions, skip/publish behavior, and integration of existing primitives through stubs.

### Modified files

- `src/cli.ts`
  - Add `surge` command parsing and help text.
- `src/index.ts`
  - Dispatch `surge` to the new orchestrator.
- `src/live/patch-result-store.ts`
  - Extend stored patch result shape if Surge needs publication metadata or reuse a helper for storing publication outcomes.
- `src/ui/review-session.ts`
  - Reuse existing publish blockers or extract a helper if needed so Surge and review share the same branch/publish checks.
- `README.md`
  - Document that Ghostpatch is supervised by default and that `ghostpatch surge` is an explicit autonomous extension with guardrails.
- `skills/ghostpatch/SKILL.md`
  - Mention the explicit Surge mode without changing the normal recommended workflow.
- `tests/cli.test.ts`
  - Cover `surge` parsing and help output.
- `tests/run.ts`
  - Register Surge tests in the test harness.

## Task 1: Add CLI Surface For Surge

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing CLI tests**

Add tests for:

```ts
const parsed = parseCli(["surge", "--max-prs", "2", "--max-runtime-minutes", "15"]);
assert.equal(parsed.command, "surge");
assert.equal(parsed.maxPrs, 2);
assert.equal(parsed.maxRuntimeMinutes, 15);
```

And help text coverage for:

```ts
assert.match(help.message, /ghostpatch surge/);
```

- [ ] **Step 2: Run the targeted CLI tests to verify failure**

Run: `npm test`
Expected: FAIL in `tests/cli.test.ts` because `surge` is not yet parsed or documented.

- [ ] **Step 3: Add the `surge` CLI option type and parser**

Implement:

- `SurgeOptions` in `src/cli.ts`
- parsing for:
  - `--max-prs`
  - `--max-runtime-minutes`
  - `--max-failures`
  - `--repo-limit`
- help text entry:

```text
ghostpatch surge [--max-prs N] [--max-runtime-minutes N] [--max-failures N] [--repo-limit N]
```

- [ ] **Step 4: Wire the new command in `src/index.ts`**

Add the branch:

```ts
if (options.command === "surge") {
  await runSurge(options);
  return;
}
```

Use a dedicated runner import from `src/surge/surge-runner.ts`.

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: CLI tests pass, later Surge tests still fail until implemented.

## Task 2: Add Surge Types And Persistence

**Files:**
- Create: `src/surge/types.ts`
- Create: `src/surge/surge-store.ts`
- Test: `tests/surge-store.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing Surge store tests**

Cover:

```ts
const state: SurgeRunState = {
  runId: "run-1",
  startedAt: "2026-05-05T00:00:00.000Z",
  status: "running",
  limits: { maxPrs: 1, maxRuntimeMinutes: 10, maxFailures: 2, repoLimit: 5 },
  counters: { reposScanned: 0, candidatesConsidered: 0, solveAttempts: 0, prsCreated: 0, failures: 0 },
  attempts: [],
  stopReason: undefined
};
```

Verify save/load round trip and listing recent runs.

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npm test`
Expected: FAIL because Surge store modules do not exist.

- [ ] **Step 3: Implement Surge run-state types**

Define focused types for:

- `SurgeLimits`
- `SurgeCounters`
- `SurgeAttemptRecord`
- `SurgeStopReason`
- `SurgeRunStatus`
- `SurgeRunState`

Keep the types isolated in `src/surge/types.ts`.

- [ ] **Step 4: Implement Surge state persistence**

In `src/surge/surge-store.ts`, add helpers like:

```ts
export async function saveSurgeRun(state: SurgeRunState): Promise<void>;
export async function loadSurgeRun(runId: string): Promise<SurgeRunState | undefined>;
export async function listSurgeRuns(): Promise<SurgeRunState[]>;
```

Store files under:

```ts
ghostpatchPath("surge", `${runId}.json`)
```

- [ ] **Step 5: Register the new tests**

Add the Surge store tests to `tests/run.ts` and rerun:

Run: `npm test`
Expected: store tests pass, runner/gate tests still fail.

## Task 3: Implement The Shared Surge Quality Gate

**Files:**
- Create: `src/surge/surge-gate.ts`
- Modify: `src/ui/review-session.ts`
- Test: `tests/surge-gate.test.ts`
- Modify: `tests/live-review.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing gate tests**

Cover at least:

- publish blocked on failed validation
- publish blocked on empty diff
- publish blocked on over-budget diff
- publish blocked on anti-bot policy signal
- publish blocked when candidate quality is below threshold
- publish allowed when all gates pass

Example:

```ts
const decision = evaluateSurgeGate(opportunity, result, { minQualityScore: 0.7 });
assert.equal(decision.allowed, false);
assert.deepEqual(decision.blockers, ["validation command failed"]);
```

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npm test`
Expected: FAIL because the gate module does not exist.

- [ ] **Step 3: Extract or share existing publish blockers**

Avoid duplicating review logic. Either:

- move `patchPublishBlockers` into a shareable helper module, or
- keep it in place and add a small exported helper that both review and Surge can call.

The important constraint is one blocker implementation, not two drifting ones.

- [ ] **Step 4: Implement the Surge gate**

In `src/surge/surge-gate.ts`, add:

```ts
export interface SurgeGateDecision {
  allowed: boolean;
  blockers: string[];
  warnings: string[];
}
```

Evaluate:

- candidate score threshold
- anti-bot policy
- agent exit code
- changed-file presence
- validation exit code
- diff budget safety
- shared publish blockers

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: gate tests pass and existing review safety tests still pass.

## Task 4: Implement The Autonomous Surge Runner

**Files:**
- Create: `src/surge/surge-runner.ts`
- Modify: `src/github/live-scan.ts`
- Modify: `src/live/solver.ts`
- Modify: `src/live/patch-result-store.ts`
- Test: `tests/surge-runner.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing runner tests**

Cover:

- run stops after `maxPrs`
- run stops after `maxFailures`
- run stops after runtime limit
- failed gate skips PR creation
- successful gate publishes PR
- run records attempts and stop reason

Use stubbed dependencies:

```ts
const scan = async () => [opportunity];
const solve = async () => result;
const publish = async () => "https://github.com/owner/repo/pull/1";
```

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npm test`
Expected: FAIL because `runSurge` does not exist.

- [ ] **Step 3: Implement the Surge runner with dependency injection**

Design the runner so the loop can be tested without real GitHub or process I/O:

```ts
export async function runSurge(options: SurgeOptions, deps = defaultSurgeDeps): Promise<SurgeRunState>
```

Default dependencies should wrap:

- `loadPreferences`
- `scanGitHubIssues`
- `solveOpportunity`
- `loadPatchResult`
- `createPullRequest`
- `findPotentialDuplicatePullRequests`
- PR-memory linking helpers
- Surge store save/load

- [ ] **Step 4: Implement the cycle flow**

Per cycle:

- load preferences and require live GitHub auth
- scan live candidates
- select the next eligible candidate not already attempted in this run
- solve locally
- evaluate gate
- if blocked, record attempt and continue
- if allowed, check for duplicate PRs
- publish PR
- link PR memory
- increment counters and persist state after each attempt

- [ ] **Step 5: Implement stop conditions**

Stop on:

- `maxPrs` reached
- `maxFailures` reached
- runtime limit reached
- no candidates available

Set a concrete `stopReason` in state for each case.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: Surge runner tests pass with stubbed dependencies.

## Task 5: Document Surge Without Changing The Default Workflow

**Files:**
- Modify: `README.md`
- Modify: `skills/ghostpatch/SKILL.md`

- [ ] **Step 1: Update README language**

Adjust the autonomy statement from:

```md
Ghostpatch is not an autonomous PR bot.
```

To language that stays accurate after Surge, for example:

```md
Ghostpatch is supervised by default. Autonomous publishing exists only in the explicit `ghostpatch surge` extension mode.
```

Also add the new command and guardrails in the CLI section and feature description.

- [ ] **Step 2: Update the skill instructions**

Mention that:

- normal agent guidance should still prefer `scan --live` then `review`
- `ghostpatch surge` is explicit and extended
- it should only be invoked when the user asks for autonomous continuous operation

- [ ] **Step 3: Run lint to verify docs-related imports and types are unaffected**

Run: `npm run lint`
Expected: PASS

## Task 6: Final Verification

**Files:**
- Verify: `src/cli.ts`
- Verify: `src/index.ts`
- Verify: `src/surge/types.ts`
- Verify: `src/surge/surge-store.ts`
- Verify: `src/surge/surge-gate.ts`
- Verify: `src/surge/surge-runner.ts`
- Verify: `README.md`
- Verify: `skills/ghostpatch/SKILL.md`
- Verify: `tests/*.test.ts`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run the typecheck/lint pass**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Smoke-check the CLI help**

Run: `node build/src/index.js help`
Expected: output includes `ghostpatch surge`.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/cli.ts src/index.ts src/surge src/ui/review-session.ts src/live/patch-result-store.ts src/github/live-scan.ts README.md skills/ghostpatch/SKILL.md tests/cli.test.ts tests/surge-store.test.ts tests/surge-gate.test.ts tests/surge-runner.test.ts tests/run.ts docs/superpowers/plans/2026-05-05-ghostpatch-surge.md
git commit -m "feat: add Ghostpatch Surge mode"
```
