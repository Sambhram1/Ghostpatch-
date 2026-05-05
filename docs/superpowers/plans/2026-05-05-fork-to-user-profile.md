# Fork-to-User-Profile Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ghostpatch fork a selected GitHub repository into the authenticated user's profile, configure the local workspace to use that fork as `origin`, and create PRs back to the original upstream repository.

**Architecture:** Add focused GitHub fork helpers for login detection, fork existence checks, and fork creation. Extend the workspace manager with a repo-preparation path that guarantees `origin = fork` and `upstream = original`, then thread that prepared workspace through solve, branch checks, push, and PR creation.

**Tech Stack:** TypeScript, Node.js, GitHub CLI (`gh`), git CLI, existing Ghostpatch terminal/review flow, existing Node-based test runner

---

### Task 1: Add GitHub fork helper functions

**Files:**
- Modify: `src/github/github-cli.ts`
- Test: `tests/github-fork.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing fork-helper tests**

Create `tests/github-fork.test.ts` with pure or stubbed behaviors for:

```ts
assert.equal(forkRepoName("octocat", "owner/project"), "octocat/project");
await assert.rejects(() => requireForkInfo("owner/project", fakeFailingRunner), /could not resolve/i);
```

Also cover a fork-exists path and a fork-create-needed path using injected command runners or extracted parsers rather than live GitHub calls.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- new fork-helper tests fail because the helper functions do not exist yet

- [ ] **Step 3: Implement fork helpers**

In `src/github/github-cli.ts`, add focused helpers such as:

```ts
export function forkRepoName(login: string, upstreamRepo: string): string
export async function getAuthenticatedGitHubLogin(): Promise<string>
export async function forkExists(forkRepo: string): Promise<boolean>
export async function ensureUserFork(upstreamRepo: string): Promise<{ login: string; forkRepo: string }>
```

Implementation rules:
- use `gh api user` or equivalent to resolve login
- derive `<login>/<repo-name>` from the upstream repo
- check existence before forking
- create the fork only when absent
- surface direct errors when login or fork creation fails

- [ ] **Step 4: Run the tests to verify fork helpers pass**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- new fork-helper tests pass
- no regressions in existing tests

- [ ] **Step 5: Commit**

```bash
git add src/github/github-cli.ts tests/github-fork.test.ts tests/run.ts
git commit -m "feat: add GitHub fork helpers"
```

### Task 2: Add workspace remote preparation for fork-based repos

**Files:**
- Modify: `src/workspace/workspace-manager.ts`
- Test: `tests/workspace-manager.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing workspace tests**

Create `tests/workspace-manager.test.ts` around small extracted helpers that do not require a real git repo yet, for example:

```ts
assert.equal(repoDirName("owner/project"), "owner__project");
assert.deepEqual(desiredRemotes("owner/project", "octocat/project"), {
  originRepo: "octocat/project",
  upstreamRepo: "owner/project"
});
```

If needed, extract a command-plan helper that returns the git commands required for:
- new fork clone
- existing upstream-only workspace migration
- already-correct fork workspace

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- workspace-manager tests fail because the new helper or preparation path does not exist yet

- [ ] **Step 3: Implement workspace preparation**

In `src/workspace/workspace-manager.ts`, add a new preparation function, for example:

```ts
export interface PreparedWorkspace {
  repoDir: string;
  originRepo: string;
  upstreamRepo: string;
}

export async function prepareForkedWorkspace(
  upstreamRepo: string,
  forkRepo: string
): Promise<PreparedWorkspace>
```

Behavior:
- clone the fork if the workspace does not exist
- if the workspace exists, require it to be clean before remote mutation
- set `origin` to the fork remote URL
- set or update `upstream` to the upstream remote URL
- fetch `origin` and `upstream`

Keep `remoteBranchExists()` and `pushBranch()` operating against `origin`.

- [ ] **Step 4: Run the tests to verify workspace preparation passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- workspace-manager tests pass
- no existing branch/push tests regress

- [ ] **Step 5: Commit**

```bash
git add src/workspace/workspace-manager.ts tests/workspace-manager.test.ts tests/run.ts
git commit -m "feat: prepare fork-based workspaces"
```

### Task 3: Use fork preparation in live solve flow

