# Ghostpatch

Ghostpatch is a merge-rate-first open-source contribution operator. It scans candidate GitHub issues, qualifies them for patchability and safety, runs a selected coding agent in an isolated local workspace, stores diff/test evidence, and only publishes issues or pull requests after explicit user approval.

```bash
npm install -g @sambhram06/ghostpatch
ghostpatch setup
ghostpatch scan --live
ghostpatch review
```

## Status

Ghostpatch is an early MVP for supervised contribution workflows. It is designed to keep live GitHub side effects behind review prompts, not to publish autonomously.

## Requirements

- Node.js 22 or newer
- Git
- GitHub CLI for live mode
- `gh auth login` before live scanning or publishing
- Optional: Codex CLI or Claude CLI for agent-backed solving

## Install

From npm:

```bash
npm install -g @sambhram06/ghostpatch
ghostpatch setup
```

From source:

```bash
git clone https://github.com/Sambhram1/Ghostpatch-.git
cd Ghostpatch-
npm install
npm run build
node build/src/index.js scan
```

## CLI Usage

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

`setup` opens a terminal wizard that stores the preferred agent, languages, repository source mode, approval mode, manual repositories, and optional per-repository validation commands.

Per-repository validation commands use this form:

```text
owner/name=npm test -- config, other/repo=pytest tests/test_loader.py
```

Configuration is stored under `~/.ghostpatch`. Set `GHOSTPATCH_HOME` to use a different directory.

## Live GitHub Mode

`ghostpatch scan --live` uses GitHub CLI to:

- check authentication
- inspect configured repositories
- list open issues
- qualify candidates by labels, reproduction detail, concrete broken behavior, tests, contribution-guide signals, bot/AI restrictions, and license metadata
- save the latest report and durable scan history

`ghostpatch review` lets the user:

- compare candidate quality
- resume interrupted reviews
- inspect issue and PR drafts
- reject candidates with a durable reason
- ask the configured agent to solve locally
- review changed files, diff budget, test output, blockers, and remaining risk
- publish an issue or PR only after confirmation

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

## Agent Model

Ghostpatch keeps GitHub side effects centralized in its review session. Coding agents are patch workers: they can generate plans and local edits, but they do not create issues, push branches, or open pull requests directly.

Default external commands:

```bash
codex exec --sandbox read-only --cd <cwd> <prompt>
claude -p --permission-mode default <prompt>
```

Live solve mode invokes the configured agent in a workspace-write context against a cloned repository and then runs the candidate validation command.

## Development

```bash
npm install
npm run build
npm test
npm run lint
npm pack --dry-run --cache .npm-cache
node build/src/index.js run --fixture python-fastapi-bug
```

## Publishing to npm

Before publishing:

```bash
npm test
npm run lint
npm pack --dry-run --cache .npm-cache
npm login
npm publish --access public
```

The package is published as `@sambhram06/ghostpatch` because the unscoped `ghostpatch` npm name is already taken. It still installs the `ghostpatch` CLI binary. The package includes the compiled CLI under `build/src`, fixture data, docs, the bundled `skills/ghostpatch` Agent Skill, and the MIT license.

## Publishing to skills.sh

This repository includes an Agent Skill at:

```text
skills/ghostpatch/SKILL.md
```

Validate the skill before publishing:

```bash
python C:\Users\sambh\.codex\skills\.system\skill-creator\scripts\quick_validate.py skills\ghostpatch
gh skill publish --dry-run
```

`gh skill publish` requires a GitHub CLI build with the `gh skill` command available. If `gh skill` is not listed in `gh --help`, update GitHub CLI before running the dry run.

If validation passes, publish through GitHub CLI:

```bash
gh skill publish --tag v0.1.0
```

After the GitHub release is published, users can install the skill with:

```bash
npx skills add https://github.com/Sambhram1/Ghostpatch- --skill ghostpatch
```

## License

MIT
