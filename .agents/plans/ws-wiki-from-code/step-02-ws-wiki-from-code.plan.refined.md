---
slug: ws-wiki-from-code
title: ws-wiki from-code genesis and progressive-disclosure split
status: completed
step: 2
workflowId: ws-wiki-from-code-20260912T171926Z
startedAt: "2026-09-12T17:19:26Z"
endedAt: "2026-09-12T17:25:00Z"
refinedFrom: .agents/plans/ws-wiki-from-code/step-01-ws-wiki-from-code.plan.md
spec: .agents/plans/ws-wiki-from-code/step-00-ws-wiki-from-code.spec.md
interview: .agents/plans/ws-wiki-from-code/step-02-ws-wiki-from-code.plan-interview.md
acRefs: []
---
*Step 2 (interview) resolutions folded inline (registry G1–G10 in `step-02-ws-wiki-from-code.plan-interview.md`); `step-01` untouched. Pins added: §2 git-surface/skipped/errors/helper flags/companion pointers, §3 step 2 drift proof + step 5 test migration, §7 ship checklist, §8 OQ1–OQ3 resolved.*

## 0. Summary & Business Rules

Extend the existing `ws-wiki` skill (single skill id; no `ws-wiki-from-code` package) with two coordinated changes:

1. **From-code genesis** (`/ws-wiki from-code`, aliases `reverse`, `reconstruct`): alternate whole-tree wiki builder beside Phase 1 sweep. After `{wikiDir}/index.wiki.md` exists, inspect project structure and code in deterministic area order, merge with existing wiki/specs/docs (default), write or refine `{wikiDir}/{domain}/{feature}.md` pages in the 3-section format, checkpoint at `{wikiDir}/from-code.state.json`, finish with `validate_wiki.cjs --check`, then offer Phase 2 verify. Not Phase 4; does not call `ws-spec-write`, register `{plansDir}`, or mutate product source.

2. **Progressive disclosure split**: shrink `SKILL.md` to a router (banner, entry check, wiki 3-section contract, subcommand table with aliases, helper one-liners, `Read {companion} only when invoking {mode}` pointers using co-located filenames; target ≤150 lines). Move full procedures into seven companions under `.agents/skills/ws-wiki/`: `INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md`.

Business rules preserved from 0075/0076/0078: sweep overlay order and current-code bias unchanged; verify classification and Phase 3 truth gates unchanged; sync vibe mode stays diff-scoped; merge mode never drops existing Business Rules or Architecture statements; overwrite requires an extra confirm gate; Cancel at any gate is HS-1 STOP; `autoMode` takes recommended options; checkpoint/state files never staged in product commits; no SCM HTTP / remote fetch in helpers or from-code walk.

## 1. Definition of Ready & Scope

Resolved assumptions (from `0079-ws-wiki-from-code.context.md` and spec interview lock):

- Packaging: extend `ws-wiki` only; shared `{wikiDir}` contract.
- Disclosure: split all modes now (not from-code-only).
- Genesis: standalone `/ws-wiki from-code` after init; init gains from-code offer in post-init gate.
- When: anytime after init; merge default; overwrite only via extra gate.
- Context precedence (merge): existing wiki > specs (hints) > README/AGENTS/STACK/docs > code inference.
- Git bound: last 20 local commits + branch names from `config.project`; no `git fetch`.
- Area skip: canonical filesystem areas with zero existing paths omitted from `areas` and recorded in `skipped` (not stubbed). **`git-surface` exception:** always present in `areas` with `paths: []` because investigation is git-only (AC8).
- Auth/tenancy: N/A (local filesystem skill).

Measurable Acceptance Criteria (AC1–AC18 from `step-00-ws-wiki-from-code.spec.md`):

