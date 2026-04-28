# Terminal Onboarding Review Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a terminal-first Ghostpatch onboarding and review workflow with animated setup, saved preferences, repo input, scan reports, and user-controlled issue/PR decisions.

**Architecture:** Add focused terminal UI modules that sit above the existing pipeline. Preferences are stored alongside existing agent config, scan output is persisted locally, and review sessions present one candidate at a time without publishing anything to GitHub.

**Tech Stack:** TypeScript, Node.js readline/promises, ANSI terminal output, existing Ghostpatch pipeline

---

## File Structure

- Create: `src/preferences/preferences-store.ts`
- Create: `src/ui/terminal.ts`
- Create: `src/ui/setup-wizard.ts`
- Create: `src/ui/scan-session.ts`
- Create: `src/ui/review-session.ts`
- Create: `src/reports/report-store.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `tests/run.ts`
- Create: `tests/preferences.test.ts`
- Create: `tests/cli-commands.test.ts`

### Task 1: Preferences and Reports

**Files:**
- Create: `src/preferences/preferences-store.ts`
- Create: `src/reports/report-store.ts`
- Test: `tests/preferences.test.ts`

- [ ] **Step 1: Define preference types**

Store coding agent, preferred languages, repo source mode, manual repos, and approval mode.

- [ ] **Step 2: Persist preferences**

Read/write JSON under `GHOSTPATCH_HOME` or `~/.ghostpatch`.

- [ ] **Step 3: Persist latest scan report**

Write `latest-report.json` so `ghostpatch review` can open the last scan.

- [ ] **Step 4: Add tests**

Verify preference round-trip using a temp `GHOSTPATCH_HOME`.

### Task 2: Terminal UI Helpers

**Files:**
- Create: `src/ui/terminal.ts`

- [ ] **Step 1: Add ANSI theme helpers**

Include color, dim, bold, clear, and divider helpers.

- [ ] **Step 2: Add interactive prompts**

Implement choice, multi-choice, confirm, and text prompts.

- [ ] **Step 3: Add animations**

Implement typewriter text and spinner/progress helpers that work in normal terminals.

### Task 3: Setup Wizard

**Files:**
- Create: `src/ui/setup-wizard.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add `setup` command parsing**

Support `ghostpatch setup`.

- [ ] **Step 2: Build animated wizard**

Ask user for agent, connection command, languages, repo source, manual repos, and approval mode.

- [ ] **Step 3: Save preferences and agent config**

Use existing `saveAgentConnection` plus new preferences store.

### Task 4: Scan and Review Sessions

**Files:**
- Create: `src/ui/scan-session.ts`
- Create: `src/ui/review-session.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add `scan` and `review` command parsing**

Support `ghostpatch scan` and `ghostpatch review`.

- [ ] **Step 2: Implement scan animation**

Load fixtures for v1, apply saved language preferences, run Ghostpatch, render a concise report, and persist it.

- [ ] **Step 3: Implement review queue**

Show each candidate with recommendation and let the user choose: issue draft, solve with agent, direct PR draft, skip, or quit.

### Task 5: Tests, Docs, Publish Readiness

**Files:**
- Modify: `README.md`
- Modify: `tests/run.ts`
- Create: `tests/cli-commands.test.ts`

- [ ] **Step 1: Document install-to-first-run**

Show `npm install -g ghostpatch`, `ghostpatch setup`, `ghostpatch scan`, `ghostpatch review`.

- [ ] **Step 2: Add parser and store tests**

Cover new commands and preference persistence.

- [ ] **Step 3: Verify**

Run `npm run build`, `npm test`, `node build/src/index.js scan`, and package dry-run.
