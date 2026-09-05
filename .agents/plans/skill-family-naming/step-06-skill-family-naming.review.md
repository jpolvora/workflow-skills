---
step: 6
slug: skill-family-naming
workflowId: skill-family-naming-20260902T215014Z
status: active
startedAt: "2026-09-02T21:50:14Z"
endedAt: "2026-09-05T00:10:49.432Z"
acRefs: []
base: main
snapshot: git diff main...HEAD (scoped to skill-family-naming renames)
---
# Code review — skill-family-naming (Step 6)

- **Base:** `main`; snapshot `git diff main...HEAD` scoped to this workflow's rename blast radius (10 skill moves, dependency graphs, orch/dispatch/docs/hubs/authoring/harness/installer/tests/integrity).
- **Scope note:** the raw `main...HEAD` range also contains unrelated workflows (installer-multi-host-global-targets, modern-website-revamp, provider-fetch-visual-attachments, ws-megabrain, us-272/us-275). Per triage rules those out-of-scope changes were excluded from findings; only one out-of-scope observation is recorded below as a non-blocking Suggestion.
- **Verdict:** clean. No Critical, no Warning. One Suggestion (out-of-scope fixture, owned by another change) + two Info notes. Advance approved.

## Evidence (observed, not inferred)

- Renamed folders on disk with matching `name:` frontmatter + load banners; all 10 retired folders absent (verified via node script over `.agents/skills/*/SKILL.md` + `fs.existsSync`):
  `ws-spec-write`, `ws-spec-update`, `ws-spec-multi`, `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, `ws-spec-provider-local`, `ws-plan-write`, `ws-plan-verify`, `ws-plan-update`, `ws-plan-interview` present; `ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-github-provider`, `ws-azure-devops-provider`, `ws-local-spec-provider`, `ws-write-plan`, `ws-verify-plan`, `ws-update-plan-implementation`, `ws-interview` absent.
- `bin/skill-dependencies.json`: zero hits for all 9 retired graph ids; all 10 new ids present (node check over serialized graph).
- Orch dispatch clean: `ws-spec-to-pr/STEP-DISPATCH.md` dispatches `ws-spec-write` (Step 0), `ws-plan-write` (Step 1), `ws-plan-interview` (Step 2), `ws-plan-verify` (Step 5); zero retired-id hits in `ws-spec-to-pr/*.md` and `ws-spec-to-pr/scripts/*.py`.
- Provider wiring: `ws-spec-provider-github/SKILL.md:53,63,76` routes fetch-to-spec via `ws-spec-write` then `ws-spec-provider-local register_local_spec.cjs --source github`.
- Hub router: `ws-shared/autoload.md:55-183` maps write-a-spec to `ws-spec-write`, drift sync to `ws-spec-update`, register/fetch to `ws-spec-provider-*`; no fourth `ws-spec-providers` folder on disk.
- `ws-spec-update/SKILL.md:18,33,66`: distinguishes `ws-spec-index sync`, requires `ws-self-learning` trap + compile for missed-AC corrections, explicit skip report for wording-only.
- `ws-shared/scripts/retired_artifacts.cjs:24-39,72-80`: all 10 retired dirs in `RETIRED_SKILL_DIRS` + `RETIRED_TO_CANONICAL`.
- `npm run verify-integrity` exit 0 (`bin/skill-integrity.json matches tree v0.3.61`).
- `npm run test` exit 0 (full suite tail: configurable-memory-backends, research-pipeline-quality, spec-prefix-ordering all PASSED).
- MEMORY sweep: remaining old-id mentions live only in exempt archives (`ws-shared/CHANGELOG.md` history per AC17; `ws-shared/MEMORY.md` + `memory/*` per harness exemption; `SKILL_AUTHORING.md:173-190` rename table required by AC9; `ws-check-harness/PHASES.md:124-133,280,452` migration table + fail-closed rule required by AC10; `test/test-install.js` + `test/test-consumer-migration.js` prune fixtures required by AC13).
- Invariants: `config.json` enums unchanged (`providers.active`/`scm` stay `github|azure-devops|local`); no DB/tenancy/i18n surface in this skill-package repo. Fable auto-audit skipped with reason: rename-only refactor, no invertible defect signal; committed snapshot already covered by this review.

## Findings

### CR-001 [Suggestion] open test/test-workflow-state-contract.js:L716-L716

Out-of-scope fixture (added by `d18792b7 fix(#276)`, not this workflow) writes `workflowType: ws-multi-spec` into a rebuild-index test state file. If that value denotes the producing skill, the canonical id is now `ws-spec-multi`; if it is an intentionally opaque non-standard enum value for the index test, no change needed.

- Score: 9/10 (cosmetic, test-only, zero product impact).
- Sibling occurrences: none in this workflow's scope; `test/test-install.js` + `test/test-consumer-migration.js` retired-id strings are intentional prune fixtures (AC13), not siblings.
- Suggestion: owner of that change to confirm intent; rename to `ws-spec-multi` only if the value is meant to reference the skill. Do not block this workflow on it.

### Notes (informational, not gated findings)

- **IN-001** `.agents/skills/ws-shared/MEMORY.md:L164-L214

Archived memory entries still reference retired paths (`ws-local-spec-provider/...register_local_spec.cjs`, `ws-verify-plan/SKILL.md`, `ws-github-provider/...`, `ws-write-plan/SKILL.md`). Exempt by harness rule (MEMORY/memory never rewritten) and AC17. No action.

- **IN-002** `.agents/skills/ws-shared/CHANGELOG.md:L147-L1362

Historical changelog rows retain retired ids with `(now ws-…)` annotations where renamed. Exempt per AC17 and the `FEATURES.md` version-history exemption. No action.

## Apply fixes?

No. No Critical/Warning findings; Suggestion is out-of-scope and non-blocking. Advance to Step 7.