- AC1: Single skill id `ws-wiki`; CATALOG rows mention from-code genesis (one row per skill id; merge intent, no duplicate router rows).
- AC2: `SKILL.md` is router-only; procedures in companions.
- AC3: Seven companions exist; SKILL links them; subcommands + aliases documented on router.
- AC4: Behavioral contracts of sweep/verify/apply/sync unchanged except init from-code offer and prose relocation (verbatim section move proof via git baseline diff).
- AC5: From-code without `index.wiki.md` STOPs with init message; invents nothing.
- AC6: Helper `list_wiki_from_code_areas.cjs` JSON shape, canonical area ids, skip-empty filesystem areas into `skipped`, canonical sort; `git-surface` always in `areas`.
- AC7: Helper CLI containment, unknown-flag rejection, `--help` exit 0, no SCM HTTP.
- AC8: Candidate paths from config stack layers/srcDir/sourceDir + CI/docs/tests/reviews conventions; `git-surface` has no fs tree requirement.
- AC9: Start gate merge vs Cancel; overwrite confirm when not merge; Cancel writes no checkpoint; autoMode merge.
- AC10: Sequential one-area walk; merge fills gaps without dropping rules; overwrite after confirm replaces bodies + sync index.
- AC11: Checkpoint schema + `--resume`/`--force`; never staged.
- AC12: `--dry-run` prints queue only; no wiki or checkpoint writes.
- AC13: Post-finish Phase 2 offer; Skip/Cancel/autoMode per spec.
- AC14: Init post-init gate branches on zero vs non-zero top-level specs.
- AC15: No product source mutation, no `ws-spec-write`, no `{plansDir}` register; finish runs validate.
- AC16: Tests cover helper, dry-run, STOP copy, companions, CATALOG/SKILL strings; existing sweep/verify tests pass after companion grep migration (G7).
- AC17: No host/IDE product names in body/companions/gates/scripts.
- AC18: Spec authoring validation exits 0.

Out of scope: new skill package; Phase 4 naming; product-code implementation; `ws-spec-write` from from-code; remote git/PR fetch; replacing `validate_wiki.cjs` heading rules; auto-committing wiki/checkpoints; machine-generated `{specsDir}` as primary output; host subagent IDs as contract.

## 2. Technical Design & Architecture

Layer edits (per `config.json` stack `node-skills-package`):

### skills-sot (`.agents/skills/ws-wiki/`)

**`SKILL.md` (refactor to router)** — AC1, AC2, AC3, AC17:

- Keep: frontmatter, entry check, wiki 3-section structure summary, phase naming one-liner, subcommand block (add `/ws-wiki from-code` with aliases `reverse`, `reconstruct`).
- Add companion pointer table with load-on-demand prose: `Read INIT.md only when invoking init`, `Read FROM-CODE.md only when invoking from-code`, etc. (co-located sibling filenames; no host projection paths).
- Move full mode prose to companions; retain `/ws-wiki validate` CLI block and Deterministic Helpers one-liners (add `list_wiki_from_code_areas.cjs`).
- Target ≤150 lines body (excluding frontmatter). Router keeps subcommand names, phase one-liners, helper invocations, and companion pointers — not deep procedure blocks (those live in companions per G7).

**Companion files (new)** — AC3, AC4, AC9–AC15:

| File | Content source | Notes |
|------|----------------|-------|
| `INIT.md` | Current § init + AC14 post-init gate | Zero specs → recommend from-code; specs present → recommend sweep + offer from-code merge |
| `FROM-CODE.md` | Spec Description from-code flow | Area map, gates, sequential walk, checkpoint, dry-run, finish, Phase 2 offer |
| `PHASE-1-SWEEP.md` | Current § sweep verbatim move | No behavioral edits; post-sweep Phase 2 offer prose lives here |
| `PHASE-2-VERIFY.md` | Current § verify verbatim move | No behavioral edits; deep verify prose for Test 20 greps |
| `PHASE-3-APPLY.md` | Current § apply verbatim move | No behavioral edits; truth-gate / batch-apply prose for Test 20 greps |
| `SYNC.md` | Current § sync verbatim move | Vibe-diff mode unchanged |
| `UPDATE.md` | Current § update verbatim move | Surgical update unchanged |

**AC4 drift proof (G9):** After extraction, diff each moved section against `git show HEAD:.agents/skills/ws-wiki/SKILL.md` baseline — only heading/path changes allowed; no behavioral edits.

**`scripts/list_wiki_from_code_areas.cjs` (new)** — AC6, AC7, AC8:

- Mirror `list_wiki_sweep_specs.cjs` skeleton: `parseArgs` (`--repo-root`, `--json`, `--help` only — reject `--specs-dir`, `--wiki-dir`, unknown flags exit 2 before tree walk), `assertContained` on `--repo-root` (copy pattern from `list_wiki_sweep_specs.cjs:51-58`).
- Use `resolveConsumerContext` from `ws-shared/runtime/scripts/resolve_consumer_root.cjs`.
- Canonical area ids in fixed order: `structure`, `frontend`, `backend`, `ci-cd`, `docs`, `domains`, `quality`, `ship`, `git-surface`.
- Per area, collect existing candidate paths only (no invention):
  - `structure`: `config.json`, `package.json`, stack layer paths from config when dirs exist.
  - `frontend`: `stack.frontend.sourceDir` when non-empty and exists.
  - `backend`: `stack.backend.srcDir` and layer paths when exist.
  - `ci-cd`: `.github/workflows/**`, `azure-pipelines.yml`, other CI files under repo (bounded glob).
  - `docs`: `README.md`, `AGENTS.md`, `STACK.md`, `docs/`, `FEATURES.md`, `index.PRD` when exist.
  - `domains`: bounded-context dirs, module folders, existing wiki domain subdirs.
  - `quality`: `stack.backend.testProject`, `test/`, `{reviewsDir}` when configured.
  - `ship`: PR templates, ship docs, branch config refs.
  - **`git-surface` (G1/G5):** always include in `areas` with `paths: []` and a title; agent runs local git (`git log --oneline -20`, branch names). Document in `--help` that filesystem skip-empty does not apply. Never place `git-surface` in `skipped`.
- **Skip-empty (G3):** filesystem areas with zero paths → omit from `areas`, append to `skipped: [{ id, reason: "no candidate paths" }]`. I/O failures → `errors`.
- Emit `--json`: `{ ok, areas: [{ id, title, paths }], skipped: [...], errors: [...] }`.
- Sync `fs` only; no `fetch`/HTTP.
- `--help` exits 0; never treat `--help` as path.

### tests (`test/`)

**Extend `test/test-wiki.js`** (split to `test/test-wiki-from-code.js` only if post-addition file exceeds 700 lines — G2) — AC16:

- Import `LIST_FROM_CODE` constant for new helper.
- Area JSON shape, canonical order, empty `frontend` skip (NS7), `git-surface` always in `areas` with `paths: []`.
- Containment (NS2), unknown-flag (NS3), `--help` (AC7); reject `--specs-dir` (G10).
- Dry-run purity prose tests via `FROM-CODE.md` (NS4).
- Companion file existence + SKILL link resolution.
- SKILL/CATALOG strings for `/ws-wiki from-code`, aliases, `list_wiki_from_code_areas.cjs`.
- **Tests 16–20 migration (G7):** keep subcommand/alias/phase-name asserts on SKILL router; move deep procedure-string asserts to the owning companion (`INIT.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`). Extend AC18 host-name grep to all companions.
- NS8: static grep no `fetch(` in new helper.
- NS5/NS6: prose tests in `FROM-CODE.md` for merge preserve and overwrite gate.

### installer-cli / site

- `CATALOG.md` + `.agents/skills/ws-shared/runtime/CATALOG.md`: extend existing single `ws-wiki` row and task-router row to mention from-code genesis (AC1). Merge intent; no duplicate rows (MEMORY 2026-09-02).
- `docs/index.html`: rebuild via `node bin/build-site.js` at ship (G8); keep `node test/test-doc-sync.js` green.

### Integrity (ship-time — G4)

- After **all** final `ws-wiki` hashed edits (SKILL + seven companions + scripts + CATALOG if hashed): `npm run generate-integrity && npm run verify-integrity` on a **clean tree** (no untracked files under `.agents/skills/`).
- `ws-spec-write` direct dep already present in `bin/skill-dependencies.json` and runtime mirror — no new edge.

Fable domain check (`fable.enabled` + `autoDetectDomain`): no IaC/K8s/DB migrations touched; no domain adapter bound.

## 3. Step-by-Step Plan

