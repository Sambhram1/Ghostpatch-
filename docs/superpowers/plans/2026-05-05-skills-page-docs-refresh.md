# Ghostpatch Skills Page Docs Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Ghostpatch's public-facing skill docs so the skills.sh page is an outcome-first onboarding surface, align the repo README with that structure, and publish a fresh skills.sh release.

**Architecture:** Keep the change limited to documentation and release metadata. Treat `skills/ghostpatch/SKILL.md` as the primary public surface, mirror the same narrative in `README.md`, then push and publish a new skill release so the updated content reaches skills.sh.

**Tech Stack:** Markdown docs, Git, GitHub release flow through `gh skill publish`, existing Ghostpatch repo structure.

---

## File Structure

### New files

- `docs/superpowers/specs/2026-05-05-skills-page-docs-refresh-design.md`
  - design rationale and public-doc goals.
- `docs/superpowers/plans/2026-05-05-skills-page-docs-refresh.md`
  - implementation plan for the rewrite and release.

### Modified files

- `skills/ghostpatch/SKILL.md`
  - rewrite for skills.sh-first onboarding.
- `README.md`
  - align with the skill page structure and current behavior.
- `package.json`
  - optional version bump only if needed for release hygiene.
- `skills-lock.json`
  - updated hash after the skill file changes.

## Task 1: Rewrite SKILL.md For The Public skills.sh Page

**Files:**
- Modify: `skills/ghostpatch/SKILL.md`

- [ ] **Step 1: Replace the current top-heavy operator framing**

Lead with:

- what Ghostpatch does
- who it is for
- requirements
- install
- first run

Move internal runner details lower.

- [ ] **Step 2: Add the first-run path**

Make the shortest successful path explicit:

```bash
ghostpatch setup
ghostpatch scan --live
ghostpatch review
```

Include token-first auth setup and explain that `ghostpatch login` is for agent command config only.

- [ ] **Step 3: Add current feature coverage**

Make sure the page reflects:

- token-first GitHub auth
- fork-to-user-profile workflow
- PR memory
- explicit-only `ghostpatch surge`

- [ ] **Step 4: Keep agent notes, but move them lower**

Retain the operational rules:

- prefer `scan --live`
- use `review` for normal solve/publish
- do not bypass safety checks
- only use `surge` when the user explicitly asks

## Task 2: Align README.md With The Public Skill Page

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Match the overall structure**

Make the README track the same story as `SKILL.md`:

- what it does
- install
- first run
- workflow
- auth
- safety
- autonomous mode

- [ ] **Step 2: Keep README as the fuller companion**

Preserve project-specific detail that does not belong on the public skill page:

- npm/package distribution notes
- development commands
- publishing commands

- [ ] **Step 3: Remove wording drift**

Verify README does not contradict the live product:

- no stale `gh auth login` assumptions
- no omission of fork or PR memory behavior
- no implication that autonomous mode is default

## Task 3: Release Hygiene

**Files:**
- Modify: `package.json` if version bump is needed
- Modify: `skills-lock.json`

- [ ] **Step 1: Decide whether a version bump is needed**

If publishing the docs refresh as a new skills.sh release should also have a clean semver tag progression, bump the package version accordingly.

- [ ] **Step 2: Ensure skills lock hash is updated**

The local install or release tooling should update `skills-lock.json` after the `SKILL.md` rewrite.

## Task 4: Verification And Publish

**Files:**
- Verify: `skills/ghostpatch/SKILL.md`
- Verify: `README.md`

- [ ] **Step 1: Check the resulting docs locally**

Read both files and confirm:

- top sections are outcome-first
- first-run path is obvious
- current features are covered

- [ ] **Step 2: Commit and push**

Commit the doc refresh cleanly and push it to `main`.

- [ ] **Step 3: Publish to skills.sh**

Run:

```bash
gh skill publish --tag <new-tag>
```

Use a fresh tag so the public skill page updates from the new release.

- [ ] **Step 4: Verify the live page**

Check:

- `https://skills.sh/sambhram1/ghostpatch-/ghostpatch`
- install snippet
- rendered `SKILL.md`
- general section order and clarity
