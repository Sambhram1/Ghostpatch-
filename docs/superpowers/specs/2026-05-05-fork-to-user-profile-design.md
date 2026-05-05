# Ghostpatch Fork-to-User-Profile Design

## Goal

Update Ghostpatch so that when a user selects a GitHub repository candidate to work on, Ghostpatch forks the upstream repository into the authenticated user's GitHub profile and uses that fork for local workspace and branch pushes.

The new flow should:

- detect the authenticated GitHub username
- create the user's fork when it does not already exist
- reuse the fork when it already exists
- make the local workspace treat the fork as `origin`
- keep the original repository as `upstream`
- ensure pull requests are opened from the user's fork back to the original repository

## Problem

Current live solve behavior clones the upstream repository directly into `~/.ghostpatch/workspaces` and pushes branches to whatever `origin` currently points to.

That is a poor fit for typical open-source contribution workflow because:

- contributors often do not have push access to upstream
- the correct PR path is usually `user/fork` -> `upstream/repo`
- Ghostpatch currently does not establish or manage this fork-based remote layout

For a supervised OSS contribution tool, fork management should be explicit and predictable rather than left to manual user setup.

## Scope

V1 includes:

- resolve the authenticated GitHub login
- fork the selected upstream repository into the user's account when needed
- configure workspace remotes as:
  - `origin` = user fork
  - `upstream` = original repository
- reuse an existing fork instead of creating duplicates
- ensure branch existence checks and pushes operate against the fork remote
- ensure PR creation targets the upstream repository while sourcing the user's fork branch
- review/session messaging that makes the fork step visible

V1 does not include:

- organization-targeted forks
- selecting among multiple GitHub accounts
- automatic cleanup of stale forks
- mass forking during repository scan
- background sync strategies beyond current fetch/update behavior

## User Flow

### Review Selection Flow

1. User runs `ghostpatch scan --live`.
2. User runs `ghostpatch review`.
3. User selects a GitHub candidate and chooses a work action such as solve or publish PR.
4. Before local solve begins, Ghostpatch:
   - validates GitHub auth
   - resolves the authenticated username
   - checks whether the user's fork exists
   - creates the fork if missing
   - prepares the workspace so `origin` points to the fork and `upstream` points to the original repo
5. Ghostpatch clones or updates the workspace against that remote layout.
6. Solve, branch creation, push, and PR creation proceed using the fork-based workflow.

### Existing Workspace Flow

If a workspace already exists:

1. Ghostpatch verifies the workspace is clean before reconfiguration.
2. Ghostpatch updates remotes so:
   - `origin` points to the user's fork
   - `upstream` points to the original repository
3. Ghostpatch fetches both remotes.
4. Existing branch hygiene checks continue against `origin`, which is now the fork.

### Publish PR Flow

1. Ghostpatch pushes the branch to the user's fork remote.
2. Ghostpatch opens a PR against the upstream repository.
3. The PR source branch comes from the fork.

## Remote Model

Workspace remote contract:

- `origin`: authenticated user's fork
- `upstream`: original repository selected during scan/review

Rules:

- `origin` must always be pushable by the authenticated user
- `upstream` must remain available for fetch and PR targeting
- branch existence checks should inspect `origin`
- local clone/update logic should tolerate the workspace being created before fork support existed

## Fork Detection and Creation

Ghostpatch should use GitHub CLI for this V1 workflow.

Required operations:

- resolve login, for example from GitHub API or `gh` user context
- check whether fork repo `<login>/<repo-name>` exists
- create a fork when absent

Expected outcomes:

- fork exists: continue without mutation
- fork missing: create it and continue
- fork creation fails: stop with a direct error
- authenticated user cannot be resolved: stop with a direct error

## Workspace Behavior

The workspace manager should support a repo preparation step that guarantees:

- the workspace exists locally
- `origin` points to the fork
- `upstream` points to the original repo
- both remotes are fetched

This preparation step should work for:

- a new workspace with no prior clone
- an old upstream-only workspace from previous Ghostpatch versions
- a workspace already configured for the same fork

Dirty workspaces should remain blocked rather than being rewritten under user changes.

## CLI and UX Changes

During review or solve, Ghostpatch should emit short status messages such as:

```text
Checking GitHub fork for <owner/repo>.
Fork not found in <login>. Creating fork.
Preparing workspace remotes: origin=<login>/<repo>, upstream=<owner>/<repo>.
```

If a fork already exists:

```text
Using existing fork <login>/<repo>.
```

If the fork step fails:

```text
Could not create or access fork <login>/<repo>. Resolve GitHub access and try again.
```

## PR Creation Model

PR creation must continue to target the original upstream repository, not the fork itself.

That means Ghostpatch should create PRs in a way that is compatible with:

- current local git branch existing on the fork remote
- upstream base repository remaining the PR target

If current `gh pr create` invocation depends implicitly on the current remote layout, it should be updated so the upstream target is explicit.

## Testing

Add or update tests for:

- fork repository name derivation from upstream repo plus authenticated login
- workspace remote reconfiguration behavior
- existing workspace migration from upstream-only clone to fork-plus-upstream remotes
- branch existence checks still operating against `origin`
- PR creation targeting upstream after fork setup
- direct failure messaging when fork creation fails

Prefer seams around GitHub CLI calls and git remote commands so the workflow can be tested without live GitHub mutation.

## Risks

- creating forks too early may leave unused forks in the user's account
- remote reconfiguration of existing workspaces must not trample dirty changes
- PR creation may fail if `gh` infers the wrong base/head repository unless Ghostpatch sets target repo explicitly
- users with multiple GitHub identities may fork into the wrong account if auth context is ambiguous

## Recommendation

Fork the repository when the user selects a GitHub candidate for real work, then standardize all workspace and PR behavior around `origin = fork` and `upstream = original repository`.
