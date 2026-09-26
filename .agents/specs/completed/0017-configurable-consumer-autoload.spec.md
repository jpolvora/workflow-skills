---
id: null
slug: configurable-consumer-autoload
title: "Configurable consumer autoload (config flag + root AGENTS.md + harness)"
source: local
specDate: 2026-08-10
status: completed
---

# Specification — Configurable consumer autoload (config flag + root AGENTS.md + harness)

## Description

Consumers can already opt into Always-applied skills via `ws-configure-project --section autoload` (refreshes `{sharedDir}/autoload.md` and optionally generates root `AGENTS.md`). That flow does **not** persist a boolean in `config.json`, so agents and `ws-check-harness` cannot tell whether root autoload was intentionally enabled.

This feature adds an **explicit, default-off config flag** so consumer projects can record the choice, configure-project can interview it, and harness can enforce consistency when the flag is on.

### Goals

1. Persist `autoload` (boolean) in project `config.json` (seeded in `config.json.example` + `config.schema.json`).
2. **Default = `false`** when the key is omitted, when `config.json` is missing, or when the hub is not yet configured.
3. During `ws-configure-project` (full interview optional extras, or `--section autoload`), ask via user-gate whether Always-applied / autoloadable skills should be promoted via **repo-root `AGENTS.md`** (create if absent; refresh/merge when present).
4. When the user accepts enablement, write `autoload: true` (or the chosen path under `defaults`) **and** create/update root `AGENTS.md` so it loads the Always-applied set from `{sharedDir}/autoload.md` (skills such as `ws-senior-developer`, `ws-tdah`, `ws-changelog`, `ws-self-learning`, `ws-fable-method`, and any other rows in that table).
5. Extend `ws-check-harness` so that when `autoload` resolves to `true`, root `AGENTS.md` **must** exist and must reference / instruct loading of the autoloadable Always-applied skills; when `false` or config absent, missing root `AGENTS.md` remains OK (same as today).

### Proposed config shape

Prefer a single boolean under `defaults` so `--section defaults` / the existing optional-extras path can own it without inventing a new top-level interview section (name may be adjusted in plan if a clearer key is found):

| Key (proposed) | Type | Default | Meaning |
|----------------|------|---------|---------|
| `defaults.autoload` | boolean | `false` | When `true`, consumer intends root `AGENTS.md` to autoload Always-applied skills from `{sharedDir}/autoload.md`. |

**Resolution rule (mandatory):**

| Condition | Effective `autoload` |
|-----------|----------------------|
| No `$PWD/.agents/skills/ws-shared/config.json` | `false` |
| Key omitted / null / unreadable | `false` |
| Explicit `true` / `false` | that value |

### Configure interview

`ws-configure-project` must ask (user-gate) when running the autoload step (full interview or `--section autoload`):

1. Enable consumer root autoload of Always-applied skills? **Recommended: No (`false`)** (keeps shared-hub on-demand defaults).
2. If user chooses **Yes (`true`)**:
   - Write `defaults.autoload: true` into `config.json`.
   - Refresh `{sharedDir}/autoload.md` Always-applied paths (existing helper).
   - Create root `AGENTS.md` if missing, or refresh/add autoload instructions when it exists (existing `configure_autoload.py --write-root-agents` / `--force` rules: do not silently overwrite a non-generated root file without user-gate / `--force` + `.bak`).
3. If user chooses **No (`false`)** / Keep current / Skip:
   - Write or leave `defaults.autoload: false` (or omit and treat as false).
   - Do **not** require creating root `AGENTS.md`.

Standalone `--section autoload` **must** mutate `config.json` for this flag (behavior change vs today: INTERVIEW currently says autoload is “not a `config.json` section”). Path refresh of `autoload.md` remains separate from the boolean.

### Harness enforcement

