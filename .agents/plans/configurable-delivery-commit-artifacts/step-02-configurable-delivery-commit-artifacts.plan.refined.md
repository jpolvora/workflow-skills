---
slug: configurable-delivery-commit-artifacts
title: "Configurable delivery-commit artifacts (config + ws-configure-project)"
status: "refined"
shared_understanding: confirmed
interviewMode: autoMode
interviewNote: "autoMode — End refinement; assumptions already resolved in plan §1"
complexity: complex
execMode: sequential
createdAt: 2026-08-10T19:11:00Z
---

## 0. Summary & Business Rules

**Objective:** Replace the hardcoded Step 8 delivery staging rule (“always stage refined/plan + `step-08-*.result.md`”) with config-driven toggles under `defaults.deliveryCommitArtifacts`, interviewed by `ws-configure-project`, and consumed by `ARTIFACTS.md`, `gates.md` G2-delivery, `tools.md` `commit-delivery`, and `ws-ship-pr`.

**Business rules:**

1. **Config block (SoT for defaults):** `defaults.deliveryCommitArtifacts` with booleans:
   - `includeRefinedPlan` → default `true` (stage `step-02-{slug}.plan.refined.md` if present, else `step-01-{slug}.plan.md`)
   - `includeDeliveryResult` → default `false` (do **not** stage `step-08-{slug}.result.md` unless enabled)
   - `includeSpec` / `includeCheckReport` / `includeCodeReview` / `includeTestingReport` → default `false` (opt-in extras)
2. **Omitted keys = AC1 defaults** at read time — never silently fall back to legacy “always plan+result”.
3. **Fail closed** when `includeRefinedPlan` is true and neither plan file exists; fail closed when every enabled include resolves to zero files on disk.
4. **Skip-with-note** when an opt-in toggle is true but its file is missing (not a hard fail by itself).
5. **Product/source commits unchanged** — toggles govern `{us-dir}` delivery artifacts only.
6. **`invariants.commitPlanFilesOnlyAtStep8` unchanged** — still *when* plan-dir files may commit, not *which* files.
7. **Behavior change:** default shipping **stops** including `step-08-*.result.md` (call out in CHANGELOG / release notes at ship time). Result file may still be **written** for orch evidence when `includeDeliveryResult` is false.

**Security / safety mitigations:**

- Never invent missing artifact content to satisfy a toggle.
- Never stage runtime/non-delivery paths (`{workflow-id}.state.md`, `step-00-*.issue.json`, `step-00-*.classify.md`, exec/DAG, telemetry, worktrees) unless a future toggle is explicitly added.
- Empty plan-artifact delivery commits are forbidden (fail closed).
- Preserve UTF-8 I/O if any configure/helper scripts touch JSON (`encoding="utf-8"`; see hub Cross-platform shell & encoding + MEMORY configure traps).

---

## 1. Definition of Ready & Scope

### Assumptions (resolved — no interview blockers)

| Topic | Resolution |
|-------|------------|
| Block home | Keep under `defaults` so `--section defaults` covers it (no new top-level section). |
| Key names | Exact names from spec AC1 (no rename). |
| Missing block / omitted keys | Merge to AC1 defaults at read time in all consumers. |
| Interview UX | `defaults` subsection “Delivery commit artifacts”; recommended = AC1; Keep current / Skip allowed; `autoMode` accepts recommended without re-asking. |
| Shared algorithm SoT | Document resolution algorithm in `ARTIFACTS.md` § Step 8; other surfaces link/reference it (do not fork rules). |
| Companion “plan + result” prose | Update `PROTOCOLS.md`, `STEP-DISPATCH.md`, `protocols/delivery-result.md`, and FAQ G2-delivery wording as part of AC10 (same semantics). |
| Script vs prose | Prefer prose + skill obligations first; add a tiny shared resolver script only if tests need a single executable SoT (optional, not required for AC pass). |
| Lite vs standard | Both use shared G2-delivery / `ws-ship-pr` + same config — no orch divergence. |

### Acceptance Criteria (measurable)

