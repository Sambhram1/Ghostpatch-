---
name: ghostpatch
description: Use Ghostpatch to find, qualify, locally solve, review, and approval-gate open-source GitHub issue contributions with the Ghostpatch npm CLI. Trigger when a user wants an agent-assisted OSS contribution workflow, live GitHub issue scanning, candidate triage, local patch solving, PR/issue draft review, or safe publication through GitHub CLI.
---

# Ghostpatch

## Overview

Use the `ghostpatch` CLI for approval-gated open-source contribution work. Ghostpatch scans GitHub issues, scores candidate quality, runs a selected coding agent in a local workspace, stores diff/test evidence, and only publishes issues or PRs after explicit user confirmation.

## Prerequisites

- Node.js 22 or newer.
- GitHub CLI installed and authenticated with `gh auth login`.
- Optional coding agent CLI configured: `codex` or `claude`.

## Install

Prefer the published npm package:

```bash
npm install -g @sambhram06/ghostpatch
```

For repository-local use:

```bash
npm install
npm run build
node build/src/index.js scan
```

## Workflow

1. Run setup:

```bash
ghostpatch setup
```

2. Scan fixtures or live GitHub:

```bash
ghostpatch scan
ghostpatch scan --live
```

3. Review candidates:

```bash
ghostpatch review
```

4. During review, inspect the candidate quality, risks, commands, changed files, and post body before choosing any publish action.

## Safety Rules

- Never publish automatically.
- Confirm that `ghostpatch review` shows no blockers before publishing a PR.
- Treat duplicate issue/PR warnings as blocking unless the user explicitly asks to continue outside Ghostpatch.
- Keep live work inside `~/.ghostpatch/workspaces`.
- Use `draft-only` approval mode when the user wants analysis without publication.

## Useful Commands

```bash
ghostpatch agents
ghostpatch login codex --command codex
ghostpatch login claude --command claude
ghostpatch run --agent codex --fixture python-fastapi-bug
```

## Stored Data

- Preferences: `~/.ghostpatch/preferences.json`
- Agent config: `~/.ghostpatch/config.json`
- Latest report: `~/.ghostpatch/latest-report.json`
- Scan history: `~/.ghostpatch/reports`
- Review state: `~/.ghostpatch/review-state`
- Patch results: `~/.ghostpatch/patch-results`
