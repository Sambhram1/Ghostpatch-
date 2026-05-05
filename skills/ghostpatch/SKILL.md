---
name: ghostpatch
description: Use Ghostpatch as an agent-native open-source contribution plugin for Codex, Claude Code, and other coding agents. Trigger when a user wants the agent to find repositories, discover GitHub issues, qualify candidates, solve issues locally, review diffs/tests, and raise approval-gated pull requests using the Ghostpatch workflow.
license: MIT
---

# Ghostpatch

Ghostpatch helps an agent do supervised open-source contribution work end to end.

It can:

- find GitHub issues worth solving
- qualify candidates before spending time on them
- solve locally with Codex, Claude, or a local deterministic agent
- run validation commands
- create or reuse your fork for live contribution work
- prepare or publish issues and PRs with safety checks
- remember prior PR context for CI failures and maintainer follow-up

The skill is the main interface. The npm package `@sambhram06/ghostpatch` is the engine behind it.

## Who It Is For

Use Ghostpatch when you want:

- supervised help contributing to open-source repositories
- a repeatable scan -> review -> solve -> publish workflow
- explicit autonomous mode only when you ask for it

## Requirements

- Node.js 22 or newer
- Git
- GitHub CLI
- `GH_TOKEN` or `GITHUB_TOKEN` for live GitHub scan and publish
- Optional: Codex CLI or Claude CLI

## Install

Install the skill from skills.sh:

```bash
npx skills add https://github.com/Sambhram1/Ghostpatch- --skill ghostpatch
```

Optional but faster engine install:

```bash
npm install -g @sambhram06/ghostpatch
```

## First Run

The shortest successful path is:

```bash
ghostpatch setup
ghostpatch scan --live
ghostpatch review
```

What happens in setup:

- choose your agent: `local`, `codex`, or `claude`
- choose languages and repositories
- choose whether to use `GH_TOKEN` or `GITHUB_TOKEN`
- validate the token if it is already present
- save only the variable name, not the token itself

If the skill runner path is needed directly:

```bash
node <skill-folder>/scripts/ghostpatch.mjs setup
node <skill-folder>/scripts/ghostpatch.mjs scan --live
node <skill-folder>/scripts/ghostpatch.mjs review
```

## Normal Workflow

Ghostpatch's default workflow is supervised:

1. scan for candidates
2. review the ranked opportunities
3. ask the configured agent to solve locally
4. run validation
5. inspect blockers, warnings, and generated drafts
6. publish only after explicit confirmation

For live solve work, Ghostpatch:

- creates or reuses your GitHub fork
- uses your fork as `origin`
- keeps the original repository as `upstream`
- works in a local workspace under `~/.ghostpatch/workspaces`

If CI fails later or maintainers ask for changes, Ghostpatch can resume from stored PR memory instead of rebuilding context from scratch.

## GitHub Auth

Ghostpatch uses token-first GitHub auth.

Set one of these before live scan or publish:

```powershell
$env:GH_TOKEN="your_token"
```

or:

```powershell
$env:GITHUB_TOKEN="your_token"
```

`ghostpatch login` is only for configuring the coding agent command. It does not configure GitHub auth.

## Safety Model

Ghostpatch is supervised by default. It is not a blind PR bot.

Before publication, Ghostpatch checks for:

- no changed files
- failed agent execution
- failed validation command
- over-budget diffs
- duplicate issues or PRs
- dirty workspaces
- unexpected branch state
- generated or sensitive files that need review

During review, Ghostpatch shows:

- why the candidate was selected
- candidate quality score
- quality risks and safety signals
- changed files
- validation results
- blockers and remaining risk
- exact issue or PR text before posting

## Autonomous Mode

Ghostpatch also has an explicit autonomous extension:

```bash
ghostpatch surge --max-prs 1 --max-runtime-minutes 30
```

Use `ghostpatch surge` only when the user explicitly asks for continuous find -> solve -> publish operation.

Surge is not the default workflow. It still applies hard limits and quality gates before publishing.

## Common Commands

```bash
ghostpatch setup
ghostpatch agents
ghostpatch scan
ghostpatch scan --live
ghostpatch review
ghostpatch surge --max-prs 1 --max-runtime-minutes 30
ghostpatch run --agent codex --fixture python-fastapi-bug
```

If the skill folder must be invoked directly:

```bash
node <skill-folder>/scripts/ghostpatch.mjs --help
```

The bundled runner first tries a local `ghostpatch` binary. If it is not available, it falls back to:

```bash
npx --yes @sambhram06/ghostpatch <args>
```

Set `GHOSTPATCH_CLI` to force a specific executable.

## Stored Data

- Preferences: `~/.ghostpatch/preferences.json`
- Agent config: `~/.ghostpatch/config.json`
- Latest report: `~/.ghostpatch/latest-report.json`
- Scan history: `~/.ghostpatch/reports`
- Review state: `~/.ghostpatch/review-state`
- Patch results: `~/.ghostpatch/patch-results`
- PR memory: `~/.ghostpatch/pr-memory`
- Surge runs: `~/.ghostpatch/surge`
- Workspaces: `~/.ghostpatch/workspaces`

## Agent Notes

- Prefer `scan --live` for real GitHub work.
- Use plain `scan` for demos and safe dry runs.
- Use `review` for normal solve and publish actions.
- Never bypass Ghostpatch checks for duplicates, diff budgets, branches, tests, or publication confirmation.
- If Ghostpatch blocks a PR, report the blocker instead of working around it.
- Only use `ghostpatch surge` when the user explicitly asks for autonomous continuous operation.