| ID | Criterion |
|----|-----------|
| AC1 | `config.json.example` + `config.schema.json` define `defaults.deliveryCommitArtifacts` with all six booleans and AC1 defaults. |
| AC2 | Fresh install / omitted keys behave as AC1 defaults (refined plan on; result off; extras off) — no silent legacy plan+result. |
| AC3 | `ws-configure-project` interviews toggles during `defaults` / `--section defaults`; writes accepted values. |
| AC4 | `ARTIFACTS.md` § Step 8 documents config-driven staging + toggle→filename map; removes unconditional plan+result. |
| AC5 | `gates.md` G2-delivery + `tools.md` `commit-delivery` stage only enabled artifacts (refined-plan fallback preserved). |
| AC6 | `ws-ship-pr` delivery commit respects same config. |
| AC7 | Missing plan when `includeRefinedPlan` → fail closed; missing opt-in file → skip + note. |
| AC8 | All enabled includes resolve to zero files → fail closed (no empty delivery commit of plan artifacts). |
| AC9 | Product/source staging and PR create/push unchanged except which `{us-dir}` artifacts are added. |
| AC10 | Hub docs that said “commit plan + result” updated to “commit configured delivery artifacts”; `ws-check-harness` → 0 critical. |

### Out of scope

- Changing when product/source files are committed.
- Turning off `step-08` result **generation** when `includeDeliveryResult` is false.
- Committing `{specsDir}` specs of record, `{reviewsDir}`, MEMORY, or changelog via these toggles.
- Overloading `invariants.commitPlanFilesOnlyAtStep8` for include selection.
- New toggles for state/issue.json/classify/exec/DAG/telemetry/worktrees.

### Complexity / execution

- **Complexity:** `complex` (cross-cutting config schema, interview, artifact registry, gates, tools, ship-pr, companion orch docs).
- **execMode:** `sequential` (ordered dependency: schema → interview → ARTIFACTS SoT → gates/tools/ship-pr → companion docs → verify).

---

## 2. Technical Design & Architecture

### Stack / layers (from `config.json`)

| Layer | Path | Role in this feature |
|-------|------|----------------------|
| skills-sot | `.agents/skills` | Schema/example, gates, tools, configure-project, ARTIFACTS, ship-pr, orch companion docs |
| installer-cli | `bin` | Integrity regenerate after hashed skill content changes (ship gate) |
| tests | `test` | Schema/doc assertions and/or resolver unit tests |

No frontend, DB, ORM, migrations, i18n, or RBAC changes.

### Config shape (canonical)

```json
"defaults": {
  "deliveryCommitArtifacts": {
    "includeRefinedPlan": true,
    "includeDeliveryResult": false,
    "includeSpec": false,
    "includeCheckReport": false,
    "includeCodeReview": false,
    "includeTestingReport": false
  }
}
```

### Toggle → filename map

| Toggle | Stages when true and file exists |
|--------|----------------------------------|
| `includeRefinedPlan` | `step-02-{slug}.plan.refined.md` if present, else `step-01-{slug}.plan.md` (fail closed if neither when toggle true) |
| `includeDeliveryResult` | `step-08-{slug}.result.md` |
| `includeSpec` | `step-00-{slug}.spec.md` |
| `includeCheckReport` | `step-05-{slug}.plan.report.md` |
| `includeCodeReview` | `step-06-{slug}.review.md` |
| `includeTestingReport` | `step-07-{slug}.testing.report.md` |

### Resolution algorithm (document in ARTIFACTS.md; all consumers follow)

1. Read `{sharedDir}/config.json` → `defaults.deliveryCommitArtifacts` (missing object or key → AC1 default).
2. Build ordered stage list from enabled toggles using the map above.
3. For each path: if missing and toggle is `includeRefinedPlan` → **STOP** with clear error; if missing and other toggle → skip + log note on prepare board / delivery result.
4. If stage list empty after resolution → **STOP** (AC8).
5. `git add` only resolved paths under `{us-dir}`; commit message may say “configured delivery artifacts” (not hardcode “plan and result”).
6. Product/source staging remains separate (`commit-code` / ship-scope product files).

### Affected files

