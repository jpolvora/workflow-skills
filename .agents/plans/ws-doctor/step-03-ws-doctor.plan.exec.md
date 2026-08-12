# Execution Plan — DAG Tasks

**Slug:** `ws-doctor`  
**Source plan:** `.agents/plans/ws-doctor/step-01-ws-doctor.plan.md`  
**execMode:** `parallel`  
**targetModel:** `coder`

## Size detection

| Metric | Count | Threshold (`dagThresholds`) | Within? |
|--------|-------|-----------------------------|---------|
| Implementation steps (plan §3 Steps 1–6) | 6 | `maxImplementationSteps` ≤ 3 | ❌ |
| Expected files | ≥10 (SKILL, script, 2 dep graphs, 2 AGENTS hubs, integrity, catalog, optional peers/tests) | `maxExpectedFiles` ≤ 6 | ❌ |
| Layers | 3+ (`skills-sot`, `installer-cli`, hubs/docs; optional `tests`) | `maxLayers` ≤ 2 | ❌ |

**Decision:** `execMode: parallel` (steps, files, and layers all exceed thresholds).  
**Waves:** 3 levels, max 2 concurrent tasks per level (file-isolated). Plan Step 3 (optional peer cross-links) folded into T3 as non-blocking preference; hubs alone satisfy AC9.

## Levels

| Level | Tasks | Notes |
|-------|-------|-------|
| 0 | T1, T2 | Parallel: new skill package only — no shared files |
| 1 | T3, T4 | Parallel: hubs/deps vs optional focused tests |
| 2 | T5 | Serial: integrity, catalog, harness, install tests, smoke |

## Tasks

### T1 — Scaffold `ws-doctor` SKILL.md (AC1, AC8, AC10)

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.agents/skills/ws-doctor/SKILL.md`
- **Plan steps:** 1 (scaffold); Step 3 boundary prose; Step 6 flag docs
- **ACs:** AC1, AC8, AC10
- **Acceptance:**
  - Package path `.agents/skills/ws-doctor/SKILL.md` exists with frontmatter: `name: ws-doctor`, description covering diagnose triggers, `version` aligned to current `package.json` / `packageVersion`, `invocation_names` including `doctor` and `ws-doctor`, `disable-model-invocation: true`.
  - Banner immediately under `# ws-doctor`: `> When this skill is loaded, output "ws-doctor loaded."`
  - Body documents: goals; boundary vs `ws-check-harness` and `ws-show-harness`; resolve roots → run `node {skillsRoot}/ws-doctor/scripts/doctor.js` with Done when; report contract (Path errors / Tool-script / Configuration / Missing references); flags `--skill` / `--json`; read-only default; hybrid `{skillsRoot}` vs `{sharedDir}`; missing config → `user-gate` recommend `ws-configure-project`.
  - en-us; no host product names; portable aliases only; no per-skill `upstream:` frontmatter.
- **coderPrompt:** Create only `.agents/skills/ws-doctor/SKILL.md` per plan §3 Step 1 and §2 Agent protocol. Align `version` with current package version (read `package.json` / `bin/skill-dependencies.json` `packageVersion`). Include banner, report section contract, CLI flags, hybrid path rules, explicit `node` launcher recipe for `scripts/doctor.js`, and clear boundary vs check-harness / show-harness. Do not invent a fix-apply mode. Do not create `doctor.js` in this task (T2 owns it). Do not edit hubs or dependency graphs.

