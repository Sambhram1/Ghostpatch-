# PR Memory System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable PR memory system that preserves solve context, links it to PR identity, appends GitHub follow-up events and local notes, and provides resume context for the coding agent.

**Architecture:** Introduce a dedicated `pr-memory` store with append-only events and derived summaries. Wire it into live solve and PR creation first, then add lookup, GitHub follow-up refresh, and local-note/resume helpers so future review flows can reload a canonical memory record instead of reconstructing context from reports and patch results alone.

**Tech Stack:** TypeScript, Node.js file-based JSON persistence, existing Ghostpatch GitHub CLI integration, existing review/live solve flow, Node-based test runner

---

### Task 1: Create the PR memory store and data model

**Files:**
- Create: `src/memory/pr-memory-store.ts`
- Test: `tests/pr-memory-store.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing store tests**

Create `tests/pr-memory-store.test.ts` covering:

```ts
await savePrMemory(record);
const loaded = await loadPrMemoryBySlug("owner-project-12");
assert.equal(loaded?.slug, "owner-project-12");
assert.equal(loaded?.branch, "ghostpatch/owner-project-12");
```

Also cover lookup by:

```ts
await linkPrIdentity("owner-project-12", { prNumber: 101, prUrl: "https://github.com/owner/project/pull/101" });
assert.equal((await loadPrMemoryByPrNumber("owner/project", 101))?.slug, "owner-project-12");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- tests fail because the PR memory store does not exist yet

- [ ] **Step 3: Implement the store**

Create `src/memory/pr-memory-store.ts` with:

```ts
export interface PrMemoryEvent { ... }
export interface PrMemoryRecord { ... }
export async function savePrMemory(record: PrMemoryRecord): Promise<void>
export async function loadPrMemoryBySlug(slug: string): Promise<PrMemoryRecord | undefined>
export async function loadPrMemoryByBranch(repo: string, branch: string): Promise<PrMemoryRecord | undefined>
export async function loadPrMemoryByPrNumber(repo: string, prNumber: number): Promise<PrMemoryRecord | undefined>
export async function loadPrMemoryByPrUrl(prUrl: string): Promise<PrMemoryRecord | undefined>
export async function listPrMemory(limit?: number): Promise<PrMemoryRecord[]>
```

Implementation rules:
- store records under `~/.ghostpatch/pr-memory`
- keep repo in the identity path or lookup key to avoid branch/PR ambiguity
- persist raw events and summary in one record file
- keep the record format JSON-only and append-friendly

- [ ] **Step 4: Run the tests to verify the store passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- PR memory store tests pass
- no regressions in existing history/persistence tests

- [ ] **Step 5: Commit**

```bash
git add src/memory/pr-memory-store.ts tests/pr-memory-store.test.ts tests/run.ts
git commit -m "feat: add PR memory store"
```

### Task 2: Add event append and summary recomputation helpers

**Files:**
- Modify: `src/memory/pr-memory-store.ts`
- Test: `tests/pr-memory-store.test.ts`

- [ ] **Step 1: Write the failing event/summary tests**

Add tests for:

```ts
const updated = appendPrMemoryEvent(record, { type: "local-note", ... });
assert.equal(updated.events.at(-1)?.type, "local-note");
assert.match(updated.summary.recommendedNextAction, /note/i);
```

Also cover dedupe-sensitive behavior with two identical GitHub events and assert only one normalized event survives if that is the chosen rule.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- event and summary tests fail because append/recompute helpers are not implemented yet

- [ ] **Step 3: Implement event and summary helpers**

Add focused helpers such as:

```ts
export function appendPrMemoryEvent(record: PrMemoryRecord, event: PrMemoryEvent): PrMemoryRecord
export function recomputePrMemorySummary(record: PrMemoryRecord): PrMemoryRecord
```

Summary fields should include:
- `whatWasTried`
- `currentBlockers`
- `maintainerRequests`
- `ciFailures`
- `lastKnownStatus`
- `recommendedNextAction`

Implementation rules:
- raw event history stays authoritative
- summary is deterministic from the current record
- events remain append-only

- [ ] **Step 4: Run the tests to verify event/summary behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- updated PR memory tests pass
- summary recomputation behaves consistently

- [ ] **Step 5: Commit**

```bash
git add src/memory/pr-memory-store.ts tests/pr-memory-store.test.ts
git commit -m "feat: add PR memory events and summaries"
```

### Task 3: Write initial memory during live solve

