# Ghostpatch

Ghostpatch is an agent-native skill for Codex, Claude Code, and other coding agents. It helps an agent find open-source GitHub issues, qualify good candidates, solve them locally, review the diff and tests, and raise a pull request only after user approval.

The main product is the Agent Skill:

```bash
npx skills add https://github.com/Sambhram1/Ghostpatch- --skill ghostpatch
```

The npm package provides the executable engine used by the skill:

```bash
npm install -g @sambhram06/ghostpatch
```

After install, ask your agent:

```text
Use Ghostpatch to find a good issue in my configured repos, solve it locally, and prepare a PR for my approval.
```

## What It Does

Ghostpatch gives agents a supervised open-source contribution workflow:

- find repositories and open GitHub issues
- qualify candidates by labels, reproduction detail, tests, contribution-guide signals, bot/AI restrictions, and license metadata
- clone selected repos into `~/.ghostpatch/workspaces`
- ask Codex, Claude, or a local deterministic agent to solve locally
- run the configured validation command
- store scan history, review state, patch results, command logs, reproduction logs, diffs, and test output
- show what changed and what risk remains
- publish issues or PRs only after explicit user confirmation

Ghostpatch is not an autonomous PR bot. It is designed for supervised agent work.

## Install as a Skill

From skills.sh / skills CLI:

```bash
npx skills add https://github.com/Sambhram1/Ghostpatch- --skill ghostpatch
```

If your agent supports npm-distributed skills, the npm package includes:

```text
skills/ghostpatch/SKILL.md
skills/ghostpatch/scripts/ghostpatch.mjs
```

The skill runner calls a local `ghostpatch` binary when available and falls back to:

```bash
npx --yes @sambhram06/ghostpatch
```

## Install the Engine

The skill can run through `npx`, but global install is faster:

```bash
npm install -g @sambhram06/ghostpatch
```

The installed command is:

```bash
ghostpatch
```

## Requirements

- Node.js 22 or newer
- Git
- GitHub CLI
- `gh auth login` before live scan or publish
- Optional: Codex CLI or Claude CLI

## First Run

Run setup once:

```bash
ghostpatch setup
```

Or through the skill runner:

```bash
node skills/ghostpatch/scripts/ghostpatch.mjs setup
```

Setup stores:

- preferred agent: `local`, `codex`, or `claude`
- preferred languages
- manual repos or auto-search mode
- approval mode
- per-repo validation command overrides

Per-repo validation commands use:

```text
owner/name=npm test -- config, other/repo=pytest tests/test_loader.py
```

## Agent Workflow

When the skill is installed, the agent should use:

```bash
node <skill-folder>/scripts/ghostpatch.mjs scan --live
node <skill-folder>/scripts/ghostpatch.mjs review
```

The review command is where solving and publishing happen. It can:

- compare candidate quality
- resume interrupted reviews
- reject candidates with reasons
- show issue and PR drafts
- ask the configured agent to solve locally
- show changed files, test output, blockers, and remaining risk
- create issues or PRs only after confirmation

## CLI Commands

```bash
ghostpatch setup
ghostpatch scan
ghostpatch scan --live
ghostpatch review
ghostpatch agents
ghostpatch login codex --command codex
ghostpatch login claude --command claude
ghostpatch login codex --dry-run-command "codex exec --sandbox read-only {{prompt}}"
ghostpatch run --agent codex --fixture python-fastapi-bug
```

Use plain `ghostpatch scan` for a safe fixture demo.

Use `ghostpatch scan --live` for real GitHub issue discovery.

## Safety Model

Ghostpatch blocks or warns before publication when it detects:

- no changed files
- failed agent execution
- failed validation command
- over-budget diff
- secret-like content in the diff
- generated or sensitive files that need manual review
- dirty workspace before solving
- unexpected branch before publishing
- existing remote branch
- possible duplicate issue or pull request
- draft-only approval mode

Live patching happens under `~/.ghostpatch/workspaces`, not in the Ghostpatch source repository.

## Stored Data

- Preferences: `~/.ghostpatch/preferences.json`
- Agent config: `~/.ghostpatch/config.json`
- Latest report: `~/.ghostpatch/latest-report.json`
- Scan history: `~/.ghostpatch/reports`
- Review state: `~/.ghostpatch/review-state`
- Patch results: `~/.ghostpatch/patch-results`
- Workspaces: `~/.ghostpatch/workspaces`

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm pack --dry-run --cache .npm-cache
node build/src/index.js run --fixture python-fastapi-bug
python C:\Users\sambh\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills\ghostpatch
```

## Publishing

Publish the npm engine:

```bash
npm test
npm run lint
npm pack --dry-run --cache .npm-cache
npm publish --access public
```

Publish the skill from GitHub when your GitHub CLI supports `gh skill`:

```bash
gh skill publish --dry-run
gh skill publish --tag v0.1.0
```

The package name is `@sambhram06/ghostpatch` because the unscoped `ghostpatch` npm name is already taken. The CLI binary remains `ghostpatch`.

## License

MIT