**Files:**
- Modify: `src/live/solver.ts`
- Modify: `src/live/patch-result-store.ts`
- Test: `tests/live-solver.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing live-solver tests**

Create `tests/live-solver.test.ts` around any extracted pure helpers first, for example:

```ts
assert.match(renderCommandLogEntry("fork", "octocat/project"), /octocat\/project/);
```

If the existing solver is too coupled for direct tests, extract helper functions for:
- command-log generation
- prepared workspace metadata shaping
- PR repo target selection

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- new live-solver tests fail because fork metadata and logging are not implemented yet

- [ ] **Step 3: Update solver to prepare the fork before branch work**

In `src/live/solver.ts`:
- call `ensureUserFork()` for the selected repo
- call `prepareForkedWorkspace()` instead of `cloneOrUpdateRepo()`
- keep clean-workspace enforcement before edits
- include fork/upstream details in command logs

In `src/live/patch-result-store.ts`, extend `LivePatchResult` with metadata needed later in review/publish:

```ts
forkRepo?: string;
upstreamRepo?: string;
githubLogin?: string;
```

Store those fields when saving patch results.

- [ ] **Step 4: Run the tests to verify solve flow passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- live-solver tests pass
- existing patch-result consumers still compile and tests remain green

- [ ] **Step 5: Commit**

```bash
git add src/live/solver.ts src/live/patch-result-store.ts tests/live-solver.test.ts tests/run.ts
git commit -m "feat: prepare forks before live solve"
```

### Task 4: Update review flow and PR creation for upstream-targeted forks

**Files:**
- Modify: `src/ui/review-session.ts`
- Modify: `src/github/github-cli.ts`
- Test: `tests/live-review.test.ts`
- Test: `tests/github-fork.test.ts`

- [ ] **Step 1: Write the failing review/PR tests**

Add tests covering:

```ts
assert.match(renderForkStatus("octocat/project", "owner/project"), /origin=octocat\/project/);
```

and a PR creation path that requires explicit upstream targeting, for example by testing an extracted helper that builds `gh pr create` args with `--repo owner/project`.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- tests fail because PR creation currently relies on implicit repo context

- [ ] **Step 3: Make upstream PR targeting explicit**

In `src/github/github-cli.ts`, update PR creation to accept an explicit upstream repo:

```ts
export async function createPullRequest(
  repoDir: string,
  upstreamRepo: string,
  title: string,
  body: string
): Promise<string>
```

Use `gh pr create --repo <upstreamRepo>`.

In `src/ui/review-session.ts`:
- show fork preparation status in solve preview and/or patch summary
- when publishing a PR, use `result.upstreamRepo ?? result.repo`
- keep duplicate-PR checks aligned with the upstream target while branch checks still use fork `origin`

- [ ] **Step 4: Run the tests to verify review/PR behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- PR creation tests pass
- review tests still pass
- no regressions in duplicate-check or branch-blocker behavior

- [ ] **Step 5: Commit**

```bash
git add src/ui/review-session.ts src/github/github-cli.ts tests/live-review.test.ts tests/github-fork.test.ts
git commit -m "feat: target upstream repos from user forks"
```

### Task 5: Update docs and operator messaging

**Files:**
- Modify: `README.md`
- Modify: `skills/ghostpatch/SKILL.md`
- Modify: `src/ui/review-session.ts`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing messaging assertion**

If help text or a small formatter helper is introduced, add a test asserting fork behavior is described, for example:

```ts
assert.match(helpTextOrMessage, /fork/i);
```

Do not try to snapshot the entire README. Keep automated coverage focused on stable messaging helpers when possible.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- the new messaging assertion fails until the text is updated

- [ ] **Step 3: Update docs and terminal copy**

In `README.md`:
- explain that Ghostpatch forks selected live-work repos into the authenticated user's profile
- explain that workspaces use fork `origin` and upstream `upstream`

In `skills/ghostpatch/SKILL.md`:
- update the operator workflow to mention automatic fork creation before local solve and PR publication

In `src/ui/review-session.ts`:
- update solve preview text so it no longer implies direct upstream clone only

- [ ] **Step 4: Run tests and manually inspect docs**

Run:

```bash
npm run build
node build/tests/run.js
```

Then inspect:
- `README.md`
- `skills/ghostpatch/SKILL.md`

Expected:
- tests pass
- docs consistently describe the fork-first workflow

- [ ] **Step 5: Commit**

```bash
git add README.md skills/ghostpatch/SKILL.md src/ui/review-session.ts tests/cli.test.ts
git commit -m "docs: describe fork-first contribution flow"
```

### Task 6: Final verification

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

- [ ] **Step 2: Smoke-test the live flow manually**

Run:

```bash
node build/src/index.js review
```

Manual checks:
- GitHub candidate solve path reports fork check/creation
- workspace messages mention fork/upstream remotes
- PR publish path targets upstream explicitly

- [ ] **Step 3: Review git diff for scope**

Run:

```bash
git status --short
git diff -- src/github src/workspace src/live src/ui tests README.md skills/ghostpatch docs/superpowers/plans/2026-05-05-fork-to-user-profile.md docs/superpowers/specs/2026-05-05-fork-to-user-profile-design.md
```

Expected:
- changes are limited to fork-management behavior, docs, and tests
- no unrelated auth regressions or workspace churn

- [ ] **Step 4: Create the final implementation commit**

```bash
git add src/github src/workspace src/live src/ui tests README.md skills/ghostpatch
git commit -m "feat: fork selected repos to the user profile"
```
