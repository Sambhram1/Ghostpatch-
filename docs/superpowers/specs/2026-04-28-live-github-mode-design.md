# Ghostpatch Live GitHub Mode Design

## Goal

Add a live GitHub mode that can authenticate through GitHub CLI, scan user-provided repositories, discover open issues, clone repositories into a local Ghostpatch workspace, run a coding agent against a selected issue, generate a diff and test report, and publish issues or pull requests only after explicit user approval.

## Scope

V1 live mode supports:

- GitHub CLI authentication checks with `gh auth status`
- Manual repository scanning using saved setup repos
- Open issue discovery through `gh issue list`
- Local clone/update under `~/.ghostpatch/workspaces`
- Codex/agent execution in workspace-write mode for selected issues
- Diff summary and changed-file reporting
- Approval-gated `gh issue create`
- Approval-gated branch/commit/push/`gh pr create`

V1 live mode does not support:

- Fully autonomous publishing
- Auto-search across all GitHub
- Fork management beyond the current authenticated `gh` behavior
- Complex maintainer discussion loops
- Guaranteed test-command inference for every repository

## User Flow

1. User runs `ghostpatch setup` and provides manual repos.
2. User runs `ghostpatch scan --live`.
3. Ghostpatch checks GitHub CLI auth and lists open issues for the configured repos.
4. Ghostpatch turns each issue into a candidate and saves the latest report.
5. User runs `ghostpatch review`.
6. User chooses one of:
   - show issue draft
   - publish issue after confirmation
   - ask agent to solve locally
   - publish PR after confirmation
   - skip

## Safety

- Live GitHub publishing always asks for confirmation.
- Agent patching happens in `~/.ghostpatch/workspaces`, not in the Ghostpatch source repo.
- Pull requests require a local diff from a solved workspace.
- Failed agent execution blocks PR publication.
- Issue creation requires a concrete repository target.

## Data Model

Live candidates extend the existing `Opportunity` model with source metadata:

- `sourceType`
- `issueNumber`
- `issueUrl`
- `repoUrl`

Patch results are stored under `~/.ghostpatch/patch-results/<slug>.json` so review can create a PR after a solve step.
