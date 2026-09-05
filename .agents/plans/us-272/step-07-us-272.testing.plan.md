---
slug: us-272
step: 7
workflowId: us-272-20260903T165000Z
status: active
autoMode: true
probe:
  hasTestSurface: true
  backendTest: npm run test
  skipTesting: false
---

# Step 7 Testing Plan — us-272

Scope: retired-id prune + hybrid pointer + harness check (installer `update` migration, 0.3.56 rename wave).
Commit under test: `346b2adf` (9 files). No product-code edits in this step.

## 1. Unit & coverage commands (from config.json verification)

| Alias | Command | Run in Step 7 |
|-------|---------|---------------|
| `backendBuild` | (empty) | N/A — no build alias configured |
| `backendTest` | `npm run test` | Full suite deferred if runtime-bound; scoped gate suite runs fail-closed instead (see §2) |
| `verify-integrity` | `npm run verify-integrity` | Yes, exit 0 required |
| `mutationTest` | (empty) + `defaults.skipMutationTesting: true` | Mutation SKIPPED with log (see §9) |

Scoped gate suite (fail-closed, each exit 0 required):

1. `node test/test-consumer-migration.js` — bare-id + canonical-map prune (AC2, AC7)
2. `node test/test-install.js --local` Phase 9c — pre-rename hybrid fixture, AC1/AC2/AC3/AC5/AC6 (full file; Phase 9c is the us-272 block)
3. `npm run verify-integrity` — integrity manifest matches tree
4. Mechanical gates: `check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs` — each exit 0 (AC4)
5. `python .agents/skills/ws-configure-project/scripts/configure_autoload.py --check` — exit 0 (AC4)

Coverage gaps vs changed files:

| Changed file | Covering test |
|--------------|---------------|
| `.agents/skills/ws-shared/scripts/retired_artifacts.cjs` | test-consumer-migration.js (prune + map + false-positive) |
| `bin/consumer-migration.js` | test-consumer-migration.js (re-export) |
| `bin/cli.js` (prune-then-sync assert + AGENTS.md pointer) | test-install.js Phase 9c |
| `.agents/skills/ws-shared/config.json.example` | test-install.js Phase 9c + retired-id rg sweep |
| `.agents/skills/ws-shared/config-resolution.md` | Phase 9c pointer/fallback assert (doc presence) |
| `.agents/skills/ws-check-harness/PHASES.md` | 4 mechanical gates + autoload --check |
| `test/test-consumer-migration.js`, `test/test-install.js` | self (regression assertions) |
| `bin/skill-integrity.json` | verify-integrity |

## 2. Targets, hosts, credentials

N/A — Node skills-package harness, no dev server. `config.json` stack `apiHost ""`, `devHost ""`, no ports, no credentials, no secrets in logs.

## 3. DB seeds & rollback

N/A — `database.type: none`, no migrations, no seed script. Preservation check (AC5) substitutes: byte-compare consumer `config.json` / `STACK.md` / `MEMORY.md` / `CHANGELOG.md` before/after `update` (Phase 9c asserts).

## 4. API contracts

N/A — no endpoints. Installer CLI contract instead: `node bin/cli.js update` exit 0, second run empty diff + exit 0 (AC6), post-sync zero-retired fail-closed assert (AC2).

## 5. RBAC & tenancy isolation

N/A — installer/harness package, no users/roles/tenants. Invariant observed instead: never write outside `.agents/skills/`; never overwrite consumer-owned files beyond retired-id prune (AC5).

## 6. Integration / E2E paths

- Pre-rename hybrid fixture → `update` → migrated tree (Phase 9c, AC1–AC3/AC5/AC6).
- `update` → `uninstall` canonical-only follow-up (AC2, via manifest prune + post-sync assert).
- `ws-check-harness` Phases 0–5c retired-id + hybrid-harness rows (AC4; mechanical core re-run here, full Phases deferred to CI per Step 5 note).

## 7. UI / E2E validation

Skipped — no UI surface (docs site untouched by this change; no CLI flag change so no site rebuild per Out of Scope).

## 8. Feature-quality AC checklist (observable outcomes)

- [ ] AC1: post-`update` `autoload.md` zero of 10 retired ids; `../ws-*/SKILL.md` targets resolve (project or `{globalSkillsRoot}`)
- [ ] AC2: post-`update` manifest zero of 16 stale ids; follow-up ops canonical-only
- [ ] AC3: missing local `AGENTS.md` edge seeds thin pointer; `{globalSkillsRoot}` fallback documented; configured `rules.harness` resolves
- [ ] AC4: 4 gates + `configure_autoload.py --check` exit 0; no retired-id findings on migrated fixture
- [ ] AC5: consumer-owned checksums identical
- [ ] AC6: second `update` empty diff, exit 0, no retired-id return
- [ ] AC7: managed-template `rg` zero live hits (catalog/map + exempt history only)
- [ ] NS1–NS4 reproduced/covered by fixture + prune-behavior tests

Defect threshold: PASS only when every executed gate exits 0, sabotage `passed`, mutation `skipped` (policy), and no new failures vs Step 5/6 evidence. Any runner non-zero or sabotage `failed` → STOP, no advance (fail-closed).

## 9. Mutation

- `status: skipped`
- Reason: `verification.mutationTest` empty AND `defaults.skipMutationTesting: true` (opt-in default). Per skill skip rules, log and continue to sabotage.
- Threshold N/A.

## 10. Regression sabotage

- Helper: `python .agents/skills/ws-testing/scripts/run_sabotage.py`
- Test alias: `npm run test` (must equal configured `backendTest` exactly)
- Path: `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`
- Invert patch (caller-authored): revert prune-set line to `new Set(RETIRED_SKILL_DIRS)` (drop `...RETIRED_BARE_IDS`), so bare ids survive prune
- Expectation: test exits non-zero (test-consumer-migration.js bare-id asserts bite); every declared path changes bytes; restore byte-identical (`restored: true`)
- Restore failure → abort Step 7.

## 11. Accessibility / contrast

N/A to product change (no forms/alerts). Report records N/A with rationale per skill report requirement.
