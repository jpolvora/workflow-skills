---
id: null
slug: ws-configure-project-autoconfig-gate
title: "ws-configure-project AutoConfig vs confirm-by-group user-gate"
source: local
specDate: 2026-08-12
---

# Specification — ws-configure-project AutoConfig vs confirm-by-group user-gate

## Description

### Problem

`ws-configure-project` always interviews **group by group** (detect → suggest → `user-gate` per section). There is no first-choice path to accept the full detection map and write `config.json` in one shot. Fresh installs and bootstrap callers pay a long confirmation sequence even when detections and INTERVIEW.md Recommended defaults are already enough.

### Solution

After **Ensure file** and **Detect** (suggestion map ready), and **before** the per-section Interview loop, present a **mode** `user-gate` (host structured-choice UI when available, including AskQuestion; markdown fallback otherwise) with exactly two options:

```text
How should ws-configure-project apply detections to config.json?

1. AutoConfig and save (Recommended)
   Run full autodetect and write values now. No per-section questions. Undetected keys get INTERVIEW.md / schema reasonable defaults.
2. Ask user confirmations
   Detect step by step and confirm group by group (current behavior).
```

| Choice | Behavior |
|--------|----------|
| **A — AutoConfig and save** | One merge-write of the suggestion map plus reasonable defaults. Skip per-section Accept / Keep / Edit / Skip gates. Then Validate & handoff (summary table). |
| **B — Ask user confirmations** | Existing SKILL.md step 4 Interview + INTERVIEW.md order: one `user-gate` per gap/section (Accept suggestion / Keep current / Edit / Skip), write after each section. |

Recommended option: **A**. Cancel / dismiss is HS-1 (STOP, re-present, never infer AutoConfig, never write).

Do not name a specific IDE in skill bodies; keep portable `user-gate` vocabulary. Host AskQuestion (or equivalent structured choice) is the preferred native UI when the host provides it.

### AutoConfig write rules (choice A)

1. Reuse the Detect suggestion map from SKILL.md step 2 / INTERVIEW.md § Detection. Do not skip Detect.
2. Merge-write into `{sharedDir}/config.json`. Do not delete unknown keys. Preserve `_comment*` keys.
3. Fill **placeholders** (`<…>` or empty required keys) and **missing** keys with detected suggestions.
4. For keys with no detection signal, write INTERVIEW.md / `config.json.example` **reasonable defaults** (examples: `plans.dir` → `.agents/plans`; `plans.specsDir` → existing repo-root `specs/` else `.agents/specs`; `reviews.dir` → `.agents/codereviews`; `rules.changelogFile` → `.agents/skills/ws-shared/CHANGELOG.md`; `workingBranch` → `develop`; `gitRemote` → `origin`; `providers.scm` from remote host; `fable.*` Recommended when fable skills are installed).
5. **Do not clobber** already-filled non-placeholder values unless `--force`. `--force` + AutoConfig overwrites those keys with detections/defaults.
6. Never commit `config.json`.
7. Never invent org/repo secrets or PAT values; leave env-var names only (`ADO_PAT`, etc.).
8. `providers.scm` is never `local`. Hybrid `active=local` + `scm=github|azure-devops` remains valid.

### AutoConfig must not auto-apply destructive / explicit-opt-in extras

These stay at INTERVIEW.md **Recommended** without a second prompt:

| Extra | AutoConfig action |
|-------|-------------------|
| `defaults.autoload` | Write/leave `false`. Do **not** create or overwrite repo-root `AGENTS.md`. Do **not** run `--write-root-agents`. Optional `--write-autoload` path refresh only is allowed. |
| Secrets pre-commit hook | Do **not** install. Equivalent to No (`false`, Recommended). |
| Non-generated root `AGENTS.md` overwrite | Never. No `--force` root write from AutoConfig. |

