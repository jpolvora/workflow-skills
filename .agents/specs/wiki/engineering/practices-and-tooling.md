# Practices & Tooling (`engineering`)

## Feature Overview

Engineering practices keep diffs surgical and the toolchain uniform: `ws-karpathy-guidelines` (minimum code, touched-lines traceability), `ws-tdah` (action-first reply shape), `ws-fable-method` (evidence-based investigate loop), and `ws-senior-developer` (scope, anti-reinvention, ambiguity stops, pre-ship proof) form the always-applied core, authored under `SKILL_AUTHORING.md` progressive-disclosure rules (3-tier, tool-first, zero-sediment). `ws-megabrain` handles spec-optional vibe coding by consuming those companions through capped specialists instead of duplicating them. All packaged helper scripts run on a single Node 22 `.cjs` runtime; Windows users get a native PowerShell config editor; global installs project per-skill symlinks into host skill dirs.

## Business Rules & Logic

- **Surgical scope**: touch only what the request requires; every changed line traces to it; orphans the change created are removed, unrelated dead code is mentioned but left alone.
- **One runtime**: new `.py` helpers are forbidden; bash survives only as thin host adapters that exec node; `ws-check-harness` fails critical on any reappearing `.py`; the suite runs with Python absent from `PATH`.
- **Config editor safety**: the GUI preserves `_comment*` keys and unmodeled fields, writes UTF-8 2-space JSON atomically after a `.bak` backup with a dirty guard, and exits cleanly on non-Windows/headless pointing at `ws-configure-project`.
- **Megabrain deference**: defers whenever Spec-to-PR owns the session; reads at most two specialist references after mode/`user-gate`; cancels cleanly on gate dismiss.
- **State hygiene**: nested telemetry maps serialize as YAML mappings (never Python-repr strings); duplicate `completedSteps` union-sort; step artifact `status` equals the per-step result via one derivation path; only `created`/`modified`/`deleted` flags accumulate.
- **Git safety**: workflow cleanup detaches worktrees and deletes only `uswf-*` tags, never protected branches; failures never throw unhandled or corrupt telemetry.

## Technical Architecture

- **Practices**: `SKILL_AUTHORING.md`, `ws-megabrain/SKILL.md` (Router/Domain tables, `references/*.md` specialists, `REVERSE.md` archaeology-only), `cleanup_workflow_git.py` unified cleanup, `configure_autoload.py --write-root-agents/--check`.
- **Runtime**: `.cjs` helpers over shared `ws-shared` scripts, zero npm runtime deps, `package.json` engines `node >= 22`; `runtime/scripts/Edit-WorkflowSkillsConfig.ps1` (WinForms, PS 5.1/7+, themes, tabbed hybrid layout with search; description precedence `_comment_<prop>` > schema > fallback).
- **Fixes carried**: `update_state.py` serialization/duplicate keys, `workflow_state.cjs` artifact stamping + file-list accumulation, doctor ESM/`--json` contract, provider canonical tables with explicit python launchers.
- **Provenance**: living synthesis of specs 0008, 0011, 0025, 0042, 0055, 0058, 0063, 0072, and 0074.
