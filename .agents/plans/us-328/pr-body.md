# Fix stale autoload keyword-map prose (us-328)

Closes #328.

## What

One-token docs fix plus renderer-canonical mirror sync:

- `.agents/skills/ws-shared/runtime/autoload.md` — keyword-map prose
  `{sharedDir}/scm-provider-contract.md` → `{sharedDir}/runtime/scm-provider-contract.md`
- `.agents/skills/ws-shared/autoload.md` — same prose via regen + 4 sibling link targets
  (`tools.md`, `AGENTS.md`, `scm-provider-contract.md`, `gates.md` → `runtime/` prefix).
  Installer-refresh stable (verified idempotent).
- `test/test-doc-sync.js` — regression assertions (fail pre-fix, pass post-fix).
- Release `0.4.23` → `0.4.24` (55 skill stamps, both skill-dependencies, integrity manifest, site footer).

## Verification

- Spec `0081-us-328.spec.md` authoring-validated; ledger 10/10, 0 errors.
- Full `npm run tests` exit 0; `verify-integrity` OK; `build-site --check` current.
- Code review clean round 2 + fable-judge VERIFIED.
- Pre-existing drift noted, not fixed here: mirror lacks the `ws-monitor` keyword row;
  `0037-skill-family-naming.spec.md` quotes the old token (historical record).

## Workflow

`us-328-20260913T160800Z` (standard, autoMode, fullMode) — status completed, steps 0–8 done.