Stack companion: if `{sharedDir}/STACK.md` exists, set `rules.stackFile` to that path when the key is a gap. If the resolved companion is missing, generate `{sharedDir}/STACK.md` from setup 1b heuristics (same as Interview **Generate** Recommended). Do not create a repo-root `STACK.md`.

### When the mode gate is skipped

| Situation | Behavior |
|-----------|----------|
| `--detect-only` | No mode gate. Print detections + suggestions. No write. |
| `--section <name>` | No mode gate. Keep current single-section interview (including `autoload` / `patterns` / `defaults`). |
| Resume of an in-progress configure session | Not applicable (skill is stateless per invoke). Each invoke shows the gate unless skipped above. |

### Confirm-by-group (choice B)

Unchanged from current SKILL.md steps 4–7 and INTERVIEW.md: section order, per-group `user-gate`, write after each section, autoload enablement gate (Recommended = No), optional secrets-hook gate (Recommended = No).

### Docs

Update `ws-configure-project/SKILL.md` (new step between Detect/Gap list and Interview) and `INTERVIEW.md` (mode gate + AutoConfig write rules). No host-product names in skill prose.

### Out of scope (v1)

- New CLI flag `--auto` / `--autoconfig` (a later invoke can add it as “take A without the gate”).
- Changing detection heuristics themselves (this spec only adds a write-mode choice).
- Auto-install of `ws-secrets-leak-review` hook or auto-enable of consumer root autoload.
- Committing `config.json` or writing consumer repo-root files other than the existing STACK.md generate path under `ws-shared/`.

## Acceptance Criteria

- AC1: On a full `/ws-configure-project` invoke (no `--section`, no `--detect-only`), after Detect has a suggestion map and before per-section Interview, the agent presents a `user-gate` with exactly two options: **AutoConfig and save** (Recommended, first) and **Ask user confirmations**; cancel/dismiss is HS-1 (STOP, re-present, no write, no inferred yes).
- AC2: The gate uses portable `user-gate` (host structured-choice / AskQuestion when available; same two options as markdown fallback with `user-gate-fallback` log). Skill bodies do not name a specific IDE.
- AC3: Choosing **AutoConfig and save** merge-writes detections plus INTERVIEW.md / example reasonable defaults into `{sharedDir}/config.json` in one batch, skips per-section confirmation gates, then prints the existing Validate & handoff summary table.
- AC4: AutoConfig fills placeholders and missing required keys; it does not overwrite already-filled non-placeholder values unless `--force` was passed.
- AC5: AutoConfig never writes secrets/PAT values, never sets `providers.scm` to `local`, never installs the secrets pre-commit hook, never sets `defaults.autoload` to `true`, and never writes or overwrites repo-root `AGENTS.md`.
- AC6: Choosing **Ask user confirmations** keeps current group-by-group interview (INTERVIEW.md order; Accept / Keep current / Edit / Skip per section; write after each section).
- AC7: `--detect-only` skips the mode gate, prints detections, and writes nothing. `--section <name>` skips the mode gate and interviews only that section.
- AC8: `ws-configure-project/SKILL.md` and `INTERVIEW.md` document the mode gate, AutoConfig write rules, and the skip table; `config.json` remains gitignored and is never committed by this skill.

## Notes

- **Assumption:** “Reasonable defaults” means INTERVIEW.md Recommended values and `config.json.example` defaults, not invented project-specific commands. Undetected verification commands may stay empty when that stack side is absent (existing Required rule).
- **Assumption:** Bootstrap / setup.md callers that invoke full configure-project hit this gate; they do not silently AutoConfig.
- **Depends on:** `ws-configure-project/SKILL.md` steps 1–8; `INTERVIEW.md` detection + interview order; `ws-shared/gates.md` `user-gate` / HS-1; `tools.md` `user-gate`.
- **Related:** `configurable-consumer-autoload.spec.md` (autoload remains explicit-opt-in; AutoConfig must not enable it).
- **Next:** register via `ws-local-spec-provider` when starting a workflow; classify with `ws-classify-complexity`.