1. **Area enumerator helper** (AC6, AC7, AC8; NS2, NS3, NS7, NS9):
   - Action: create `.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs` following sibling CLI patterns; implement all nine area collectors, skip-empty → `skipped`, `git-surface` always in `areas` with `paths: []`, JSON output, `--help`.
   - Files: `list_wiki_from_code_areas.cjs` (new).
   - Checks: `node ... --json --repo-root .` on workflow-skills repo; `--repo-root` escape exits non-zero; `--bogus` exits 2; empty `frontend.sourceDir` omits `frontend` from `areas` (in `skipped`); `git-surface` always in `areas`.

2. **Extract companions from SKILL.md** (AC3, AC4, AC14; G9):
   - Action: create seven companion `.md` files by moving **verbatim** sections from current `SKILL.md`; update `INIT.md` post-init gate per AC14; write `FROM-CODE.md` from spec Description (gates, walk, checkpoint, dry-run, finish).
   - Files: `INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md` (new).
   - Checks: diff moved sweep/verify/apply/sync/update sections against `git show HEAD:.agents/skills/ws-wiki/SKILL.md` — only path/heading changes, no behavioral drift.

3. **Refactor SKILL.md to router** (AC1, AC2, AC3, AC5, AC17; G6):
   - Action: replace inline procedures with subcommand table + companion load-on-demand pointers; add from-code line and helper one-liner; keep validate CLI and wiki structure contract; verify line count ≤150.
   - Files: `SKILL.md` (modified).
   - Checks: grep forbidden host names empty; all subcommand strings still present on router for Tests 16/19.

4. **CATALOG updates** (AC1):
   - Action: add "from-code genesis" / "reverse-engineer wiki from code" to existing `ws-wiki` inventory and task-router rows (one row per skill id).
   - Files: `CATALOG.md`, `.agents/skills/ws-shared/runtime/CATALOG.md`.
   - Checks: one row per skill id; wording matches router subcommand names.

5. **Tests** (AC16; NS1, NS4–NS8; G2, G7):
   - Action: extend `test/test-wiki.js` with from-code helper tests, companion presence, router string assertions; migrate Tests 16–20 deep-procedure greps to companions per G7 table.
   - Files: `test/test-wiki.js` (and `test/test-wiki-from-code.js` + `package.json` only if >700 lines after edits).
   - Checks: `node test/test-wiki.js` exit 0.

6. **Verification pass** (AC18 + stack gates):
   - Action: `validate_spec.cjs --mode=authoring` on spec; `scan_stack_invariants.cjs --stack typescript-node` on touched scripts.
   - Checks: all exit 0. Defer integrity regen + site rebuild to ship PR (§7).

**Defect-class sibling sweep** (repo-wide): grep for other skills with monolithic `SKILL.md` >150 lines that document subcommands inline — out of scope for this delivery except `ws-wiki`; note for future hygiene only.

**Sabotage verification**: not required (no regression AC; mutation unset in ac-ledger).

## 4. Permissions, Tenancy & i18n

RBAC: N/A — no HTTP API or endpoint attributes. Tenancy: N/A — repo-local paths only. i18n: N/A — en-us CLI/skill prose. Applicable boundary: path traversal via `assertContained` on `--repo-root` and wiki writes under `{wikiDir}` (same as existing helpers). From-code does not edit product source outside `{wikiDir}`.

## 5. Test Coverage

