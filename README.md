# Ghostpatch

Ghostpatch is a merge-rate-first open-source contribution operator. This repository currently contains a dry-run MVP that evaluates fixture repositories, reproduces candidate issues in a simulated pipeline, chooses between `direct-pr`, `issue-first`, or `skip`, and emits contribution artifacts without touching live GitHub.

## MVP Scope

- Public Python and TypeScript repositories only
- Fixture-backed discovery instead of live GitHub crawling
- Deterministic triage, reproduction, review, and social decisioning
- Human-readable dry-run report output

## Commands

```bash
npm install
npm run build
npm test
npm run dev
node build/index.js run --fixture python-fastapi-bug
```

## Next

- Replace fixtures with live GitHub repo scouting
- Add persistent run storage and repo cooldowns
- Add operator approval gates before issue or PR publication
