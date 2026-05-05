# Token-First GitHub Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `gh auth login` as the primary GitHub auth path with a token-first setup flow that prompts for `GH_TOKEN` or `GITHUB_TOKEN`, validates it, saves only the variable name, and allows setup to finish when auth is not ready.

**Architecture:** Add a focused GitHub auth module that resolves and validates tokens independently of GitHub CLI. Extend Ghostpatch preferences with a `githubAuth.envVar` field, wire `ghostpatch setup` to prompt for the preferred variable name and print setup instructions, and update live GitHub flows to require a valid runtime token instead of `gh auth status`.

**Tech Stack:** TypeScript, Node.js built-in `fetch`, existing terminal prompt utilities, existing preferences store, existing test runner in `tests/run.ts`

---

### Task 1: Add GitHub auth preference storage

**Files:**
- Modify: `src/preferences/preferences-store.ts`
- Test: `tests/preferences.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing preferences test**

Add a round-trip assertion in `tests/preferences.test.ts` that saves preferences with:

```ts
githubAuth: {
  envVar: "GITHUB_TOKEN"
}
```

and verifies:

```ts
assert.deepEqual(loaded.githubAuth, { envVar: "GITHUB_TOKEN" });
```

Also add a defaulting assertion for legacy preference files:

```ts
assert.deepEqual(loaded.githubAuth, { envVar: "GH_TOKEN" });
```

- [ ] **Step 2: Run the preferences test to verify it fails**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- the preferences round-trip test fails because `githubAuth` is not part of the stored type/defaults yet

- [ ] **Step 3: Extend the preferences model**

In `src/preferences/preferences-store.ts`, add:

```ts
export interface GitHubAuthPreferences {
  envVar: "GH_TOKEN" | "GITHUB_TOKEN";
}
```

and extend `GhostpatchPreferences` plus `defaultPreferences` with:

```ts
githubAuth: {
  envVar: "GH_TOKEN"
}
```

Keep `loadPreferences()` backward compatible by merging old JSON into the new defaults.

- [ ] **Step 4: Run the tests to verify the preferences behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- preferences tests pass
- no unrelated test regressions

- [ ] **Step 5: Commit**

```bash
git add src/preferences/preferences-store.ts tests/preferences.test.ts tests/run.ts
git commit -m "feat: persist GitHub auth env var preference"
```

### Task 2: Add a dedicated token-based GitHub auth module

**Files:**
- Create: `src/github/github-auth.ts`
- Test: `tests/github-auth.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing auth-module tests**

Create `tests/github-auth.test.ts` for these behaviors:

```ts
await assert.rejects(() => validateGitHubToken("GH_TOKEN", undefined, fakeFetch), /GH_TOKEN is not set/);
assert.equal(resolveGitHubToken("GH_TOKEN", { GH_TOKEN: "abc" }).token, "abc");
assert.equal(resolveGitHubToken("GITHUB_TOKEN", { GITHUB_TOKEN: "abc" }).envVar, "GITHUB_TOKEN");
await assert.rejects(() => validateGitHubToken("GH_TOKEN", "bad", fake401Fetch), /invalid/i);
```

Use injected fetch stubs rather than live network access.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- test runner fails because `src/github/github-auth.ts` and exported helpers do not exist yet

- [ ] **Step 3: Implement the auth helper**

Create `src/github/github-auth.ts` with focused helpers:

```ts
export type GitHubTokenEnvVar = "GH_TOKEN" | "GITHUB_TOKEN";

export interface GitHubTokenStatus {
  ok: boolean;
  envVar: GitHubTokenEnvVar;
  message: string;
}

export function resolveGitHubToken(
  envVar: GitHubTokenEnvVar,
  env: NodeJS.ProcessEnv = process.env
): { envVar: GitHubTokenEnvVar; token?: string }

export async function validateGitHubToken(
  envVar: GitHubTokenEnvVar,
  token?: string,
  fetchImpl: typeof fetch = fetch
): Promise<GitHubTokenStatus>
```

Implementation rules:
- use `fetch("https://api.github.com/user")`
- send `Authorization: Bearer <token>`
- return actionable messages for missing token, HTTP 401/403, and network failure
- do not read or write any config in this module

- [ ] **Step 4: Run tests to verify the auth helper passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- new auth tests pass
- all prior tests still pass

- [ ] **Step 5: Commit**

```bash
git add src/github/github-auth.ts tests/github-auth.test.ts tests/run.ts
git commit -m "feat: add token-based GitHub auth helpers"
```

### Task 3: Update `ghostpatch setup` to prompt for the GitHub env var

**Files:**
- Modify: `src/ui/setup-wizard.ts`
- Modify: `src/ui/terminal.ts`
- Test: `tests/setup-wizard.test.ts`
- Modify: `tests/run.ts`

- [ ] **Step 1: Write the failing setup-wizard tests**

Add `tests/setup-wizard.test.ts` around a small extracted helper if needed, such as:

```ts
assert.equal(defaultGitHubEnvVarChoice(undefined), "GH_TOKEN");
assert.match(renderMissingTokenInstructions("GH_TOKEN"), /setx GH_TOKEN/);
assert.match(renderMissingTokenInstructions("GITHUB_TOKEN"), /\$env:GITHUB_TOKEN=/);
```

If `runSetupWizard()` is too coupled to current prompts, extract pure helpers from it first and test those helpers rather than trying to integration-test the full terminal session.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- setup-wizard-related tests fail because the helper functions and new flow do not exist yet

- [ ] **Step 3: Implement the setup flow**

