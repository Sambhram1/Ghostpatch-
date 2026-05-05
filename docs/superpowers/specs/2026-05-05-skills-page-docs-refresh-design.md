# Ghostpatch Skills Page Docs Refresh Design

## Goal

Rewrite Ghostpatch's public-facing skill documentation so the skills.sh page works as a clean first-run onboarding surface, while keeping the repository README aligned as the fuller companion document.

The refresh should:

- optimize `skills/ghostpatch/SKILL.md` for humans discovering the skill on skills.sh
- keep the document accurate with the current Ghostpatch behavior:
  - token-first GitHub auth
  - fork-to-user-profile workflow
  - PR memory
  - explicit `ghostpatch surge` mode
- make the first successful path obvious within the first screenful
- reduce internal implementation detail near the top of the page
- keep `README.md` consistent with the public skill page without duplicating everything mechanically

## Problem

Ghostpatch's public skills.sh page renders `SKILL.md` directly. That means the skill file is not only an instruction file for agents, it is also the public landing page users evaluate before installing or using the skill.

The current skills.sh page has several problems:

- it leads with role/operator framing rather than user outcomes
- it introduces runner details too early
- it is weaker on first-run onboarding than it should be
- it can drift from the actual product behavior after major features ship
- it is less effective as a discovery page than as an internal operator note

That makes the public skill harder to evaluate and harder to use correctly on the first attempt.

## Scope

V1 includes:

- a full content rewrite of `skills/ghostpatch/SKILL.md`
- a matching documentation refresh for `README.md`
- exact install, setup, first-run, safety, and advanced-mode guidance
- wording updates that reflect the current Ghostpatch feature set
- a new skill release on skills.sh after the docs are pushed

V1 does not include:

- structural changes to the skill runner
- command behavior changes
- redesign of security audit output on skills.sh
- npm package behavior changes beyond optional release-version alignment if needed for publishing hygiene

## Primary Audience

The skills.sh page should optimize for:

1. humans evaluating whether Ghostpatch is useful
2. humans trying to get to the first successful run quickly
3. agents and operators who need concrete workflow instructions after installation

The ordering should reflect that priority.

## Documentation Strategy

### SKILL.md

`SKILL.md` should be treated as the public product page first and the agent instruction file second.

It should use an outcome-first structure:

1. what Ghostpatch does
2. who it is for
3. requirements
4. install
5. first run
6. normal workflow
7. GitHub auth
8. safety model
9. autonomous mode
10. stored data
11. agent notes

### README.md

`README.md` should mirror the same conceptual flow but remain the fuller project document.

It should carry:

- package/distribution details
- development and publishing instructions
- deeper CLI coverage
- project-level context

The two documents should feel aligned, not duplicated line-for-line.

## Content Requirements

The rewrite must explicitly cover the current behavior.

### Install

Show:

- the skills CLI install path
- the npm engine install path as optional but faster

### First Run

The shortest successful path should be obvious:

1. install
2. `ghostpatch setup`
3. choose `GH_TOKEN` or `GITHUB_TOKEN`
4. configure repos/languages
5. `ghostpatch scan --live`
6. `ghostpatch review`

### GitHub Auth

Clarify:

- Ghostpatch uses token-first GitHub auth
- `ghostpatch login` configures the coding agent command, not GitHub auth
- setup stores only the environment-variable name

### Live Solve Behavior

Clarify:

- Ghostpatch creates or reuses the authenticated user's fork
- `origin` points to the fork
- `upstream` points to the original repo

### PR Memory

Clarify:

- Ghostpatch stores PR memory for later follow-up
- CI failures and maintainer feedback can be resumed from memory

### Autonomous Mode

Clarify:

- `ghostpatch surge` exists
- it is explicit-only
- normal Ghostpatch remains supervised by default

## Tone and Presentation

The rewrite should:

- be concise and direct
- avoid internal jargon unless it helps the first-run path
- favor concrete commands over abstract explanation
- reduce repetition
- keep sections easy to scan on the public skills.sh page

The top of the page should answer:

- what it does
- what I need
- what command I run first

## Accuracy Requirements

The refreshed docs must not regress into earlier behavior assumptions.

Specifically, they must not:

- imply `gh auth login` is the primary GitHub auth path
- omit the token-first model
- omit the fork-based live contribution flow
- omit PR memory
- imply autonomous behavior is the default mode

## Release Requirement

After the docs refresh is implemented and pushed:

- publish a fresh skills.sh release so the public page reflects the new content

This release is for the skill page refresh itself, not for new runtime behavior.

## Recommendation

Treat `skills/ghostpatch/SKILL.md` as the product landing page for skills.sh and rewrite it around the first successful user journey. Keep `README.md` aligned as the fuller project companion, then publish a fresh skill release so the public page reflects the improved onboarding.
