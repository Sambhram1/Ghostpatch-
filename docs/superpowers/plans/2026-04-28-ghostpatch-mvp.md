# Ghostpatch MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dry-run Ghostpatch MVP that evaluates public Python and TypeScript repository opportunities, decides whether to skip, open an issue, or open a PR, and emits human-readable contribution artifacts without touching live GitHub.

**Architecture:** The MVP is a TypeScript CLI with focused pipeline modules for scout, triage, repro, review, and social decisioning. It uses fixture data instead of live GitHub calls, stores runs in memory plus JSON output, and emphasizes deterministic policy decisions over model integrations.

**Tech Stack:** TypeScript, Node.js, Vitest, tsx, ESLint, JSON fixtures

---

## File Structure

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `README.md`
- Create: `src/index.ts`
- Create: `src/cli.ts`
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `src/fixtures/load-fixtures.ts`
- Create: `src/fixtures/repos/*.json`
- Create: `src/pipeline/scout.ts`
- Create: `src/pipeline/triage.ts`
- Create: `src/pipeline/repro.ts`
- Create: `src/pipeline/patch.ts`
- Create: `src/pipeline/review.ts`
- Create: `src/pipeline/social.ts`
- Create: `src/pipeline/orchestrator.ts`
- Create: `src/report/render-report.ts`
- Create: `tests/*.test.ts`

### Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create package manifest and scripts**

Add scripts for `build`, `dev`, `start`, `test`, and `lint`.

- [ ] **Step 2: Create TypeScript config**

Target modern Node, enable strict mode, and compile from `src` to `dist`.

- [ ] **Step 3: Create Vitest config**

Set Node test environment and include `tests/**/*.test.ts`.

- [ ] **Step 4: Add ignore rules**

Ignore `node_modules`, `dist`, and generated reports.

- [ ] **Step 5: Commit bootstrap**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: bootstrap Ghostpatch TypeScript project"
```

### Task 2: Domain Types and Fixtures

**Files:**
- Create: `src/types.ts`
- Create: `src/config.ts`
- Create: `src/fixtures/load-fixtures.ts`
- Create: `src/fixtures/repos/python-fastapi-bug.json`
- Create: `src/fixtures/repos/ts-cli-regression.json`
- Create: `src/fixtures/repos/inactive-ambiguous.json`

- [ ] **Step 1: Define core domain types**

Include repo profiles, opportunities, repro results, patch plans, review verdicts, and contribution decisions.

- [ ] **Step 2: Add policy config**

Include diff budget, maintainer activity threshold, confidence thresholds, and supported languages.

- [ ] **Step 3: Write fixture loader**

Read fixture JSON files and normalize them into domain types.

- [ ] **Step 4: Create representative fixtures**

Provide one direct-PR case, one issue-first case, and one skip case.

- [ ] **Step 5: Commit domain layer**

```bash
git add src/types.ts src/config.ts src/fixtures
git commit -m "feat: add Ghostpatch domain types and fixtures"
```

### Task 3: Pipeline Modules

**Files:**
- Create: `src/pipeline/scout.ts`
- Create: `src/pipeline/triage.ts`
- Create: `src/pipeline/repro.ts`
- Create: `src/pipeline/patch.ts`
- Create: `src/pipeline/review.ts`
- Create: `src/pipeline/social.ts`

- [ ] **Step 1: Implement scout**

Transform fixtures into candidate opportunities and filter unsupported repos.

- [ ] **Step 2: Implement triage**

Score merge likelihood and emit structured reason codes.

- [ ] **Step 3: Implement repro and patch planning**

Produce deterministic local-validation evidence and patch metadata from fixture inputs.

- [ ] **Step 4: Implement review and social decisioning**

Enforce anti-slop rules and select `skip`, `issue-first`, or `direct-pr`.

- [ ] **Step 5: Commit pipeline modules**

```bash
git add src/pipeline
git commit -m "feat: implement Ghostpatch decision pipeline"
```

### Task 4: Orchestrator and CLI

**Files:**
- Create: `src/pipeline/orchestrator.ts`
- Create: `src/report/render-report.ts`
- Create: `src/cli.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Implement orchestrator**

Run fixtures through every stage and preserve an audit trail per opportunity.

- [ ] **Step 2: Render operator report**

Show repo, language, decision, reason codes, and generated issue/PR text.

- [ ] **Step 3: Wire CLI entry point**

Support `ghostpatch run` and optional `--fixture` filtering.

- [ ] **Step 4: Build once locally**

Run: `npm run build`
Expected: TypeScript compiles with no errors.

- [ ] **Step 5: Commit orchestrator**

```bash
git add src/index.ts src/cli.ts src/pipeline/orchestrator.ts src/report/render-report.ts
git commit -m "feat: add Ghostpatch CLI dry-run orchestrator"
```

### Task 5: Tests and Docs

**Files:**
- Create: `tests/triage.test.ts`
- Create: `tests/social.test.ts`
- Create: `tests/orchestrator.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write decision-logic tests**

Assert the three fixture paths: direct PR, issue first, and skip.

- [ ] **Step 2: Write orchestrator smoke test**

Assert that the report contains an audit trail for each processed fixture.

- [ ] **Step 3: Write README**

Document project goal, current MVP scope, commands, and next milestones.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit tests and docs**

```bash
git add tests README.md
git commit -m "test: cover Ghostpatch MVP decisions"
```

### Task 6: Final Verification and Publish

**Files:**
- Modify: repository git metadata

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run build
npm test
node dist/index.js run
```

Expected: build succeeds, tests pass, and CLI prints a dry-run report.

- [ ] **Step 2: Review repo status**

Run: `git status --short`
Expected: clean working tree except intended files.

- [ ] **Step 3: Rename branch and set remote**

Run:

```bash
git branch -M main
git remote add origin https://github.com/Sambhram1/Ghostpatch-.git
```

- [ ] **Step 4: Push**

Run:

```bash
git push -u origin main
```

- [ ] **Step 5: Announce verification results**

Summarize build/test status and any remaining scope limits.