In `src/ui/setup-wizard.ts`:
- import the new auth helpers
- prompt:

```ts
const githubEnvVar = await promptChoice("Which GitHub token variable should Ghostpatch use?", [
  { label: "GH_TOKEN", value: "GH_TOKEN" },
  { label: "GITHUB_TOKEN", value: "GITHUB_TOKEN" }
]);
```

- save:

```ts
githubAuth: {
  envVar: githubEnvVar
}
```

- validate immediately when the selected variable is set
- print concise PowerShell instructions when the variable is absent
- keep setup non-blocking when auth is missing or invalid
- replace the existing `ensureGitHubAuth()` setup check and `gh auth login` message

Only touch `src/ui/terminal.ts` if current prompt utilities need a tiny helper or formatting adjustment.

- [ ] **Step 4: Run tests to verify setup behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- setup-wizard tests pass
- preferences tests still pass with the new field

- [ ] **Step 5: Commit**

```bash
git add src/ui/setup-wizard.ts src/ui/terminal.ts tests/setup-wizard.test.ts tests/run.ts
git commit -m "feat: add token-first setup flow"
```

### Task 4: Switch live GitHub flows to runtime token auth

**Files:**
- Modify: `src/github/live-scan.ts`
- Modify: `src/github/github-cli.ts`
- Modify: `src/ui/review-session.ts`
- Test: `tests/cli-commands.test.ts`
- Test: `tests/github-auth.test.ts`

- [ ] **Step 1: Write the failing runtime-auth tests**

Add tests that assert:

```ts
await assert.rejects(() => requireConfiguredGitHubAuth({ githubAuth: { envVar: "GH_TOKEN" } }, {}), /GH_TOKEN is not set/);
```

and verify any new user-facing helper messages reference the configured variable name.

If no pure helper exists yet, extract one from live-scan setup before implementing the rest.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- runtime-auth assertion fails because live scan still depends on `gh auth status`

- [ ] **Step 3: Replace `gh auth status` dependency**

Change `src/github/live-scan.ts` to:
- load saved preferences
- resolve the configured token variable
- validate or require the runtime token before live GitHub actions begin

Refactor `src/github/github-cli.ts` so:
- `ensureGitHubAuth()` is removed or replaced with a token-based check
- GitHub API and `gh` commands can coexist, but readiness is token-driven

In `src/ui/review-session.ts`, ensure publish-related failures surface the new token guidance rather than the old CLI-login guidance if a token is missing.

- [ ] **Step 4: Run tests to verify live auth behavior passes**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- all auth and command tests pass
- no references remain to `gh auth login` in runtime error paths

- [ ] **Step 5: Commit**

```bash
git add src/github/live-scan.ts src/github/github-cli.ts src/ui/review-session.ts tests/cli-commands.test.ts tests/github-auth.test.ts
git commit -m "feat: require runtime GitHub token auth"
```

### Task 5: Update CLI help and README guidance

**Files:**
- Modify: `README.md`
- Modify: `src/cli.ts`
- Modify: `skills/ghostpatch/SKILL.md`
- Modify: `skills/ghostpatch/scripts/ghostpatch.mjs`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing documentation/help assertions**

Add or extend a CLI help test that checks help text includes token-first guidance, for example:

```ts
assert.match(parseCli(["--help"]).message, /GH_TOKEN|GITHUB_TOKEN/);
```

Do not try to snapshot the entire README. Keep automated coverage focused on help text, and verify README content manually during review.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run build
node build/tests/run.js
```

Expected:
- help-text assertion fails because CLI help does not mention token setup yet

- [ ] **Step 3: Update product and skill documentation**

In `README.md`:
- replace `gh auth login before live scan or publish`
- add a short “GitHub Auth” section with:

```powershell
$env:GH_TOKEN="your_token"
setx GH_TOKEN "your_token"
```

In `src/cli.ts` help text:
- mention that live scan/publish use `GH_TOKEN` or `GITHUB_TOKEN`
- clarify that `ghostpatch login` is for agent command configuration

In `skills/ghostpatch/SKILL.md` and `skills/ghostpatch/scripts/ghostpatch.mjs`:
- restore the tracked files first if they are missing in the worktree
- align skill instructions with token-first setup
- remove any stale `gh auth login` directions

- [ ] **Step 4: Run tests and inspect docs**

Run:

```bash
npm run build
node build/tests/run.js
```

Then manually inspect:
- `README.md`
- `skills/ghostpatch/SKILL.md`

Expected:
- tests pass
- docs consistently describe the token-first flow

- [ ] **Step 5: Commit**

```bash
git add README.md src/cli.ts skills/ghostpatch/SKILL.md skills/ghostpatch/scripts/ghostpatch.mjs tests/cli.test.ts
git commit -m "docs: document token-first GitHub auth"
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

- [ ] **Step 2: Smoke-test the terminal flow manually**

Run:

```bash
node build/src/index.js setup
node build/src/index.js --help
```

Manual checks:
- setup prompts for `GH_TOKEN` vs `GITHUB_TOKEN`
- missing-token instructions mention the selected variable
- setup can finish without a token
- help text explains token-first GitHub auth

- [ ] **Step 3: Review git diff for scope**

Run:

```bash
git status --short
git diff -- src/github src/preferences src/ui src/cli.ts tests README.md skills/ghostpatch
```

Expected:
- only auth-related files changed
- no accidental formatting churn or unrelated deletions

- [ ] **Step 4: Create the final implementation commit**

```bash
git add src/github src/preferences src/ui src/cli.ts tests README.md skills/ghostpatch
git commit -m "feat: add token-first GitHub auth setup"
```
