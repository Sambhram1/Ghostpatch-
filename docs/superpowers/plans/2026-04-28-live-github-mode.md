# Live GitHub Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approval-gated live GitHub issue discovery, local patching, diff reporting, and PR/issue publishing.

**Architecture:** Use GitHub CLI as the integration boundary for auth, issue listing, issue creation, repo clone, and PR creation. Keep live mutation isolated to a Ghostpatch workspace under `~/.ghostpatch/workspaces`, and reuse the terminal review session for user approval.

**Tech Stack:** TypeScript, Node.js child process, GitHub CLI, Git CLI, Codex/agent CLI

---

## Tasks

- [x] Add command runner shared by GitHub and workspace modules.
- [x] Add GitHub CLI wrapper for auth, repo view, issue list, issue create, and PR create.
- [x] Add workspace manager for clone/update, branch, diff, commit, and push.
- [x] Add live issue scanner that converts GitHub issues into Ghostpatch opportunities.
- [x] Add live solver that invokes the selected coding agent in workspace-write mode and saves patch results.
- [x] Extend review actions with approval-gated issue and PR creation.
- [x] Add CLI `scan --live` parsing and docs.
- [x] Add focused tests for parsing and transformation logic.
- [x] Verify build, tests, package dry-run, and non-mutating live command availability.

## Phase 1 Safety Hardening

- [x] Check for possible duplicate issues before `gh issue create`.
- [x] Check for possible duplicate pull requests before `gh pr create`.
- [x] Enforce clean workspace before solving and branch hygiene before PR publication.
- [x] Enforce patch diff budget before PR publication.
- [x] Review patch content for generated/sensitive files and secret-like text.
- [x] Store command, reproduction, diff, and validation logs with live patch results.
- [x] Show why a candidate was selected, commands, changed files, post body, and remaining risk in review.
- [x] Allow terminal draft title/body editing before publishing.

## Phase 2 Candidate Quality

- [x] Qualify live GitHub issues using labels, reproduction details, concrete broken behavior, and clarification-risk labels.
- [x] Inspect repository contribution-guide presence, bot/AI restrictions, common test files, and license metadata.
- [x] Attach candidate quality score, positive signals, risk signals, and safety signals to live opportunities.
- [x] Sort live candidates by quality score before review.
- [x] Fold quality score into triage confidence.
- [x] Show candidate quality comparison and “why this candidate” in review and rendered reports.

## Phase 3 Durable Workflow

- [x] Store every scan under `~/.ghostpatch/reports` while preserving `latest-report.json`.
- [x] Let review choose from recent stored scans.
- [x] Save review cursor per scan so interrupted reviews can resume.
- [x] Allow candidates to be rejected with a durable reason.
- [x] Skip rejected candidates on later review passes for the same scan.
- [x] Add per-repository validation command overrides to preferences and setup.
