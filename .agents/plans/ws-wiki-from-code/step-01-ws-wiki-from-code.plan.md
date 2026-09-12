---
superseded: true
supersededBy: step-02-ws-wiki-from-code.plan.refined.md
slug: ws-wiki-from-code
title: ws-wiki from-code genesis and progressive-disclosure split
status: completed
step: 1
workflowId: ws-wiki-from-code-20260912T171926Z
startedAt: "2026-09-12T17:19:26Z"
endedAt: "2026-09-12T17:20:39.287Z"
acRefs: []
---
## 0. Summary & Business Rules

Extend the existing `ws-wiki` skill (single skill id; no `ws-wiki-from-code` package) with two coordinated changes:

1. **From-code genesis** (`/ws-wiki from-code`, aliases `reverse`, `reconstruct`): alternate whole-tree wiki builder beside Phase 1 sweep. After `{wikiDir}/index.wiki.md` exists, inspect project structure and code in deterministic area order, merge with existing wiki/specs/docs (default), write or refine `{wikiDir}/{domain}/{feature}.md` pages in the 3-section format, checkpoint at `{wikiDir}/from-code.state.json`, finish with `validate_wiki.cjs --check`, then offer Phase 2 verify. Not Phase 4; does not call `ws-spec-write`, register `{plansDir}`, or mutate product source.

2. **Progressive disclosure split**: shrink `SKILL.md` to a router (banner, entry check, wiki 3-section contract, subcommand table with aliases, helper one-liners, `Read {companion} only when invoking {mode}` pointers; target ≤150 lines). Move full procedures into seven companions under `.agents/skills/ws-wiki/`: `INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md`.

Business rules preserved from 0075/0076/0078: sweep overlay order and current-code bias unchanged; verify classification and Phase 3 truth gates unchanged; sync vibe mode stays diff-scoped; merge mode never drops existing Business Rules or Architecture statements; overwrite requires an extra confirm gate; Cancel at any gate is HS-1 STOP; `autoMode` takes recommended options; checkpoint/state files never staged in product commits; no SCM HTTP / remote fetch in helpers or from-code walk.

## 1. Definition of Ready & Scope

Resolved assumptions (from `0079-ws-wiki-from-code.context.md` and spec interview lock):

- Packaging: extend `ws-wiki` only; shared `{wikiDir}` contract.
- Disclosure: split all modes now (not from-code-only).
- Genesis: standalone `/ws-wiki from-code` after init; init gains from-code offer in post-init gate.
- When: anytime after init; merge default; overwrite only via extra gate.
- Context precedence (merge): existing wiki > specs (hints) > README/AGENTS/STACK/docs > code inference.
- Git bound: last 20 local commits + branch names from `config.project`; no `git fetch`.
- Area skip: canonical ids with zero existing paths omitted, not stubbed.
- Auth/tenancy: N/A (local filesystem skill).

Measurable Acceptance Criteria (AC1–AC18 from `step-00-ws-wiki-from-code.spec.md`):

- AC1: Single skill id `ws-wiki`; CATALOG rows mention from-code genesis.
- AC2: `SKILL.md` is router-only; procedures in companions.
- AC3: Seven companions exist; SKILL links them; subcommands + aliases documented on router.
- AC4: Behavioral contracts of sweep/verify/apply/sync unchanged except init from-code offer and prose relocation.
- AC5: From-code without `index.wiki.md` STOPs with init message; invents nothing.
- AC6: Helper `list_wiki_from_code_areas.cjs` JSON shape, canonical area ids, skip-empty, canonical sort.
- AC7: Helper CLI containment, unknown-flag rejection, `--help` exit 0, no SCM HTTP.
- AC8: Candidate paths from config stack layers/srcDir/sourceDir + CI/docs/tests/reviews conventions; `git-surface` has no fs tree requirement.
- AC9: Start gate merge vs Cancel; overwrite confirm when not merge; Cancel writes no checkpoint; autoMode merge.
- AC10: Sequential one-area walk; merge fills gaps without dropping rules; overwrite after confirm replaces bodies + sync index.
- AC11: Checkpoint schema + `--resume`/`--force`; never staged.
- AC12: `--dry-run` prints queue only; no wiki or checkpoint writes.
- AC13: Post-finish Phase 2 offer; Skip/Cancel/autoMode per spec.
- AC14: Init post-init gate branches on zero vs non-zero top-level specs.
- AC15: No product source mutation, no `ws-spec-write`, no `{plansDir}` register; finish runs validate.
- AC16: Tests cover helper, dry-run, STOP copy, companions, CATALOG/SKILL strings; existing sweep/verify tests pass.
- AC17: No host/IDE product names in body/companions/gates/scripts.
- AC18: Spec authoring validation exits 0.