| AC | Test mapping |
|----|----------------|
| AC1 | String: CATALOG rows mention from-code; no `ws-wiki-from-code` skill folder in `bin/skill-dependencies.json` |
| AC2 | String: `SKILL.md` has companion pointers; no full sweep/verify procedure blocks inline (moved to companions) |
| AC3 | File existence: all seven companions; SKILL links; router lists sweep/verify/apply/sync/from-code + aliases |
| AC4 | Diff review: companion sweep/verify/apply text matches pre-split SKILL sections (git baseline) |
| AC5 | String: `FROM-CODE.md` or router STOP copy for missing index; NS1 |
| AC6 | Helper test: JSON shape, area order, skip-empty → `skipped`, `git-surface` in `areas` with `paths: []` |
| AC7 | Helper test: containment, unknown-flag exit 2, `--help` exit 0, no `--help` file |
| AC8 | Helper fixture: stack layer paths included when dirs exist; `git-surface` area present with empty paths |
| AC9 | Prose: `FROM-CODE.md` start/overwrite gates, Cancel, autoMode merge |
| AC10 | Prose: sequential walk, merge preserve rules, overwrite + sync |
| AC11 | Prose: checkpoint schema, resume/force, never-stage |
| AC12 | Prose + helper listing purity: dry-run writes nothing (NS4) |
| AC13 | Prose: post-finish Phase 2 offer in `FROM-CODE.md` |
| AC14 | Prose: `INIT.md` zero-spec vs non-zero gate options |
| AC15 | Prose: no ws-spec-write, no plansDir, validate on finish |
| AC16 | Meta: above tests in `test-wiki.js` (or registered sibling); Tests 16–20 migrated per G7 |
| AC17 | Grep: no host product names in SKILL, companions, scripts |
| AC18 | `validate_spec.cjs --mode=authoring` exit 0 |
| NS2 | Containment test on helper |
| NS3 | Unknown flag / leftover token tests |
| NS4 | Dry-run mtime/checkpoint purity |
| NS5 | Merge preserve prose test |
| NS6 | Overwrite gate prose test |
| NS7 | Empty frontend omitted (in `skipped`) |
| NS8 | No fetch in new helper |
| NS9 | Containment same class as sweep enumerator |

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` (stack id `node-skills-package`). Touched framework boundaries:

- **Authorization & endpoint protection**: NOT TOUCHED — no HTTP endpoints, middleware, or route guards. Verified by: grep new helper/scripts for `authoriz|middleware|policy|guard(` returns none.

- **Concurrency & async safety (zero floating Promises)**: TOUCHED (new Node helper). Rule: sync `fs` only (`existsSync`, `readdirSync`, `statSync`); no `async`/`await`/bare `Promise`. Verified by: code review + `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` scoped to `.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs` exits 0.

- **Input validation & DTO boundary**: TOUCHED (CLI surface). Rules: unknown `--flags` and leftover positionals rejected exit 2 before `readdir`; `--help` short-circuits exit 0; `--repo-root` resolved via `assertContained`. Verified by: AC7/NS2/NS3 tests + invariant scan path-containment rule.

- **Subscription & lifecycle cleanup**: NOT TOUCHED — no streams, sockets, watchers, or event listeners; sync fs calls release descriptors on return. Verified by: review (no `createReadStream`/`on(` without cleanup).

Pre-PR verification commands (Step 4+/7):

```bash
node test/test-wiki.js
node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/plans/ws-wiki-from-code/step-00-ws-wiki-from-code.spec.md"
```

**Ship-time integrity obligation (G4):** after final hashed skill edits on a clean tree, `npm run generate-integrity && npm run verify-integrity` in the same ship sequence (no concurrent source edits).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skill + companions + one helper + tests + catalog only).
- [ ] Domain entities and mappings encapsulated (N/A — wiki 3-section format only).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — path-containment instead).
- [ ] Stack & security invariants verified (sync helper, CLI validation, scan exit 0).
- [ ] i18n keys declared (N/A — en-us only).
- [ ] Test cases cover all ACs (§5 mapping complete); Tests 16–20 companion migration done (G7).
- [ ] CATALOG rows updated (one `ws-wiki` row; from-code intent merged).
- [ ] Site rebuild: `node bin/build-site.js` (G8).
- [ ] Doc sync: `node test/test-doc-sync.js` green (G8).
- [ ] Integrity: `npm run generate-integrity && npm run verify-integrity` after all hashed edits, clean tree (G4).

## 8. Open Questions

All resolved in Step 2 interview (registry G1–G3, G5, G10):

1. **`git-surface` in helper output** — **Resolved (G1):** always include in `areas` with `paths: []`; document in `--help`; never in `skipped`.
2. **Test file split** — **Resolved (G2):** extend `test/test-wiki.js` in place at 596 lines; split only if post-addition exceeds 700 lines.
3. **`skipped` vs `errors` for empty areas** — **Resolved (G3):** `skipped` for zero-path filesystem areas; `errors` for I/O failures only.
