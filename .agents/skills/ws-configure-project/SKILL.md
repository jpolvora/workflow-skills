---








name: ws-configure-project
version: 0.3.10
description: Project configuration wizard — detects project settings, then AutoConfig or confirm-by-group interview to populate ws-shared/config.json.
invocation_names:
  - configure-project
  - ws-configure-project
---

# ws-configure-project

> When this skill is loaded, output "ws-configure-project loaded."

Fill or refresh consumer `config.json` via detect → mode gate (AutoConfig or confirm-by-group) → write. Portable: no host-product names; paths use `{plansDir}` tokens after write.

**Config path:** `{sharedDir}/config.json` (gitignored). Template: [`ws-shared/config.json.example`](../ws-shared/config.json.example). Schema: [`shared/config.schema.json`](../ws-shared/config.schema.json).

**Callers:** standalone anytime; [`ws-shared/setup.md`](../ws-shared/setup.md) bootstrap step 1; post-install when user opts in.

## Invocation

```
/ws-configure-project [--section <name>] [--detect-only] [--force]
```

| Flag | Effect |
|------|--------|
| `--section` | Only interview that top-level key (`project`, `stack`, `providers`, `verification`, `plans`, `reviews`, `rules`, `domain`, `fable`, `defaults`, **`autoload`**, **`patterns`**). `defaults` includes delivery-commit artifacts and pattern tracking options. |
| `--detect-only` | Print detections + suggestions; do not write |
| `--force` | Re-interview even when required fields look filled. With AutoConfig, overwrite filled non-placeholder values with detections/defaults. |

**`--section autoload` / `--section patterns`:** mutates `config.json` for `defaults.autoload` (default / Recommended = `false`) and pattern flags (`defaults.patternsBackend`, `defaults.patternsFrontend`). Also refreshes `{sharedDir}/autoload.md` Always-applied paths and, when the user enables autoload, generates/refreshes root `AGENTS.md` (see Steps § Autoload). Helper: `python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py`. AutoConfig helper: `python {skillsRoot}/ws-configure-project/scripts/configure_autoconfig.py`.

## Steps

1. **Ensure file** — If `config.json` missing: `cp` from `config.json.example`. If example missing, STOP (hub not installed). For `--section autoload`, still ensure `config.json` exists (seed from example) because the section persists `defaults.autoload`.
   - Done when: `config.json` exists on disk (or detect-only with example readable).

2. **Detect** — Scan the consumer repo for stack, SCM, and commands. Apply heuristics in [`INTERVIEW.md`](INTERVIEW.md) § Detection. Build a suggestion map (path → value) without writing yet. For `--section autoload`, detect per-skill install scope only (project-local vs global) and current `defaults.autoload`.
   - Done when: suggestion map covers at least `project`, `providers`/`issueTrackers`, `verification`, and `plans.dir` (defaults OK); or autoload path map + effective flag is ready.

3. **Gap list** — Compare current `config.json` to required keys in INTERVIEW.md § Required. Mark each: filled / placeholder (`<…>` or empty) / missing. For `--section autoload`, gap is only `defaults.autoload` (+ root file consistency when true).
   - Done when: gap list exists; `--force` treats filled as re-ask candidates.

4. **Mode gate** — Full invoke only (no `--section`, no `--detect-only`). After Detect + Gap list, before per-section Interview. `user-gate` (host structured-choice UI when available; markdown fallback + log `user-gate-fallback`). See [`INTERVIEW.md`](INTERVIEW.md) § Mode gate.

   ```text
   How should ws-configure-project apply detections to config.json?

   1. AutoConfig and save (Recommended)
   2. Ask user confirmations
   ```

   Cancel / dismiss → HS-1 (STOP, re-present, never infer AutoConfig, never write).
   - **A — AutoConfig and save:** one merge-write of the suggestion map plus INTERVIEW.md / example reasonable defaults. Skip steps 5, 7, and 8 gates. Write via:

     ```bash
     python {skillsRoot}/ws-configure-project/scripts/configure_autoconfig.py \
       --apply --suggestions suggestions.json [--force] [--json]
     ```

     Agent writes `suggestions.json` from the Detect map (nested JSON matching `config.json` keys). Helper fills placeholders/missing; does not clobber filled values unless `--force`. Never commit `config.json`. Then apply Stack companion **Recommended** (step 6, no extra gate): set `rules.stackFile` to `{sharedDir}/STACK.md` when that file exists; if missing, generate it under `{sharedDir}/` (setup 1b). Optional `--write-autoload` path refresh only. Do **not** `--write-root-agents`, do **not** set `defaults.autoload` true, do **not** install the secrets hook.
   - **B — Ask user confirmations:** continue at step 5 (current group-by-group interview).
   - Skip this step when `--detect-only` (end after step 2, no write) or `--section` (go to step 5 for that section only).
   - Done when: A wrote config + skipped per-section gates, or B selected, or this step was skipped.

