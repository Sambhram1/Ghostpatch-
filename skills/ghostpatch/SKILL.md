---
name: ghostpatch
description: Use Ghostpatch as an agent-native open-source contribution plugin for Codex, Claude Code, and other coding agents. Trigger when a user wants the agent to find repositories, discover GitHub issues, qualify candidates, solve issues locally, review diffs/tests, and raise approval-gated pull requests using the Ghostpatch workflow.
---

# Ghostpatch

## Role

Act as the operator for an open-source contribution workflow. Use Ghostpatch to find candidate GitHub issues, choose high-quality work, solve locally in a safe workspace, and raise PRs only after the user approves the exact action.

Ghostpatch is distributed two ways:

- as this Agent Skill from skills.sh
- as the npm engine package `@sambhram06/ghostpatch`

The skill is the primary interface. The npm package is the executable engine.

## Runner

Use the bundled runner when this skill is installed:

```bash
node skills/ghostpatch/scripts/ghostpatch.mjs --help
```

If the relative path is different in the host agent, locate this skill folder and run:

```bash
node <skill-folder>/scripts/ghostpatch.mjs <args>
```

The runner first tries a local `ghostpatch` binary. If it is not available, it falls back to:

```bash
npx --yes @sambhram06/ghostpatch <args>
```

Set `GHOSTPATCH_CLI` to force a specific executable.

## Main Workflow

When the user asks to find issues, solve issues, or raise PRs:

1. Check prerequisites:

```bash
node <skill-folder>/scripts/ghostpatch.mjs --help
```

Confirm the configured GitHub token variable is set:

```powershell
$env:GH_TOKEN
```

or:

```powershell
$env:GITHUB_TOKEN
```

2. Configure the agent if needed:

```bash
node <skill-folder>/scripts/ghostpatch.mjs login codex --command codex
node <skill-folder>/scripts/ghostpatch.mjs login claude --command claude
```

3. Run setup if preferences do not exist or the user wants to change repos/languages:

```bash
node <skill-folder>/scripts/ghostpatch.mjs setup
```

`setup` asks whether Ghostpatch should use `GH_TOKEN` or `GITHUB_TOKEN`, validates it when present, and saves only the variable name.

4. Scan:

```bash
node <skill-folder>/scripts/ghostpatch.mjs scan --live
```

5. Review:

```bash
node <skill-folder>/scripts/ghostpatch.mjs review
```

6. For live solve work, Ghostpatch creates or reuses the authenticated user's fork, uses that fork as `origin`, keeps the original repository as `upstream`, and then works in the local workspace.

7. In review, only choose publish actions after the user confirms the candidate, patch, tests, and post body.

## Agent Behavior

- Prefer `scan --live` for real GitHub work.
- Use plain `scan` for demos and safe dry runs.
- Use `review` for all solve and publish actions in the normal workflow.
- Never bypass Ghostpatch's duplicate checks, diff-budget checks, branch checks, test checks, or publication confirmations.
- If Ghostpatch blocks a PR, report the blocker instead of working around it.
- If the user explicitly asks for autonomous continuous operation, use `ghostpatch surge`. Do not invoke that mode unless the user asks for it.

## What Ghostpatch Shows

During review, Ghostpatch surfaces:

- why the candidate was selected
- candidate quality score
- quality risks and safety signals
- commands that will run
- changed files
- validation command and test result
- diff budget
- blockers and remaining risk
- exact issue or PR text before posting

## Common Commands

```bash
node <skill-folder>/scripts/ghostpatch.mjs agents
node <skill-folder>/scripts/ghostpatch.mjs scan
node <skill-folder>/scripts/ghostpatch.mjs scan --live
node <skill-folder>/scripts/ghostpatch.mjs surge --max-prs 1 --max-runtime-minutes 30
node <skill-folder>/scripts/ghostpatch.mjs review
node <skill-folder>/scripts/ghostpatch.mjs run --agent codex --fixture python-fastapi-bug
```

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