**Files:**
- Modify: `src/live/solver.ts`
- Modify: `src/live/patch-result-store.ts`
- Modify: `src/memory/pr-memory-store.ts`
- Test: `tests/live-solver-memory.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing solve-memory tests**

Create `tests/live-solver-memory.test.ts` for extracted helpers if needed, for example:

```ts
const record = buildInitialPrMemory(opportunity, patchResult);
assert.equal(record.slug, opportunity.slug);
assert.equal(record.events[0]?.type, "solve-created");
assert.equal(record.solveContext.validationCommand, patchResult.testCommand);
```

If the live solver is too coupled for direct unit tests, extract a pure builder helper for the initial memory record.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- the solve-memory tests fail because no initial memory builder/write path exists yet

- [ ] **Step 3: Implement initial memory creation**

In `src/live/solver.ts`:
- after solving and assembling `LivePatchResult`, create or overwrite the base PR memory record for that slug/branch
- add a `solve-created` event

In `src/live/patch-result-store.ts`, keep enough fields available for later PR-linking and resume prompts.

Possible helper:

```ts
export function buildInitialPrMemory(opportunity: Opportunity, result: LivePatchResult): PrMemoryRecord
```

- [ ] **Step 4: Run the tests to verify initial memory creation passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- solve-memory tests pass
- existing live-solver behavior still compiles and tests remain green

- [ ] **Step 5: Commit**

```bash
git add src/live/solver.ts src/live/patch-result-store.ts src/memory/pr-memory-store.ts tests/live-solver-memory.test.ts tests/run.ts
git commit -m "feat: persist PR memory from live solve"
```

### Task 4: Link PR identity into memory after publish

**Files:**
- Modify: `src/ui/review-session.ts`
- Modify: `src/github/github-cli.ts`
- Modify: `src/memory/pr-memory-store.ts`
- Test: `tests/pr-memory-store.test.ts`
- Test: `tests/live-review.test.ts`

- [ ] **Step 1: Write the failing PR-link tests**

Add tests for:

```ts
const linked = linkPrMemory(record, { prNumber: 101, prUrl: "https://github.com/owner/project/pull/101" });
assert.equal(linked.prNumber, 101);
assert.equal(linked.events.at(-1)?.type, "pr-created");
```

Also add a test for parsing the created PR identity if you need a helper to derive PR number from the returned URL.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- tests fail because PR creation does not currently update memory

- [ ] **Step 3: Implement PR-linking**

In `src/ui/review-session.ts`:
- after `createPullRequest(...)` returns the PR URL, update the existing memory record for the slug/result
- add a `pr-created` event and attach:
  - `prNumber`
  - `prUrl`

If needed, add a small helper in `src/github/github-cli.ts` for PR number extraction or normalization.

- [ ] **Step 4: Run the tests to verify PR-linking passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- PR-link tests pass
- review publish flow still passes existing tests

- [ ] **Step 5: Commit**

```bash
git add src/ui/review-session.ts src/github/github-cli.ts src/memory/pr-memory-store.ts tests/pr-memory-store.test.ts tests/live-review.test.ts
git commit -m "feat: link PR identity into memory"
```

### Task 5: Add local note support and memory lookup helpers

**Files:**
- Modify: `src/memory/pr-memory-store.ts`
- Modify: `src/ui/review-session.ts`
- Test: `tests/pr-memory-store.test.ts`

- [ ] **Step 1: Write the failing local-note tests**

Add tests such as:

```ts
const updated = addLocalNote(record, "maintainer wants smaller patch");
assert.equal(updated.events.at(-1)?.type, "local-note");
assert.match(updated.events.at(-1)?.content ?? "", /smaller patch/);
```

and lookup tests for:

```ts
assert.equal((await loadPrMemoryByBranch("owner/project", "ghostpatch/owner-project-12"))?.slug, "owner-project-12");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- local-note or branch-lookup tests fail because those helpers do not exist yet

- [ ] **Step 3: Implement local notes**

Add store/helper functions such as:

```ts
export async function appendLocalPrMemoryNote(identity, note: string): Promise<PrMemoryRecord>
```

In `src/ui/review-session.ts`, add a minimal operator path only if it can be done without bloating the current action menu. If not, implement the underlying helper now and leave the UI hook for the follow-up task.

- [ ] **Step 4: Run the tests to verify local-note behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- local-note and lookup tests pass
- no regressions in existing review flow

- [ ] **Step 5: Commit**

```bash
git add src/memory/pr-memory-store.ts src/ui/review-session.ts tests/pr-memory-store.test.ts
git commit -m "feat: add local notes to PR memory"
```

### Task 6: Add GitHub follow-up refresh normalization

