---
id: null
slug: configurable-delivery-commit-artifacts
title: "Configurable delivery-commit artifacts (config + ws-configure-project)"
source: local
specDate: 2026-08-10
---

# Specification — Configurable delivery-commit artifacts (config + ws-configure-project)

## Description

Today Step 8 delivery (`ws-ship-pr` / G2-delivery) always stages **plan + delivery result** into the final commit / PR:

1. `step-02-{slug}.plan.refined.md` if present, else `step-01-{slug}.plan.md`
2. `step-08-{slug}.result.md`

Consumers cannot choose which `{us-dir}` artifacts ship with the delivery commit. This feature adds **config-driven include toggles** (interviewed by `ws-configure-project` with sensible defaults) so the project decides what enters the shipping/delivery commit.

### Goals

- Add a `config.json` options block for delivery-commit artifact includes.
- Interview those options in `ws-configure-project` (full interview and `--section defaults` / dedicated ship-artifacts prompts) with recommended defaults shown first.
- Make `ws-ship-pr`, `gates.md` G2-delivery, `tools.md` `commit-delivery`, and `ARTIFACTS.md` § Step 8 read the toggles instead of hardcoding plan+result.
- Keep product/source commits unchanged; this feature only governs **plan-dir delivery artifacts** staged at Step 8.

### Default posture (required)

| Artifact class | Config key (proposed) | Default | Notes |
|----------------|----------------------|---------|-------|
| Refined plan (or plan fallback) | `defaults.deliveryCommitArtifacts.includeRefinedPlan` | `true` | When true: stage `step-02-{slug}.plan.refined.md` if present, else `step-01-{slug}.plan.md` (same fallback rule as today). |
| Delivery result | `defaults.deliveryCommitArtifacts.includeDeliveryResult` | `false` | When false: do **not** stage `step-08-{slug}.result.md`. |
| Other plan-dir artifacts | `defaults.deliveryCommitArtifacts.include*` (below) | all `false` | Opt-in extras; never staged unless explicitly enabled. |

### Other artifacts (opt-in, default false)

Expose boolean toggles for commonly useful extras (names may be adjusted in plan as long as defaults and semantics hold):

| Toggle | Stages when true and file exists |
|--------|----------------------------------|
| `includeSpec` | `step-00-{slug}.spec.md` |
| `includeCheckReport` | `step-05-{slug}.plan.report.md` |
| `includeCodeReview` | `step-06-{slug}.review.md` |
| `includeTestingReport` | `step-07-{slug}.testing.report.md` |

**Still never staged** (runtime / non-delivery): `{workflow-id}.state.md`, `step-00-{slug}.issue.json`, `step-00-{slug}.classify.md`, exec/DAG files, telemetry, worktrees, and any path listed as non-committable in `ARTIFACTS.md` unless a future toggle is explicitly added.

### Configure interview

`ws-configure-project` must ask (user-gate, recommended = default above) when interviewing `defaults` (or a clearly labeled shipping/delivery-artifacts subsection):

1. Include refined plan (or plan fallback) in delivery commit? **Recommended: Yes (`true`)**
2. Include delivery result (`step-08-*.result.md`)? **Recommended: No (`false`)**
3. Include other artifacts? Offer multi-select / per-toggle gates for the opt-in list above; **Recommended: none** (all false). Keep current / Skip allowed.

Write accepted values into `config.json`. Seed the same keys in `config.json.example` and validate via `config.schema.json`.

### Consumers of the toggles

| Surface | Change |
|---------|--------|
| `ARTIFACTS.md` § Step 8 delivery commit | Stage set = enabled toggles only (not hardcoded plan+result). |
| `gates.md` G2-delivery | Same staging rule; gate option labels may say “commit selected delivery artifacts” instead of implying plan+result always. |
| `tools.md` `commit-delivery` | Resolve stage list from config. |
| `ws-ship-pr` | When performing delivery commit, stage only enabled artifacts that exist on disk. |

Missing file for an enabled toggle: skip that path with a clear note in the delivery result / prepare board (do not invent content). If `includeRefinedPlan` is true and **neither** refined plan nor plan exists, fail closed (same as today’s missing-plan case). If **all** enabled includes resolve to zero files, fail closed with a clear error (do not create an empty delivery commit of plan artifacts).

### Out of scope

- Changing when product/source files are committed (implementation commits remain separate).
- Forcing `step-08` result file generation off when `includeDeliveryResult` is false (result may still be written for orch evidence; it simply is not staged unless included).
- Committing `{specsDir}` specs of record, reviews under `{reviewsDir}`, or MEMORY/changelog as part of this toggle set.
- Lite vs standard divergence beyond shared G2-delivery / `ws-ship-pr` behavior (both read the same config).

## Acceptance Criteria

- AC1: `config.json.example` and `config.schema.json` define `defaults.deliveryCommitArtifacts` with booleans `includeRefinedPlan` (default `true`), `includeDeliveryResult` (default `false`), and the opt-in toggles `includeSpec`, `includeCheckReport`, `includeCodeReview`, `includeTestingReport` (each default `false`).
- AC2: Fresh install / missing block behavior treats omitted keys as the defaults in AC1 (refined plan on, delivery result off, other artifacts off) — no silent revert to “always stage plan+result”.
- AC3: `ws-configure-project` interviews delivery-commit artifact includes during `defaults` (and/or `--section defaults`) with user-gate options, recommended = AC1 defaults, and writes accepted values into project `config.json`.
- AC4: `ARTIFACTS.md` § Step 8 delivery commit documents config-driven staging and lists which toggles map to which filenames; removes the unconditional “always stage plan + result” rule.
- AC5: `gates.md` G2-delivery and `tools.md` `commit-delivery` stage only artifacts enabled by `defaults.deliveryCommitArtifacts` (refined-plan fallback rule preserved when `includeRefinedPlan` is true).
- AC6: `ws-ship-pr` delivery commit respects the same config: does not stage `step-08-{slug}.result.md` when `includeDeliveryResult` is false; stages refined/plan when `includeRefinedPlan` is true; stages opt-in extras only when their toggles are true and files exist.
- AC7: When `includeRefinedPlan` is true and neither `step-02-*.plan.refined.md` nor `step-01-*.plan.md` exists, delivery commit fails closed with a clear error; when an opt-in toggle is true but its file is missing, that path is skipped with a logged note (not a hard fail by itself).
- AC8: When every enabled include resolves to no files on disk, delivery commit fails closed (no empty plan-artifact delivery commit).
- AC9: Product/source staging and PR create/push behavior are unchanged except for which `{us-dir}` delivery artifacts are added to the delivery commit.
- AC10: Hub docs that describe “commit plan + result” (`ws-shared` gates/tools, ship-pr skill prose as needed) are updated to “commit configured delivery artifacts” with the new defaults called out; `ws-check-harness` reports 0 critical after the doc/schema/skill edits.

## Notes

- **Behavior change vs today:** shipping will **stop** including `step-08-*.result.md` by default. Call this out in CHANGELOG / release notes when implemented.
- **Naming:** keep the block under `defaults` so `--section defaults` covers it without a new top-level section; rename only if plan finds a cleaner home that configure-project already interviews.
- **Related:** `invariants.commitPlanFilesOnlyAtStep8` remains about *when* plan files may be committed, not *which* files; do not overload that flag for include selection.
- **Next after this draft:** register via `ws-local-spec-provider` when starting a workflow; classify with `ws-classify-complexity`.
