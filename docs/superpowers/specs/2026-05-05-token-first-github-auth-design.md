# Ghostpatch Token-First GitHub Auth Design

## Goal

Replace the current GitHub CLI login assumption with a token-first authentication flow that works directly from `ghostpatch setup` and is easier for users installing the skill from a coding agent.

The new flow should:

- prompt the user to choose `GH_TOKEN` or `GITHUB_TOKEN`
- explain exactly how to set the selected environment variable
- validate the token immediately when present
- save only the selected environment variable name in Ghostpatch config
- allow setup to finish even when GitHub auth is not ready yet

## Problem

Current setup splits GitHub readiness across two unrelated flows:

- `ghostpatch login ...` configures the coding agent command
- `ghostpatch setup` can only check GitHub CLI auth and tells the user to run `gh auth login`

That creates friction for users who install the Ghostpatch skill from a coding agent and expect a direct install-plus-login path. It also makes Ghostpatch depend on GitHub CLI auth even though token-based auth is a better fit for agent-driven, headless, and cross-shell usage.

## Scope

V1 includes:

- token-first GitHub auth guidance inside `ghostpatch setup`
- prompt to choose `GH_TOKEN` or `GITHUB_TOKEN`
- runtime resolution of the selected environment variable
- immediate token validation when the selected variable is present
- graceful setup completion when the token is missing
- clear setup and runtime status messages
- documentation updates replacing `gh auth login` as the primary auth path

V1 does not include:

- storing token values in Ghostpatch config
- OS keychain integration
- browser OAuth or device-code login
- automatic environment-variable persistence by Ghostpatch
- removal of GitHub CLI if parts of publishing still require it elsewhere

## User Flow

### First-time Setup

1. User runs `ghostpatch setup`.
2. Setup collects agent, language, repo, and approval preferences as it does today.
3. Setup asks which GitHub environment variable Ghostpatch should use:
   - `GH_TOKEN`
   - `GITHUB_TOKEN`
4. Setup checks whether the selected variable is present in the current environment.
5. If the variable is missing, setup prints short instructions for:
   - creating a GitHub personal access token
   - minimum required token scopes
   - setting the token in PowerShell for the current session
   - persisting the token for future PowerShell sessions
   - an equivalent example for the alternate variable name
6. Setup saves the selected variable name in Ghostpatch config and continues.
7. Final setup output marks GitHub as either:
   - `ready`
   - `not ready - <ENV_VAR> is not set`
   - `invalid token - recheck <ENV_VAR>`

### Validation During Setup

1. If the selected variable exists, setup validates it immediately with a lightweight GitHub API request.
2. On success, setup marks GitHub as ready.
3. On failure, setup prints a direct explanation:
   - variable exists but token is invalid
   - variable exists but lacks required scopes
   - GitHub could not be reached
4. Setup still completes, but GitHub is marked as not ready.

### Runtime Behavior

1. `scan --live`, `review`, and any publish actions read the configured environment variable name from Ghostpatch config.
2. At runtime, Ghostpatch resolves the token from the current process environment.
3. If the token is missing or invalid, Ghostpatch fails fast with a clear message that references the configured variable name and tells the user how to fix it.

## Configuration

Ghostpatch config should store only metadata required to locate the token, for example:

```json
{
  "githubAuth": {
    "envVar": "GH_TOKEN"
  }
}
```

Rules:

- never store the token value itself
- default to `GH_TOKEN` when no prior config exists
- allow switching the variable name by re-running setup

## Validation Model

Validation should use a direct GitHub API request rather than `gh auth status`.

The validation path should:

- read the selected env var from `process.env`
- send an authenticated request to a low-cost endpoint such as the current user endpoint
- treat a successful authenticated response as `ready`
- map common failures into actionable user messages

Expected outcomes:

- missing variable: show setup instructions
- HTTP 401/403: token invalid or insufficient
- network failure: GitHub unreachable

## CLI and UX Changes

### `ghostpatch setup`

Add a GitHub auth section near the end of setup after preferences are saved.

Prompt:

```text
Which GitHub token variable should Ghostpatch use?
1. GH_TOKEN
2. GITHUB_TOKEN
```

If missing:

```text
GitHub token not found in GH_TOKEN.

Create a GitHub personal access token, then set it like this:

PowerShell (current session):
  $env:GH_TOKEN="your_token"

PowerShell (persist for future sessions):
  setx GH_TOKEN "your_token"

You can finish setup now and add the token later.
```

If invalid:

```text
GitHub token found in GH_TOKEN, but validation failed.
Check that the token is valid and has the required scopes, then run ghostpatch setup again.
```

### `ghostpatch login`

No behavior change in V1. It remains focused on coding-agent command configuration, not GitHub auth. Documentation should make that distinction explicit.

## Documentation Changes

Update:

- `README.md`
- skill documentation under `skills/ghostpatch`
- any setup/help text that currently instructs users to run `gh auth login`

Documentation should:

- make `GH_TOKEN` / `GITHUB_TOKEN` the primary auth path
- explain that GitHub CLI auth is no longer the recommended default for setup
- clarify that `ghostpatch login` configures the coding agent, not GitHub access
- include concise PowerShell examples

## Testing

Add or update tests for:

- setup prompt parsing and selected env-var persistence
- missing token behavior
- successful token validation
- invalid token handling
- runtime error messages when configured env var is absent
- backward-compatible defaulting to `GH_TOKEN`

Prefer test seams around GitHub validation so setup logic can be tested without making live network requests.

## Risks

- Users may confuse token presence in one shell with persistence across new terminals.
- If publishing code still depends on `gh` elsewhere, docs must avoid overstating full removal of GitHub CLI requirements.
- Token-scope requirements must stay narrowly documented to avoid asking for broader access than needed.

## Recommendation

Implement the token-first setup flow now and keep GitHub CLI as an optional secondary tool, not the primary authentication model.