**Files:**
- Modify: `src/github/github-cli.ts`
- Modify: `src/memory/pr-memory-store.ts`
- Create: `src/memory/pr-memory-refresh.ts`
- Test: `tests/pr-memory-refresh.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing refresh tests**

Create `tests/pr-memory-refresh.test.ts` for normalized event transformation from GitHub payloads, for example:

```ts
const events = normalizePrFollowUp({
  comments: [...],
  reviews: [...],
  checks: [...]
});
assert.equal(events[0]?.type, "review-request-changes");
assert.equal(events.some((event) => event.type === "ci-failed"), true);
```

Do not require live GitHub access in unit tests. Normalize from mocked payloads.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- refresh tests fail because no follow-up refresh or normalization exists yet

- [ ] **Step 3: Implement follow-up refresh**

In `src/github/github-cli.ts`, add narrow fetch helpers for:
- PR comments
- review submissions/comments
- check or CI status for a PR head commit when available

In `src/memory/pr-memory-refresh.ts`, add:

```ts
export function normalizePrFollowUp(...): PrMemoryEvent[]
export async function refreshPrMemoryFromGitHub(record: PrMemoryRecord): Promise<PrMemoryRecord>
```

Implementation rules:
- normalize into append-only events
- avoid duplicate events when the same GitHub feedback is refreshed twice
- append a `resume-attempt` event when a refresh-driven resume is initiated, if that is the chosen behavior

- [ ] **Step 4: Run the tests to verify refresh behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- follow-up refresh tests pass
- no unrelated GitHub helper regressions

- [ ] **Step 5: Commit**

```bash
git add src/github/github-cli.ts src/memory/pr-memory-store.ts src/memory/pr-memory-refresh.ts tests/pr-memory-refresh.test.ts tests/run.ts
git commit -m "feat: refresh PR memory from GitHub follow-up"
```

### Task 7: Add resume-context builder for agent follow-up

**Files:**
- Create: `src/memory/pr-memory-prompt.ts`
- Modify: `src/ui/review-session.ts`
- Test: `tests/pr-memory-prompt.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing resume-prompt tests**

Create `tests/pr-memory-prompt.test.ts` with:

```ts
const prompt = buildPrMemoryResumePrompt(record);
assert.match(prompt, /what was already tried/i);
assert.match(prompt, /maintainer/i);
assert.match(prompt, /ci/i);
```

The test should verify that the prompt includes:
- original solve context
- current blockers
- maintainer requests
- next action recommendation

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- prompt-builder tests fail because no resume prompt helper exists yet

- [ ] **Step 3: Implement resume prompt builder**

Create `src/memory/pr-memory-prompt.ts` with:

```ts
export function buildPrMemoryResumePrompt(record: PrMemoryRecord): string
```

Prompt goals:
- concise enough for an agent invocation
- explicit about prior work
- explicit about follow-up obligations
- deterministic from the memory record

If a review-session entry point for “continue work on this PR” can be added cleanly now, use this helper there. Otherwise leave it as a ready integration point for the next UX pass.

- [ ] **Step 4: Run the tests to verify the prompt builder passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- prompt-builder tests pass
- all prior PR memory tests stay green

- [ ] **Step 5: Commit**

```bash
git add src/memory/pr-memory-prompt.ts src/ui/review-session.ts tests/pr-memory-prompt.test.ts tests/run.ts
git commit -m "feat: build resume prompts from PR memory"
```

### Task 8: Final verification

**Files:**
- Modify: none
- Test: existing suite

- [ ] **Step 1: Run the full validation suite**

Run:

```bash
npm test
npm run lint
```

Expected:
- build succeeds
- all tests pass
- TypeScript no-emit check passes

- [ ] **Step 2: Review persistence and scope**

Run:

```bash
git status --short
git diff -- src/memory src/github src/live src/ui tests README.md skills/ghostpatch docs/superpowers/specs/2026-05-05-pr-memory-system-design.md docs/superpowers/plans/2026-05-05-pr-memory-system.md
```

Expected:
- changes are limited to PR memory behavior, required GitHub helpers, and tests
- no accidental rewrites of unrelated scan/repro/triage logic

- [ ] **Step 3: Manual smoke-check**

Run:

```bash
node build/src/index.js review
```

Manual checks:
- solve path would create memory
- PR publish path would link PR identity
- summary/prompt helpers produce readable resume context

- [ ] **Step 4: Create the final implementation commit**

```bash
git add src/memory src/github src/live src/ui tests
git commit -m "feat: add PR memory for follow-up work"
```