5. **Interview** — Only on mode **B** or `--section`. For each gap (or `--section` only): user-gate with ≥2 options, **recommended = detected suggestion** first; include **Keep current** / **Skip**. Write accepted values into `config.json` after each section (default). Batch-write only when the user picks that option at a user-gate. Never commit `config.json`. Autoload enablement gate: see step 7 (Recommended = No / `false`).
   - Done when: all required gaps resolved or explicitly skipped; optional sections offered once then skippable. Skip entirely after mode A.

6. **Stack companion** — Default `rules.stackFile` = `.agents/skills/ws-shared/STACK.md` (installer-seeded; consumer-owned). Prefer that path. Do **not** require or create a repo-root stack file. Skip when `--section autoload`. After mode A: apply Recommended with no extra gate (existing shared file, or generate under `{sharedDir}/`).
   - If shared `STACK.md` exists but config points at a missing root file: suggest set `rules.stackFile` → `.agents/skills/ws-shared/STACK.md` (**Recommended**) / Keep current / Skip.
   - If the resolved target is missing: offer **Generate** into `.agents/skills/ws-shared/STACK.md` (setup 1b heuristics) / **Skip**. Write only under `.agents/skills/ws-shared/` unless the user explicitly chose another path.
   - Done when: config points at an existing companion, or user skipped (mode B); or Recommended applied (mode A).

7. **Autoload** — Run when full interview (mode B) reaches optional extras, or immediately for `--section autoload`. Skip the enablement gate after mode A (helper already left `defaults.autoload` false or kept a filled value; never true from AutoConfig). See [`INTERVIEW.md`](INTERVIEW.md) § Autoload.
   1. Ensure `{sharedDir}/autoload.md` exists (installer hub template). user-gate: **Enable consumer root autoload of Always-applied skills?** — **No (`false`, Recommended)** / Yes (`true`) / Keep current / Skip.
   2. On **Yes (`true`)** — write root **before** persisting the flag (never leave `defaults.autoload: true` after a refused root write):
      1. If a non-generated root `AGENTS.md` exists: user-gate **Overwrite with `.bak` (`--force`)?** — **No (Recommended)** → stop with flag left false; **Yes** → proceed with `--force`.
      2. `python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --write-autoload --write-root-agents [--force]` — refreshes Always-applied paths and writes thin repo-root `AGENTS.md` that (a) points at `{sharedDir}/AGENTS.md`, (b) instructs agents to load Always-applied from `autoload.md`, (c) notes root autoload overrides shared-hub on-demand defaults. Paths: project-local `.agents/skills/ws-<id>/SKILL.md` when present; else `{globalSkillsRoot}/ws-<id>/SKILL.md`. Never absolute author-machine paths. Default `--repo-root` is **cwd**. Helper refuses non-generated root without `--force` (writes `AGENTS.md.bak` when forced).
      3. Only after root write succeeds: `python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --set-autoload true`. On any failure after a premature flag write, roll back with `--set-autoload false`.
   3. On **No (`false`)** / Keep current (when already false) / Skip: `python {skillsRoot}/ws-configure-project/scripts/configure_autoload.py --set-autoload false` (or leave false); optionally `--write-autoload` to refresh paths; do **not** require creating root `AGENTS.md`.
8. **Security pre-commit hook** — Skip after mode A (equivalent to No / Recommended; do not install). On mode B, ask via `user-gate`: **Install git pre-commit secrets leak review hook (`ws-secrets-leak-review`)?**
   - Options: **No (`false`, Recommended)** / Yes (`true`) / Skip.
   - On **Yes (`true`)**: run `bash {skillsRoot}/ws-secrets-leak-review/scripts/install-hook.sh`.
   - Never auto-installed or enforced on install; presented strictly as an optional interview gate.
   - Done when: skipped (mode A) or user selection handled; hook installed if explicitly requested.

9. **Validate & handoff** — Confirm JSON parses (when config touched); required fields non-placeholder; print summary table (`key` → `value`). For autoload: run `--check` and print findings (includes `effectiveAutoload`). Tell caller: resume setup / run `/ws-spec-to-pr` or `/ws-spec-to-pr-lite`.
   - Done when: summary shown; `--detect-only` ends after step 2 with no write.

## Rules

- Prefer detect + suggest over blank prompts.
- Do not invent org/repo secrets; leave PAT/env keys as env-var names only.
- `providers.scm` never `local`; hybrid `active=local` + `scm=github|azure-devops` allowed.
- AutoConfig never sets `defaults.autoload` true, never writes repo-root `AGENTS.md`, never installs the secrets hook, never commits `config.json`.
- Artifact defaults: `plans.dir` → `.agents/plans`, `plans.specsDir` → `.agents/specs` (prefer existing repo-root `specs/`), `reviews.dir` → `.agents/codereviews`, `rules.changelogFile` → `.agents/skills/ws-shared/CHANGELOG.md` unless user picks otherwise.
- Delivery commit artifacts (`defaults.deliveryCommitArtifacts`): interview under `defaults` / `--section defaults` per [`INTERVIEW.md`](INTERVIEW.md); recommended = refined plan on, delivery result off, opt-ins off (see [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md) § Step 8).