| File | Change |
|------|--------|
| `.agents/skills/ws-shared/config.json.example` | Seed full `deliveryCommitArtifacts` block + short `_comment_*`. |
| `.agents/skills/ws-shared/config.schema.json` | Schema object + boolean properties with defaults. |
| `.agents/skills/ws-configure-project/SKILL.md` | Note defaults interview covers delivery artifacts. |
| `.agents/skills/ws-configure-project/INTERVIEW.md` | `defaults` section: three user-gates (plan, result, opt-in multi/per-toggle). |
| `.agents/skills/ws-spec-to-pr/ARTIFACTS.md` | § Step 8 rewrite; update Committable column to “when toggle enabled”. |
| `.agents/skills/ws-shared/gates.md` | Combined delivery+ship option labels + G2-delivery staging rule. |
| `.agents/skills/ws-shared/tools.md` | `commit-delivery` resolves stage list from config. |
| `.agents/skills/ws-ship-pr/SKILL.md` | Delivery commit stages only enabled existing artifacts; fail-closed rules; board notes. |
| `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` | G2-delivery / Step 8 wording. |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Step 8 G2-delivery line. |
| `.agents/skills/ws-spec-to-pr/protocols/delivery-result.md` | Stage configured artifacts (not hardcoded plan+result). |
| `.agents/skills/ws-spec-to-pr/docs/faq.md` | G2-delivery row wording (if still “plan and result”). |
| `test/` (optional but preferred) | Schema default / resolution behavior assertions. |

### Invariant checks

- `commitPlanFilesOnlyAtStep8: true` — still only Step 8 may commit plan-dir files; toggles only select which.
- Do not weaken HS-2a mid-workflow plan-dir commit bans.
- Portable en-us skill prose; no host product coupling in new copy.

---

## 3. Step-by-Step Plan

### Step 1 — Config example + schema (AC1, AC2)

**Action:** Add `defaults.deliveryCommitArtifacts` to example and schema with explicit defaults matching AC1.

**Details:**

- In `config.json.example`, under `defaults`, add the six booleans and a `_comment_deliveryCommitArtifacts` noting: refined plan on by default; delivery result off by default (behavior change); opt-ins false; omitted keys at runtime merge to these defaults.
- In `config.schema.json`, under `defaults.properties`, add `deliveryCommitArtifacts` object with `additionalProperties: false` (or true if hub convention prefers open objects — prefer listing all six with `type: boolean` and `default` per key).
- Document read-time merge rule in schema `description` on the object: missing keys use defaults; missing object ⇒ all defaults.

**Files:** `config.json.example`, `config.schema.json`

**Engineering checks:** Example validates against schema; defaults in schema match example; no required-field breakage for existing configs.

**AC map:** AC1, AC2

---

### Step 2 — ws-configure-project interview (AC3)

**Action:** Extend `defaults` interview (and `--section defaults`) with delivery-commit artifact gates.

**Details:**

1. **Gate A — Include refined plan?** Options: Yes (`true`, Recommended) / No (`false`) / Keep current / Skip. Writes `includeRefinedPlan`.
2. **Gate B — Include delivery result?** Options: No (`false`, Recommended) / Yes (`true`) / Keep current / Skip. Writes `includeDeliveryResult`.
3. **Gate C — Opt-in extras:** multi-select or sequential per-toggle for `includeSpec`, `includeCheckReport`, `includeCodeReview`, `includeTestingReport`; Recommended = none (all false); Keep current / Skip.
4. Merge-write into `config.json` without deleting unknown keys; preserve `_comment*` keys (INTERVIEW write rules).
5. `autoMode`: accept Recommended on all three without prompting (enables interview skip when defaults already match / section complete).
6. Update `SKILL.md` `--section defaults` / interview bullet to mention delivery-commit artifacts subsection.
7. MEMORY: if adding Python helpers, use UTF-8 I/O; avoid CRLF/table-regex traps from configure_autoload learnings (prefer not touching `configure_autoload.py` for this feature).

**Files:** `ws-configure-project/INTERVIEW.md`, `ws-configure-project/SKILL.md`

**Engineering checks:** Interview order under item 7 `defaults`; recommended labels match AC1; no new `--section` required.

**AC map:** AC3 (supports AC2 via seeding on fresh `cp` from example)

---

### Step 3 — ARTIFACTS.md SoT for staging (AC4)

**Action:** Rewrite `## Step 8 delivery commit` to config-driven staging; update Committable column.

**Details:**

- Replace hardcoded two-bullet list with: “Stage only artifacts enabled by `defaults.deliveryCommitArtifacts` (see toggle map).”
- Include the full toggle→filename table and fail-closed / skip-with-note rules.
- Update canonical table `Committable` cells for plan/refined/result/spec/check/review/testing from unconditional Yes/No to “Yes (Step 8) when corresponding toggle is true” (spec/check/review/testing currently No → become conditional Yes).
- Keep “Still never staged” list explicit.
- Point gates/tools/ship-pr at this section as SoT.

**Files:** `ws-spec-to-pr/ARTIFACTS.md`

**Engineering checks:** No leftover “always stage plan + result”; filenames match ARTIFACTS registry; en-us only.