### T2 — Implement diagnostic engine `doctor.js` (AC2–AC7)

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.agents/skills/ws-doctor/scripts/doctor.js`
- **Plan steps:** 2 (script); Step 6 smoke behaviors
- **ACs:** AC2, AC3, AC4, AC5, AC6, AC7
- **Acceptance:**
  - Script exists; passes `node --check`; invoked as `node …/doctor.js` (no shebang-only contract).
  - Default: human markdown report with four sections; `--json` emits same sections as object; `--skill <id>` limits skill-folder scan (config summary still attempted).
  - Path errors after token expansion (or `none`); tool/script diagnostics (missing launcher, missing cited script, parse failures with path+error); configuration summary or unavailable + configure-project recommendation without inventing values; missing references (or `none`).
  - Missing project config: continue path/script/ref against skills root; Configuration = unavailable.
  - Read-only: no writes outside stdout/stderr; UTF-8 explicit I/O; ASCII-safe stdout where practical; soft-skip missing launcher binaries; do not treat URL schemes as Windows drives.
- **coderPrompt:** Create only `.agents/skills/ws-doctor/scripts/doctor.js` per plan §3 Step 2 and §2 diagnostic surfaces. Resolve `{skillsRoot}` independently from project `{sharedDir}/config.json`. Implement Path errors, Tool/script diagnostics (`py_compile` / `node --check` / `bash -n` when available), Configuration summary (schema-aware if `config.schema.json` present), Missing references. Support `--skill` and `--json`. No file edits by the doctor. Do not edit SKILL.md (T1), hubs, or deps. Keep the script lean and portable.

### T3 — Register Workflows membership & hub routers (AC9)

- **parallelGroup:** L1
- **dependsOn:** ["T1"]
- **Files:** `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`, `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`
- **Plan steps:** 4 (register); 3 (optional peer links — hubs preferred)
- **ACs:** AC9 (AC8 discovery)
- **Acceptance:**
  - `ws-doctor` listed in Workflows package skills in `bin/skill-dependencies.json` (leaf/minimal deps per graph conventions); packaged mirror updated under `.agents/skills/ws-shared/skill-dependencies.json` when that file ships the graph.
  - Root `AGENTS.md`: catalog row (harness/review) + task-router row for diagnose/doctor/skills-health intents.
  - `ws-shared/AGENTS.md`: Harness & review promoted list + consumer task-router row.
  - Not added to Always-applied / `autoload.md`.
  - Optional one-line peer “use when” in `ws-check-harness` / `ws-show-harness` only if zero duplication risk; otherwise hubs alone OK (do not expand this task’s file list unless peer edit is clearly safe — prefer skip).
- **coderPrompt:** After T1 lands the skill id, register `ws-doctor` in `bin/skill-dependencies.json` Workflows list and mirror `.agents/skills/ws-shared/skill-dependencies.json` if present. Add catalog + task-router rows to root `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md` with diagnose/doctor triggers. Do not autoload. Prefer hubs over peer SKILL edits; skip peer cross-links unless a single non-bloating line is clearly beneficial. Do not run integrity regenerate here (T5). Do not edit `ws-doctor/SKILL.md` or `doctor.js`.

### T4 — Focused doctor fixture/unit tests (AC2–AC7 where cheap)

- **parallelGroup:** L1
- **dependsOn:** ["T1", "T2"]
- **Files:** `test/` (new or extended focused doctor test module(s) only — keep minimal)
- **Plan steps:** 5 (tests portion); §5 test map
- **ACs:** AC2, AC3, AC4, AC5, AC6, AC7 (automated where cheap); support AC1/AC10 assertions if colocated
- **Acceptance:**
  - Prefer reusing existing install/integrity/harness coverage; add focused tests only where needed for report-contract confidence (e.g. readonly exit 0, `--json` parseable, missing-config graceful, optional fixture for broken path/script/ref).
  - Tests do not require network; fixtures are temp/local; doctor remains read-only under assertion.
  - If existing suite already covers package presence via install tree, do not duplicate heavy harness — keep this task thin or no-op with a short note in the test file header why coverage is deferred to T5/`npm run test`.
- **coderPrompt:** Add minimal focused tests under `test/` for `ws-doctor` report behaviors (AC2–AC7) only if cheap fixtures help; otherwise add a thin existence/flag smoke and rely on T5 `npm run test` + harness for AC9/AC11. Do not modify skill bodies, hubs, or integrity manifests. Do not expand into full check-harness reimplementation.

### T5 — Integrity, catalog, harness audit, install + smoke (AC11, AC2–AC7, AC10)

- **parallelGroup:** L2
- **dependsOn:** ["T1", "T2", "T3", "T4"]
- **Files:** `bin/skill-integrity.json`, `docs/index.html` (catalog regenerate via `node bin/build-site.js` — no version bump unless shipping)
- **Plan steps:** 5 (integrity/harness/install/catalog); 6 (manual/fixture verification)
- **ACs:** AC11; smoke for AC2–AC7, AC10
- **Acceptance:**
  - `npm run generate-integrity` && `npm run verify-integrity` exit 0; `bin/skill-integrity.json` updated for new hashed skill content.
  - `ws-check-harness` Phases 0–5c → 0 critical for new skill id + dependency graph.
  - `npm run test` passes (installer/tree picks up Workflows skill).
  - Catalog lists `ws-doctor` after `node bin/build-site.js` (bump deferred to ship Step 8 unless already required).
  - Smoke: healthy-tree doctor run; `--skill ws-doctor`; `--json` parseable; missing-config path does not invent values; working tree skills not mutated by doctor.
- **coderPrompt:** After T1–T4 content is landed, regenerate integrity (`npm run generate-integrity` && `npm run verify-integrity`), rebuild catalog with `node bin/build-site.js` (no `build-site:bump` unless this wave is the ship PR), run `ws-check-harness` to 0 critical, run `npm run test`, and smoke-run `node .agents/skills/ws-doctor/scripts/doctor.js` with default / `--skill ws-doctor` / `--json` plus a missing-config check. Capture evidence; do not invent config values; do not commit (commitPlanFilesOnlyAtStep8). Fix only integrity/catalog drift produced by prior tasks — no drive-by refactors.

## Out of DAG (optional / deferred)

| Item | Reason |
|------|--------|
| README human install narrative mention | Plan: optional, not AC-blocking |
| `npm run build-site:bump` / package version bump | Ship Step 8 / upstream ship-pr gate |
| Peer SKILL one-liners in check-harness / show-harness | Optional; hubs satisfy AC9 |
| Fix-apply / auto-correct mode | Out of scope v1 |

## Handoff

Artifacts for `ws-implement-tasks`:

- `.agents/plans/ws-doctor/step-03-ws-doctor.plan.exec.md`
- `.agents/plans/ws-doctor/step-03-ws-doctor.exec.dag.json`