Out of scope: new skill package; Phase 4 naming; product-code implementation; `ws-spec-write` from from-code; remote git/PR fetch; replacing `validate_wiki.cjs` heading rules; auto-committing wiki/checkpoints; machine-generated `{specsDir}` as primary output; host subagent IDs as contract.

## 2. Technical Design & Architecture

Layer edits (per `config.json` stack `node-skills-package`):

### skills-sot (`.agents/skills/ws-wiki/`)

**`SKILL.md` (refactor to router)** — AC1, AC2, AC3, AC17:

- Keep: frontmatter, entry check, wiki 3-section structure summary, phase naming one-liner, subcommands block (add `/ws-wiki from-code` with aliases `reverse`, `reconstruct`).
- Add companion pointer table: `Read INIT.md only when invoking init`, etc.
- Move full mode prose to companions; retain `/ws-wiki validate` CLI block and Deterministic Helpers one-liners (add `list_wiki_from_code_areas.cjs`).
- Target ≤150 lines body (excluding frontmatter).

**Companion files (new)** — AC3, AC4, AC9–AC15:

| File | Content source | Notes |
|------|----------------|-------|
| `INIT.md` | Current § init + AC14 post-init gate | Zero specs → recommend from-code; specs present → recommend sweep + offer from-code merge |
| `FROM-CODE.md` | Spec Description from-code flow | Area map, gates, sequential walk, checkpoint, dry-run, finish, Phase 2 offer |
| `PHASE-1-SWEEP.md` | Current § sweep verbatim move | No behavioral edits |
| `PHASE-2-VERIFY.md` | Current § verify verbatim move | No behavioral edits |
| `PHASE-3-APPLY.md` | Current § apply verbatim move | No behavioral edits |
| `SYNC.md` | Current § sync verbatim move | Vibe-diff mode unchanged |
| `UPDATE.md` | Current § update verbatim move | Surgical update unchanged |

**`scripts/list_wiki_from_code_areas.cjs` (new)** — AC6, AC7, AC8:

- Mirror `list_wiki_sweep_specs.cjs` / `list_wiki_feature_pages.cjs` skeleton: `parseArgs` (`--repo-root`, `--json`, `--help`), unknown-flag exit 2 before tree walk, `assertContained` on `--repo-root`.
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
  - `git-surface`: always include in output with `paths: []` (agent uses local git; no fs requirement) OR omit from `areas` but document in `skipped` — **implementer pins**: include area with empty `paths` and title only (spec allows zero-path omission; for `git-surface` the area is always queued with empty paths so agent always runs git commands). Record empty non-git areas in `skipped` array with `{ id, reason }`.
- Emit `--json`: `{ ok, areas: [{ id, title, paths }], skipped: [...], errors: [...] }` (use `skipped` for empty filesystem areas; `errors` for read failures).
- Sync `fs` only; no `fetch`/HTTP.
- `--help` exits 0; never treat `--help` as path.

### tests (`test/`)

**Extend `test/test-wiki.js`** (or add `test/test-wiki-from-code.js` + register in `package.json` if file exceeds ~700 lines) — AC16:

- Import `LIST_FROM_CODE` constant for new helper.
- Area JSON shape, canonical order, empty `frontend` skip (NS7).
- Containment (NS2), unknown-flag (NS3), `--help` (AC7).
- Dry-run purity prose tests via companion/SKILL string grep (NS4).
- Companion file existence + SKILL link resolution.
- SKILL/CATALOG strings for `/ws-wiki from-code`, aliases, `list_wiki_from_code_areas.cjs`.
- Existing tests 16–20 (sweep/verify) updated to read router + companions: grep `PHASE-1-SWEEP.md` / router table instead of inline sweep body where needed.
- NS8: static grep no `fetch(` in new helper.
- NS5/NS6: prose tests in `FROM-CODE.md` for merge preserve and overwrite gate.

### installer-cli / site

- `CATALOG.md` + `.agents/skills/ws-shared/runtime/CATALOG.md`: extend `ws-wiki` row and task-router row to mention from-code genesis (AC1). Single row per skill id.
- `docs/index.html`: rebuild via `node bin/build-site.js` when shipping (harness protocol; Step 4+).

### Integrity (ship-time)

- Hashed `ws-wiki` changes → `npm run generate-integrity && npm run verify-integrity` in same ship sequence (MEMORY: finish all skill edits before regen).

Fable domain check (`fable.enabled` + `autoDetectDomain`): no IaC/K8s/DB migrations touched; no domain adapter bound.

## 3. Step-by-Step Plan

1. **Area enumerator helper** (AC6, AC7, AC8; NS2, NS3, NS7, NS9):
   - Action: create `.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs` following sibling CLI patterns; implement all nine area collectors, skip-empty logic, JSON output, `--help`.
   - Files: `list_wiki_from_code_areas.cjs` (new).
   - Checks: `node ... --json --repo-root .` on workflow-skills repo; `--repo-root` escape exits non-zero; `--bogus` exits 2; empty `frontend.sourceDir` omits `frontend` from `areas`.

