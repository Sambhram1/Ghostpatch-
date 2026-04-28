# Ghostpatch

Ghostpatch is a merge-rate-first open-source contribution operator. This repository currently contains a dry-run MVP that evaluates fixture repositories, reproduces candidate issues in a simulated pipeline, chooses between `direct-pr`, `issue-first`, or `skip`, and emits contribution artifacts without touching live GitHub.

The intended user flow is low-friction:

```bash
npm install -g ghostpatch
ghostpatch setup
ghostpatch scan
ghostpatch review
```

`setup` opens a fully terminal-based wizard with animated progress, asks which coding agent to use, stores language preferences, records manual repos or auto-search intent, and keeps publication gated behind user decisions.

## MVP Scope

- Public Python and TypeScript repositories only
- Fixture-backed discovery instead of live GitHub crawling
- Agent-selectable patch planning with `local`, `codex`, and `claude`
- Deterministic triage, reproduction, review, and social decisioning
- Human-readable dry-run report output

## Local Commands

```bash
npm install
npm run build
npm test
npm run dev
node build/src/index.js run --fixture python-fastapi-bug
```

## CLI Usage

After publishing to npm, users can install and run Ghostpatch like this:

```bash
npm install -g ghostpatch
ghostpatch setup
ghostpatch scan
ghostpatch review
ghostpatch agents
ghostpatch login codex --command codex
ghostpatch login claude --command claude
ghostpatch run --agent codex --fixture python-fastapi-bug
```

`login` does not store API secrets. It registers how Ghostpatch should reach a coding agent, either through a CLI command, a dry-run command, or an environment variable:

```bash
ghostpatch login codex --command codex
ghostpatch login claude --env ANTHROPIC_API_KEY
ghostpatch login codex --dry-run-command "codex exec --sandbox read-only {{prompt}}"
```

Configuration is stored in `~/.ghostpatch/config.json`. Set `GHOSTPATCH_HOME` to use a different config directory.

## Agent Model

Ghostpatch keeps GitHub side effects centralized in the orchestrator. Coding agents are worker providers: they can generate patch plans and review artifacts, but they do not publish issues or PRs directly.

External providers run in dry-run mode. Ghostpatch passes a prompt asking the agent to return a patch plan only, captures stdout/stderr/exit code, and blocks the contribution if the agent command fails. Default commands are:

```bash
codex exec --sandbox read-only --cd <cwd> <prompt>
claude -p --permission-mode default <prompt>
```

## Review Flow

`ghostpatch scan` creates a latest report under `~/.ghostpatch/latest-report.json`. `ghostpatch review` opens that report in the terminal and shows one candidate at a time. The user can show an issue draft, ask the agent to solve next, show a direct PR draft, skip, or quit.

For now, review actions are intentionally non-publishing. The next production step is connecting those choices to GitHub issue and PR creation behind explicit approval.

## Next

- Replace fixtures with live GitHub repo scouting
- Add persistent run storage and repo cooldowns
- Add operator approval gates before issue or PR publication
