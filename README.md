# Ghostpatch

Ghostpatch is an agent-native skill for Codex, Claude Code, and other coding agents. It helps an agent find GitHub issues worth solving, qualify the best candidates, solve them locally, validate the patch, and publish issues or pull requests with clear safety checks.

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
- fork selected live-work repositories into the authenticated user's GitHub profile
- qualify candidates by labels, reproduction detail, tests, contribution-guide signals, bot/AI restrictions, and license metadata
- clone selected repos into `~/.ghostpatch/workspaces`
- ask Codex, Claude, or a local deterministic agent to solve locally
- run the configured validation command
- store scan history, review state, patch results, command logs, reproduction logs, diffs, and test output
- store PR memory for follow-up work after CI failures or maintainer feedback
- show what changed and what risk remains
- publish issues or PRs only after explicit user confirmation

Ghostpatch is supervised by default. Autonomous publishing exists only in the explicit `ghostpatch surge` extension mode.

## Who It Is For

Ghostpatch is for users who want:

- supervised help contributing to open source
- a repeatable scan -> review -> solve -> publish flow
- stored PR memory for CI and maintainer follow-up
- autonomous mode only when explicitly invoked

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
- `GH_TOKEN` or `GITHUB_TOKEN` before live scan or publish
- Optional: Codex CLI or Claude CLI

## GitHub Auth

Ghostpatch uses token-first GitHub auth for live scan and publish. Set one of these environment variables before running live GitHub actions:

```powershell
$env:GH_TOKEN="your_token"
setx GH_TOKEN "your_token"
```

Alternative:

```powershell
$env:GITHUB_TOKEN="your_token"
setx GITHUB_TOKEN "your_token"
```

`ghostpatch setup` will ask which variable to use, validate it when present, and save only the variable name in Ghostpatch preferences.

## First Run

The shortest successful path is:

```bash
ghostpatch setup
ghostpatch scan --live
ghostpatch review
```

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
- preferred GitHub token env var: `GH_TOKEN` or `GITHUB_TOKEN`
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
- create or reuse your GitHub fork for the selected repository
- show issue and PR drafts
- ask the configured agent to solve locally
- show changed files, test output, blockers, and remaining risk
- create issues or PRs only after confirmation

When you explicitly want continuous autonomous operation, use `ghostpatch surge`. That mode keeps normal review unchanged and only runs when directly invoked.

For live solve work, Ghostpatch:

- creates or reuses the authenticated user's fork
- uses your fork as `origin`
- keeps the original repo as `upstream`
- stores PR memory so follow-up work can resume after CI or maintainer feedback

## CLI Commands

```bash
ghostpatch setup
ghostpatch scan
ghostpatch scan --live
ghostpatch surge --max-prs 1 --max-runtime-minutes 30
ghostpatch review
ghostpatch agents
ghostpatch login codex --command codex
ghostpatch login claude --command claude
ghostpatch login codex --dry-run-command "codex exec --sandbox read-only {{prompt}}"
ghostpatch run --agent codex --fixture python-fastapi-bug
```

`ghostpatch login` configures the coding agent command. GitHub access comes from `GH_TOKEN` or `GITHUB_TOKEN`.

Use plain `ghostpatch scan` for a safe fixture demo.

Use `ghostpatch scan --live` for real GitHub issue discovery.

Use `ghostpatch surge` only when you explicitly want continuous find -> solve -> publish behavior with hard limits and quality gates.

For live GitHub solve and PR flow, Ghostpatch uses:

- `origin` = your fork
- `upstream` = the original repository

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

In `ghostpatch surge`, Ghostpatch additionally enforces:

- max PRs per run
- max runtime
- max failures before stop
- repo scan limit per cycle
- candidate-quality threshold before publish

Live patching happens under `~/.ghostpatch/workspaces`, not in the Ghostpatch source repository.

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
gh skill publish --tag v0.1.4
```

The package name is `@sambhram06/ghostpatch` because the unscoped `ghostpatch` npm name is already taken. The CLI binary remains `ghostpatch`.

## License

MIT
