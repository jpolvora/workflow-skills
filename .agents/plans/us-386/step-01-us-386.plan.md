# Plan — us-386 optional post-completion proof-of-work step

- Spec: `.agents/specs/0117-us-386.spec.md` (10 ACs, authoring validate PASS)
- Context: `.agents/specs/0117-us-386.context.md` (Decision 1 OPEN, recommendation: option 2 config-wire)
- Slug: `us-386`, flowMode: `standard`, branch: `feature/us-386`
- Memory consulted: `memory/2026-09-21-config-editor-scalar-type-parity.md` (bool/string rows must match schema scalar types; keep GUI in lockstep with schema), `memory/2026-09-21-powershell-utf16-crlf-edits.md` (CRLF-safe edits to PS1 via encoding-preserving writes)

## 1. Design intent

Additive, opt-in post-completion step. No pipeline restructuring, no new skill package, no new browser capability. When `defaults.enableOptionalProofOfWork` is omitted or `false`, every step, gate, commit, telemetry event, and artifact matches current behavior exactly (AC5).

Collector ownership (context Decision 1): adopt recommended **option 2 (config-wire)**. The package ships the switches, the gate, and the invocation contract; the collector is a consumer-installed skill with the conventional id `proof-of-work`. No `ws-proof-of-work` skill is packaged in this spec (deferred follow-up per context). When the collector skill is absent or the host lacks browser capability, the step records `proof-of-work | skipped:{reason}` and never fabricates evidence (AC7/AC8).

## 2. Config surface (AC1, AC4, AC9)

Three keys under `defaults.*` (section placement per context Decision 2):

| Key | Type | Default | Seed in example |
|-----|------|---------|-----------------|
| `enableOptionalProofOfWork` | boolean | `false` | `false` + `_comment_` |
| `enableAutomaticEvidenceCollectForProofOfWork` | boolean | `false` | `false` + `_comment_` |
| `projectRootFolderToSave` | string | `{projectRoot}/.proofOfWork/{slug}` | default string + `_comment_` |

Effective-value semantics (config-resolution.md): omitted/missing → disabled path. `projectRootFolderToSave` supports `{projectRoot}` and `{slug}` tokens, resolved by the orchestrator at post-completion time.

## 3. Gate contract (AC2, AC3, AC6)

New `gates.md` section "Optional post-completion proof-of-work step":

- Placement (context Decision 3): orchestrator-owned, after the workflow reaches its finished state — standard after Step 8 close+ship when no fix-pr runs, otherwise after Step 9 convergence; lite after Step 4 close+ship when no fix-pr, otherwise after Step 5 convergence. Never inside `ws-ship-pr`, never gating close or shipping.
- Normal mode + switch explicit `true`: one `user-gate` — **Start evidence collection** (Recommended) / **Skip** — then resolve collector skill `proof-of-work` when installed, else skip with reason.
- Both switches explicit `true`: start without any gate.
- `autoMode`: zero prompts; auto-start iff automatic switch is explicit `true`, else silent skip (AC6).
- Switch omitted/`false`: no gate, no telemetry delta (AC5).
- Telemetry: `proof-of-work | {started:{folder} | skipped:{reason}}`. Reasons: `disabled`, `collector-missing`, `no-browser-capability`, `gate-declined`, `auto-skip`.
- Evidence folder is never committed; the step never mutates product files (AC7).

## 4. Touchpoints (diff list)

1. `.agents/skills/ws-shared/runtime/config.schema.json` — 3 schema entries under `defaults.properties`.
2. `.agents/skills/ws-shared/templates/config.json.example` — 3 keys + `_comment_*` lines.
3. `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` — 3 rows in `defaults` page (`bool`, `bool`, `string`), ASCII-only, CRLF-preserving edit.
4. `.agents/skills/ws-configure-project/scripts/auto_configure.cjs` — add 3 keys to `defaults` `wantFallback` list.
5. `.agents/skills/ws-shared/runtime/config-resolution.md` — new `defaults.enableOptionalProofOfWork` (+ automatic + folder) section.
6. `.agents/skills/ws-shared/runtime/gates.md` — new post-completion proof-of-work gate section.
7. `.agents/skills/ws-spec-to-pr/SKILL.md` — Exit & Handoff += post-completion sentence.
8. `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` — Step 8 close + Step 9 terminal paragraphs += hook reference (orch-owned, after terminal shipStatus).
9. `.agents/skills/ws-spec-to-pr-lite/SKILL.md` — Step 4 row / close gate += hook reference.
10. `test/test-proof-of-work.js` (new) + `test/test-suites.json` local entry — schema/example/GUI/resolution/gates/orch-docs surface asserts, modeled on `test-verbose-mode.js`.
11. `README.md` — one capabilities-table row for the opt-in step.
12. `test/test-powershell-config-editor.js` — extend `coreDefaults` list with the 2 booleans (string key needs no core-list change; scalar parity Test 9b covers types automatically once rows exist).

Out of scope: `ws-ship-pr`, `ws-goal-fix-pr`/`ws-fix-pr` loop bodies, evidence auto-commit, PR comments, first-party collector skill, PDF output, timesheet integration, `bin/skill-dependencies.json` (no new skill), site footer/version (handled at pre-ship).

## 5. AC mapping

- AC1: touchpoints 1–4. AC2: 6–9. AC3: 5–6. AC4: 1–2, 5. AC5: gate + resolution fail-closed wording; negative test asserts omitted-switch run presents no gate. AC6: 6 (autoMode row). AC7: 6 (never-commit rule). AC8: 6 (skip reasons). AC9: 1–3 + new test + `node test/test-powershell-config-editor.js` exit 0. AC10: `npm run test`, `ws-check-harness`, `scan_stack_invariants.cjs --stack typescript-node` clean.

## 6. Stack & Security Invariants Verification Plan

- Stack: typescript-node, Node-only (no `.py`; no product-code runtime — markdown + JSON + PS1 docs/config surface only; touched `.cjs` is `auto_configure.cjs`).
- Pre-completion static scan: `node .agents/skills/ws-implement-tasks/scripts/scan_stack_invariants.cjs --stack typescript-node` (locate exact path at run time) — must report no new findings.
- GUI sync gate: `node test/test-powershell-config-editor.js` exit 0 (covers scalar-type parity for the new `bool`/`bool`/`string` rows).
- No credentials/hosts/tenants in any added text; folder default uses `{projectRoot}`/`{slug}` tokens only.
- Secrets: `ws-secrets-leak-review` surface check not required (no secrets touched); verify via `npm run test` + `ws-check-harness` Phase 5a.
- Portability: no host product names in added prose; `proof-of-work` referenced as a consumer-installed skill id (convention, not a host product); browser referenced via existing host browser capability vocabulary only.

## 7. Test plan (Step 7)

1. `node test/test-proof-of-work.js` (new).
2. `node test/test-powershell-config-editor.js`.
3. `npm run test` (full suite via `test/run-tests.cjs`, includes new entry).
4. `ws-check-harness` (check entrypoint name at run time).
5. Invariant scan (typescript-node).
6. Integrity: `npm run generate-integrity` + `npm run verify-integrity` after skill edits (same commit).
7. Version bump `npm run build-site:bump` (one patch) + site rebuild before PR.

## 8. Risks

- Sibling workers share this checkout (dirty deletions + untracked plans dirs observed): stage only `feature/us-386` files by exact path; never `git add -A`; never touch `.agents/specs/*`, batch state, or other plans dirs.
- PS1 CRLF: verify line endings before/after edit; use encoding-preserving write.
- `test-suites.json` edit must keep JSON valid and ordering stable.