**AC map:** AC4, AC7, AC8 (rules documented)

---

### Step 4 — gates.md + tools.md consumers (AC5, AC10)

**Action:** Align G2-delivery and `commit-delivery` with config-driven staging; retitle gate options.

**Details:**

- `gates.md` combined delivery + ship gate options 1–3: change “Commit plan + result, …” → “Commit configured delivery artifacts, …” (or equivalent); keep Recommended behavior tied to `fullMode` unchanged.
- Replace “G2-delivery stages refined/plan + result only” with reference to `defaults.deliveryCommitArtifacts` + ARTIFACTS § Step 8.
- Recommended-index table rows that say “Commit plan + result…” → updated wording.
- `tools.md` `commit-delivery`: resolve stage list from config per ARTIFACTS algorithm (not hardcoded two paths).

**Files:** `ws-shared/gates.md`, `ws-shared/tools.md`

**Engineering checks:** Grep for “plan + result” / “plan and result” in these files → zero stale mandatory claims (except historical notes if any).

**AC map:** AC5, AC10

---

### Step 5 — ws-ship-pr delivery staging (AC6, AC7, AC8, AC9)

**Action:** Update `ws-ship-pr` so delivery commit stages only enabled existing `{us-dir}` artifacts.

**Details:**

- In Commit & push / delivery-commit prose: read `defaults.deliveryCommitArtifacts` with AC1 merge defaults.
- When `includeDeliveryResult` is false: do **not** `git add` `step-08-{slug}.result.md` (file may still exist / be written earlier).
- When `includeRefinedPlan` is true: apply refined→plan fallback; if neither exists → STOP with clear error.
- Opt-ins: stage only if toggle true **and** file exists; else note on prepare board / result prose.
- If resolved stage set empty → STOP (AC8).
- Do not change preflight, prepare checklist product rows, push, create-pr, merge, or telemetry aggregate except wording that implied plan+result always.
- Standalone `/ship-pr` and `workflowMode` share the same staging rule when performing a delivery commit of plan artifacts.

**Files:** `ws-ship-pr/SKILL.md` (and PREPARE-CHECKLIST only if it hardcodes plan+result staging)

**Engineering checks:** Product/source path guidance unchanged; fail-closed paths documented; no inventing files.

**AC map:** AC6, AC7, AC8, AC9

---

### Step 6 — Companion orch docs sync (AC10)

**Action:** Update remaining “commit plan + result” surfaces so harness/docs stay consistent.

**Details:**

- `PROTOCOLS.md` G2-delivery / Step 8 rows → configured delivery artifacts.
- `STEP-DISPATCH.md` Step 8 G2-delivery line → config-driven.
- `protocols/delivery-result.md` step that stages plan+result → resolve from config / ARTIFACTS.
- `docs/faq.md` G2-delivery description if still hardcoded.
- Do **not** change cleanup “Preserved” lists unless they incorrectly require result in the delivery commit.

**Files:** listed above under `ws-spec-to-pr/`

**Engineering checks:** Grep skill tree for stale mandatory “plan + result” delivery staging; leave intentional historical changelog text alone.

**AC map:** AC10

---

### Step 7 — Verification, integrity, CHANGELOG note (AC2, AC10)

**Action:** Prove schema/docs/skills; regenerate integrity; note default behavior change.

**Details:**

- Run `ws-check-harness` Phases 0–5c → 0 critical.
- If hashed skill content changed: `npm run generate-integrity && npm run verify-integrity`.
- Optional: add/extend a small Node test asserting schema defaults + example contains the block + ARTIFACTS/gates/tools no longer mandate plan+result.
- At feature ship: append CHANGELOG / release note that default delivery commit **excludes** `step-08-*.result.md` unless opted in.

**Files:** `bin/skill-integrity.json` (regenerated), optional `test/*.js`, changelog at ship

**Engineering checks:** harness 0 critical; integrity exit 0; AC2 documented in example comment + consumer read path.

**AC map:** AC2, AC10

---

## 4. Permissions, Tenancy & i18n

N/A — harness/config/docs only. No RBAC, tenancy filters, locales, or UI strings.

(If any user-facing gate labels are added, keep en-us only per hub language rule.)

---

## 5. Test Coverage

Map every AC to ≥1 verification case:

| AC | Test / method | Pass criteria |
|----|---------------|---------------|
| AC1 | `test_schema_defines_deliveryCommitArtifacts_defaults` (schema+example parse/assert) | All six keys present; defaults: refined `true`, others `false`. |
| AC2 | `test_omitted_keys_merge_to_ac1_defaults` (unit of merge helper **or** doc+code contract assert in ship-pr/ARTIFACTS + example comment) | Missing object/keys ⇒ AC1 posture; no “always stage result”. |
| AC3 | `test_configure_interview_documents_delivery_artifacts` (grep/assert INTERVIEW.md + SKILL.md) | Gates for plan/result/opt-ins; Recommended = AC1; under `defaults` / `--section defaults`. |
| AC4 | `test_artifacts_step8_config_driven` | § Step 8 has toggle map; no unconditional always plan+result; Committable column updated. |
| AC5 | `test_gates_and_tools_commit_delivery_config_driven` | `gates.md` G2-delivery + `tools.md` `commit-delivery` reference config / ARTIFACTS algorithm; option labels not “plan + result” as mandatory. |
| AC6 | `test_ship_pr_respects_include_toggles` | SKILL.md states: result not staged when false; refined/plan when true; opt-ins only when true+exists. |
| AC7 | `test_fail_closed_missing_plan_and_skip_missing_optin` | Documented: missing plan+refined with `includeRefinedPlan` → fail; missing opt-in → skip+note. |
| AC8 | `test_fail_closed_empty_stage_set` | Documented STOP when enabled includes resolve to zero files. |
| AC9 | `test_product_source_staging_unchanged` | `commit-code` / product push/PR steps unchanged; only `{us-dir}` delivery artifact set changes. |
| AC10 | `test_hub_docs_updated_and_harness_clean` | Companion docs updated; `ws-check-harness` 0 critical; integrity verify 0 after content change. |

Manual / agent checklist (complex doc feature): after implement, grep `.agents/skills` for `Commit plan \+ result` / `stages plan .* result only` and clear remaining mandatory stale wording.

---

## 6. Invariants (Do Not Violate)

From `config.json.invariants` and harness rules:

- `commitPlanFilesOnlyAtStep8: true` — plan-dir commits only at Step 8; do not use this flag as an include selector.
- `skipQualityGates` unrelated — do not couple toggles to quality-gate bypass.
- EF/domain invariants (`entitiesAreClassNotRecord`, migrations, tenancy, etc.) — N/A; leave untouched.
- Portability: no IDE/agent product names in skill contract; use `user-gate` / path tokens.
- Language: en-us only for skill bodies, gates, banners.
- Managed SoT: edit `.agents/skills/ws-*` only; regenerate integrity with content.
- Encoding: any new script file I/O uses UTF-8 explicitly (Windows cp1252 trap).
- Do not stage never-allowed runtime artifacts via this feature.
- Do not empty-commit plan artifacts (AC8).

---

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / tests / integrity only; no DB/UI).
- [ ] Domain entities and mappings encapsulated — N/A.
- [ ] Schema migrations created — N/A (JSON Schema + example only).
- [ ] Authorization checks applied — N/A.
- [ ] i18n keys declared — N/A (en-us gate copy only).
- [ ] Test cases cover all ACs (AC1–AC10 mapped in §5).
- [ ] `ARTIFACTS.md` is SoT; gates/tools/ship-pr reference it.
- [ ] Default behavior change (result off) called out for CHANGELOG at ship.
- [ ] `ws-check-harness` → 0 critical; integrity regenerate/verify when hashed paths change.
- [ ] No silent revert to always staging plan+result when keys omitted.

---

## 8. Open Questions

**None unresolved.** Sensible defaults locked for interview skip / `autoMode`:

| Former ambiguity | Locked decision |
|------------------|-----------------|
| Where to put the block | `defaults.deliveryCommitArtifacts` |
| Rename keys? | No — use AC1 names |
| Omitted keys | Merge to AC1 defaults at read time |
| Interview section | Under existing `defaults` (and `--section defaults`) |
| `autoMode` | Accept Recommended (AC1) without prompting |
| Missing opt-in file | Skip + note (not hard fail alone) |
| Missing plan when includeRefinedPlan | Fail closed |
| Empty resolved set | Fail closed |
| Result file generation when includeDeliveryResult false | Still allowed to write; just not staged |
| Shared algorithm home | `ARTIFACTS.md` § Step 8 |
| Companion orch docs | Update in Step 6 (AC10) |
| `commitPlanFilesOnlyAtStep8` | Unchanged meaning |

Interview may skip in `autoMode` when Recommended defaults are accepted as-is.
