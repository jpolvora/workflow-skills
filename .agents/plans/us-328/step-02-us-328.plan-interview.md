---
step: 2
slug: us-328
workflowId: us-328-20260913T160800Z
status: completed
startedAt: "2026-09-13T16:08:00Z"
endedAt: "2026-09-13T16:10:46.882Z"
acRefs: []
---
# Plan interview — us-328

## Registry

### Q1: Mirror sync method — renderer regen vs hand-edit?
- **Finding:** `.agents/skills/ws-shared/autoload.md` is generated from `runtime/autoload.md` by
  `renderConsumerAutoloadText` (`bin/cli.js:137-151`): eight same-dir `](file)` → `](runtime/file)` rewrites
  (AGENTS, CROSS-PLATFORM, config-resolution, gates, host-dispatch, scm-provider-contract, setup, tools)
  plus `../../(ws-…)` → `../(ws-…)` skill-path shift. Prose tokens pass through untouched.
- **Decision:** Edit source prose, then apply the renderer transform to the mirror and diff-verify that only
  the prose row + the three stale sibling links (`tools.md`, `scm-provider-contract.md`, `gates.md`) change.
- **Status:** resolved — regen path (never mirror-only hand fix; it would regress on next install/update).

### Q2: Do the sibling link targets need fixing, or only the prose row?
- **Finding:** Issue claims upstream link targets already correct, but on-disk evidence shows the generated
  mirror at `ws-shared/autoload.md:5,141,142` uses bare `](tools.md)` / `](scm-provider-contract.md)` /
  `](gates.md)`, which resolve to non-existent `ws-shared/*.md` paths (`Test-Path` False × 3; runtime
  counterparts True × 3). `runtime/autoload.md` same-dir links are correct from inside `runtime/`.
- **Decision:** Include the three mirror link-target fixes (they are exactly what the renderer emits, so the
  mirror stays renderer-stable). No renderer code change needed — eight-file list already covers them.
- **Status:** resolved — in scope; verified renderer-stable post-regen.

### Q3: Memory-trap conflicts (check_memory_conflict exit 2, force_interview=true)?
- **Traps folded:**
  - `[2026-09-12] Portable skill prose must not cite internal spec numbers` (Medium) → fix prose keeps the
    portable `{sharedDir}/runtime/…` token form; regression test comments stay generic (no `us-328`/`0081`
    literals in shipped skill bodies; the test file itself asserting paths is not a skill body).
  - `[2026-09-09] Integrity regeneration follows final skill edits` (Medium) → regen after final edits,
    same commit; verify before test suite.
  - `[2026-09-12] Never commit consumer-local probe cache upstream` (High) → never stage
    `host-capabilities.json`; product commits path-scoped to `files_touched` only.
  - `[2026-09-11] Anchor G2 staging skip-filters to the plans dir` (High) → stage union of this slug's
    `files_touched` minus `{plansDir}`, secrets, gitignored, `preExistingDirty` (`test/package.json`).
  - `[2026-09-06] Regenerate integrity from a clean tree only` (High) → move aside untracked skill-tree
    files if any appear before regen (currently only `{plansDir}/us-328/` + specs, both outside the hash walk).
- **Status:** resolved — all folded; no plan change required beyond the existing steps.

### Q4: Version bump required?
- **Finding:** `runtime/autoload.md` is a hashed hub input (`bin/skill-integrity.json` → `hub.files`);
  AGENTS.md upstream rule: package-content shipment needs `package.json` version strictly higher than the
  PR merge-base (one patch bump per release PR) plus aligned `packageVersion` in
  `bin/skill-dependencies.json` + site footer via `npm run build-site:bump`.
- **Decision:** Patch bump (`0.4.23` → `0.4.24`) in the ship commit; regen integrity after bump; rebuild site.
- **Status:** resolved — in scope.

### Q5: Gray area / companion context.md?
- **Finding:** Single correct path (token must match on-disk layout); no second valid product option.
- **Decision:** No `context.md` (never write an empty companion).
- **Status:** resolved — skipped with reason.

## Verdict

Plan approved as refined below. No open blockers. Auto-confirm per autoMode (2c End auto-confirms 2e).