2. **Extract companions from SKILL.md** (AC3, AC4, AC14):
   - Action: create seven companion `.md` files by moving verbatim sections from current `SKILL.md`; update `INIT.md` post-init gate per AC14; write `FROM-CODE.md` from spec Description (gates, walk, checkpoint, dry-run, finish).
   - Files: `INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md` (new).
   - Checks: diff moved sweep/verify/apply sections against git baseline — only path/heading changes, no behavioral drift.

3. **Refactor SKILL.md to router** (AC1, AC2, AC3, AC5, AC17):
   - Action: replace inline procedures with subcommand table + companion pointers; add from-code line and helper one-liner; keep validate CLI and wiki structure contract; verify line count ≤150.
   - Files: `SKILL.md` (modified).
   - Checks: grep forbidden host names empty; all subcommand strings still present for existing tests.

4. **CATALOG updates** (AC1):
   - Action: add "from-code genesis" / "reverse-engineer wiki from code" to `ws-wiki` inventory and task-router rows.
   - Files: `CATALOG.md`, `.agents/skills/ws-shared/runtime/CATALOG.md`.
   - Checks: one row per skill id; wording matches router subcommand names.

5. **Tests** (AC16; NS1, NS4–NS8):
   - Action: extend `test/test-wiki.js` with from-code helper tests, companion presence, router string assertions; adjust tests 16–20 if they read inline SKILL sections (point at companions or router table).
   - Files: `test/test-wiki.js` (and optionally `test/test-wiki-from-code.js`, `package.json`).
   - Checks: `node test/test-wiki.js` exit 0.

6. **Verification pass** (AC18 + stack gates):
   - Action: `validate_spec.cjs --mode=authoring` on spec; `scan_stack_invariants.cjs --stack typescript-node` on touched scripts; defer integrity regen until Step 4 final edits.
   - Checks: all exit 0.

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
| AC4 | Diff review: companion sweep/verify/apply text matches pre-split SKILL sections |
| AC5 | String: `FROM-CODE.md` or router STOP copy for missing index; NS1 |
| AC6 | Helper test: JSON shape, area order, skip-empty, `skipped`/`errors` arrays |
| AC7 | Helper test: containment, unknown-flag exit 2, `--help` exit 0, no `--help` file |
| AC8 | Helper fixture: stack layer paths included when dirs exist; `git-surface` area present with empty paths |
| AC9 | Prose: `FROM-CODE.md` start/overwrite gates, Cancel, autoMode merge |
| AC10 | Prose: sequential walk, merge preserve rules, overwrite + sync |
| AC11 | Prose: checkpoint schema, resume/force, never-stage |
| AC12 | Prose + helper listing purity: dry-run writes nothing (NS4) |
| AC13 | Prose: post-finish Phase 2 offer in `FROM-CODE.md` |
| AC14 | Prose: `INIT.md` zero-spec vs non-zero gate options |
| AC15 | Prose: no ws-spec-write, no plansDir, validate on finish |
| AC16 | Meta: above tests in `test-wiki.js` (or registered sibling); tests 16–20 still pass |
| AC17 | Grep: no host product names in SKILL, companions, scripts |
| AC18 | `validate_spec.cjs --mode=authoring` exit 0 |
| NS2 | Containment test on helper |
| NS3 | Unknown flag / leftover token tests |
| NS4 | Dry-run mtime/checkpoint purity |
| NS5 | Merge preserve prose test |
| NS6 | Overwrite gate prose test |
| NS7 | Empty frontend omitted |
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

Integrity obligation (ship-time): after final hashed skill edits, `npm run generate-integrity && npm run verify-integrity` in same ship sequence.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skill + companions + one helper + tests + catalog only).
- [ ] Domain entities and mappings encapsulated (N/A — wiki 3-section format only).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — path-containment instead).
- [ ] Stack & security invariants verified (sync helper, CLI validation, scan exit 0).
- [ ] i18n keys declared (N/A — en-us only).
- [ ] Test cases cover all ACs (§5 mapping complete).
- [ ] Site rebuild if shipping package content (`node bin/build-site.js`).

## 8. Open Questions

1. **`git-surface` in helper output** — include area with `paths: []` always (recommended: yes, so queue length is stable and agent always runs local git) vs omit like empty `frontend`. Default: include with empty `paths`; document in helper `--help`. Interview may confirm. (Non-blocking.)

2. **Test file split** — extend `test/test-wiki.js` in place vs `test/test-wiki-from-code.js`. Default: extend in place unless >700 lines after additions. (Non-blocking.)

3. **`skipped` vs `errors` for empty areas** — spec allows either; plan uses `skipped: [{ id, reason: "no candidate paths" }]` for empty filesystem areas and `errors` only for I/O failures. Interview may confirm. (Non-blocking.)