| Effective `autoload` | Root `AGENTS.md` | Expected harness outcome |
|----------------------|------------------|--------------------------|
| `false` / config missing | absent or present | Missing root remains **OK**; no new critical for absence |
| `true` | absent | **critical** (or equivalent fail) — suggest `ws-configure-project --section autoload` |
| `true` | present but does not reference `{sharedDir}/autoload.md` / Always-applied set (or equivalent durable instruction to load those skills) | **critical** or **warning** with clear fix (prefer critical when flag is true and membership is missing) |
| `true` | present and loads Always-applied skills (e.g. `ws-senior-developer`, `ws-tdah`, `ws-changelog`, `ws-self-learning`, `ws-fable-method` via `autoload.md`) | **OK**; dual-hub vs shared-hub on-demand remains intentional override (not drift) |

Reuse / extend `configure_autoload.py --check` where practical so harness and configure share one SoT for path membership checks.

### Out of scope

- Changing the Always-applied skill **membership** list itself (still owned by `{sharedDir}/autoload.md`; this feature only gates whether root promotes that list).
- Forcing installer to write root `AGENTS.md` on install/update (installer still never creates consumer root `AGENTS.md`).
- Autoloading `ws-karpathy-guidelines` via this flag (remains shared-hub mandatory when the hub loads; not part of the Always-applied promotion set).
- Requiring root `AGENTS.md` for consumers who leave `autoload` false.

## Acceptance Criteria

- AC1: `config.json.example` and `config.schema.json` define a boolean autoload flag (proposed `defaults.autoload`) with default `false`.
- AC2: Effective value is `false` when project `config.json` is missing, when the key is omitted, or when the value is not an explicit `true`.
- AC3: `ws-configure-project` interviews enablement of consumer root autoload (full interview optional extras and `--section autoload`) with user-gate options; **Recommended = No (`false`)**; writes the accepted boolean into project `config.json`.
- AC4: When the user accepts `true`, configure-project creates root `AGENTS.md` if absent, or refreshes/adds autoload instructions when present (respecting existing non-generated-file `--force` / `.bak` safety), and ensures `{sharedDir}/autoload.md` Always-applied paths are refreshed.
- AC5: When the user accepts `false` (or skips), configure-project does not require root `AGENTS.md`; effective autoload remains off.
- AC6: `--section autoload` persists the boolean in `config.json` (docs/INTERVIEW updated: autoload is no longer “not a config.json section” for this flag).
- AC7: `ws-check-harness` (consumer mode) reads effective `autoload`; when `true`, fails closed if root `AGENTS.md` is missing or does not instruct loading of Always-applied / autoloadable skills from `{sharedDir}/autoload.md` (including skills such as `ws-senior-developer`, `ws-tdah`, `ws-changelog`, and other Always-applied rows).
- AC8: When effective `autoload` is `false` or config is absent, missing root `AGENTS.md` remains OK (no new critical for absence alone).
- AC9: When `autoload` is `true` and root correctly references `autoload.md` Always-applied, harness does **not** flag dual-hub drift solely because shared-hub documents those skills as on-demand.
- AC10: Hub docs updated (`ws-configure-project` SKILL/INTERVIEW, `ws-shared` AGENTS/autoload notes as needed, `ws-check-harness` PHASES): en-us, harness-neutral; installer still never silently writes consumer root `AGENTS.md`.
- AC11: Automated tests cover: (1) omitted/missing config → effective false; (2) configure writes true + root file; (3) configure writes false without requiring root; (4) harness critical when true + missing/incomplete root; (5) harness OK when false + missing root.

## Notes

- Builds on shipped [`shared-autoload-md`](shared-autoload-md.spec.md) (autoload.md + configure helper + harness path checks). This spec adds the **persisted opt-in flag** and **flag-gated harness enforcement**.
- Always-applied set SoT remains `{sharedDir}/autoload.md` (today: `ws-senior-developer`, `ws-self-learning`, `ws-changelog`, `ws-fable-method`, `ws-tdah`). Do not hardcode the list in multiple places beyond referencing that table.
- Path emission rules from shared-autoload-md still apply (no absolute author-machine paths).
- Downstream: register via `ws-local-spec-provider` before orch/planning when a workflow needs `{us-dir}/step-00-`.
