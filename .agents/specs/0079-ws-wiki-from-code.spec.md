---
id: null
slug: ws-wiki-from-code
title: "ws-wiki from-code genesis and progressive-disclosure split"
source: local
specDate: 2026-09-12
status: draft
---

# Specification — ws-wiki from-code genesis and progressive-disclosure split

## Description

`ws-wiki` today reconstructs a living wiki when the consumer already has specs (`/ws-wiki sweep`, Phase 1) and then audits that wiki against code (`/ws-wiki verify` / `/ws-wiki apply`, Phases 2–3). Per-delivery `/ws-wiki sync [slug]` can reverse-engineer a **single git diff** when no spec exists (0075 AC10). That is not enough when a consumer repo has **no spec board at all**, only README / `AGENTS.md` / docs / source.

This spec adds a **genesis from-code** mode on the **same** skill (`ws-wiki`), not a second installable `ws-wiki-from-code`. It also splits the fat SKILL body so each mode loads only when invoked (authoring budget: SKILL.md ideally ≤ 150 lines).

### From-code mode (`/ws-wiki from-code`)

**Aliases:** `reverse`, `reconstruct`

**Not Phase 4.** Sweep / verify / apply stay Phases 1–3 in sequence. From-code is an **alternate genesis** beside sweep: inspect project structure and code, always using existing context, then write `{wikiDir}` feature pages.

**Preconditions:** `{wikiDir}/index.wiki.md` exists. Missing index → STOP with a message to run `/ws-wiki init` first. Do not invent an index.

**When allowed:** After init, **anytime**, including when `{specsDir}` already has specs. Default policy is **merge**, not wipe.

**Context precedence (merge, highest first):**

1. Existing `{wikiDir}` feature pages (do not delete statements).
2. Top-level specs of record, when present (hints / provenance, not a Phase 1 overlay).
3. Project docs: `README.md`, `AGENTS.md`, `STACK.md`, `docs/`, `FEATURES.md`, `index.PRD` when they exist.
4. Inferred behavior from code, tests, CI, and a bounded git surface.

**Destructive overwrite** of existing feature pages is allowed only after an explicit extra `user-gate` (not the default).

**Flow:**

1. **Area map (deterministic).** Helper `list_wiki_from_code_areas.cjs` lists investigation areas with candidate paths. Skip an area when it has zero existing paths (log skip; do not invent trees).
2. **Start gate.** Summarize area count and merge vs overwrite. Recommended: start merge. Cancel → STOP, no pages, no checkpoint. `autoMode`: recommended merge.
3. **Overwrite gate (only if feature pages already exist and the operator did not pick merge).** Second `user-gate`: Overwrite existing wiki from code vs Cancel. Cancel → STOP.
4. **Sequential investigation (one area at a time).** For each queued area: read existing wiki pages that map to it; read matching docs/specs; inspect listed source paths; synthesize or refine `{wikiDir}/{domain}/{feature}.md` in the 3-section format; call `sync_wiki_index.cjs`; update checkpoint. Progress line `{index}/{total} {areaId}`.
5. **`--dry-run`.** Print the ordered area queue (and checkpoint summary if present). Write neither wiki pages nor `from-code.state.json`.
6. **Finish.** `validate_wiki.cjs --check`. Then `user-gate`: Run Phase 2 wiki-vs-code audit (Recommended) vs Skip. Cancel → HS-1 STOP. Skip writes no verify artifacts. `autoMode`: take recommended.

**Canonical areas (v1, helper ids):** `structure`, `frontend`, `backend`, `ci-cd`, `docs`, `domains`, `quality`, `ship`, `git-surface`.

| Area | Typical evidence (when present on disk / config) |
|------|--------------------------------------------------|
| `structure` | `config.json` stack layers, `package.json` / solution files, top-level layout |
| `frontend` | `stack.frontend.sourceDir`, UI routes, forms |
| `backend` | `stack.backend.srcDir` / layers, APIs, persistence |
| `ci-cd` | `.github/workflows`, Azure Pipelines, other CI files under the repo |
| `docs` | `README.md`, `AGENTS.md`, `docs/`, `STACK.md` |
| `domains` | Bounded-context folders, module names, existing wiki domains |
| `quality` | tests, `{reviewsDir}` if configured |
| `ship` | PR templates, ship/close docs, `config.project.baseBranch` / `workingBranch` |
| `git-surface` | Local `git` only: default branch name, current branch, last **20** commits (`git log --oneline -20`). No remote fetch |

Agentic synthesis stays agentic (same quality bar as sweep/sync). Queue membership and skip-empty are deterministic.

**Does not** implement product code, register `{plansDir}`, or invoke `ws-spec-write` (that remains Phase 3).

### Init offer

After successful `init`, the post-init `user-gate` gains a from-code path:

- **Zero** top-level `{specsDir}/*.spec.md`: recommended option is **Run from-code reconstruction**; second option Run spec sweep; third Skip (index only).
- **One or more** specs: keep **Run first-time spec sweep (Recommended)**; add **Run from-code (merge)** as a non-recommended option; Skip unchanged.

Standalone `/ws-wiki from-code` does not require a fresh init.

### Progressive disclosure split

Move full procedures out of `SKILL.md` into companions. `SKILL.md` remains the invocation router: banner, entry check, wiki 3-section contract, **subcommand table with aliases**, helper one-liners, and `Read {file} only when invoking {mode}` pointers. Do **not** load companions until that subcommand is selected.

Required companions (repo-relative under `.agents/skills/ws-wiki/`):

| File | Owns |
|------|------|
| `INIT.md` | `/ws-wiki init` including the post-init gate (sweep vs from-code vs skip) |
| `FROM-CODE.md` | `/ws-wiki from-code` (this genesis) |
| `PHASE-1-SWEEP.md` | `/ws-wiki sweep` (0076 behavior unchanged) |
| `PHASE-2-VERIFY.md` | `/ws-wiki verify` (0078 Phase 2 unchanged) |
| `PHASE-3-APPLY.md` | `/ws-wiki apply` (0078 Phase 3 unchanged) |
| `SYNC.md` | `/ws-wiki sync [slug]` including vibe-diff mode |
| `UPDATE.md` | `/ws-wiki update [target]` |

`/ws-wiki validate` CLI stays documented on `SKILL.md` (already a script). Behavioral contracts of 0075/0076/0078 must not change except init’s extra from-code offer and SKILL.md location of the prose.

### Design Intent

Greenfield genesis path. 0075 deferred feature pages at init on purpose. 0076 sweep is spec-ordered overlay with current-code bias. 0078 verify/apply classify and reconcile an **existing** wiki. None of those reconstruct a wiki when there are no specs. Sync’s vibe mode is diff-scoped, not whole-tree. From-code is the missing whole-tree genesis. Splitting SKILL.md is authoring hygiene (`SKILL_AUTHORING.md` 3-tier), not a new product surface.

### Prior Work Sweep

- Local `git log` on `.agents/skills/ws-wiki/**`, `0075`/`0076`/`0078` specs, `test/test-wiki.js`: skill + sweep shipped (`feat(ws-wiki)`, PRs #319 / sweep commits). Phase 2/3 spec `0078` exists; website wiki HTML is `0077`. No `from-code` / `list_wiki_from_code_areas` helper. SKILL.md is a single ~240-line body (no companions).
- Sync vibe-coding (0075 AC10) reverse-engineers **one** `git diff` / commit range, not project-wide domains.
- `ws-spec-update` patches a single spec; not a wiki generator.
- GitHub: no open PR for wiki-from-code / reverse-engineer wiki.

## Acceptance Criteria

- AC1: Feature remains skill id `ws-wiki`. No new packaged skill folder `ws-wiki-from-code`. `CATALOG.md` / runtime catalog rows stay one `ws-wiki` skill and mention from-code genesis.
- AC2: `.agents/skills/ws-wiki/SKILL.md` is a router: subcommand table, aliases, and load-on-demand pointers only. Full procedures live in the companion files named in Description.
- AC3: Companions `INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, and `UPDATE.md` exist under `.agents/skills/ws-wiki/`. Each is loaded only when that subcommand is invoked. SKILL.md links to them. SKILL.md still names `/ws-wiki sweep`, `/ws-wiki verify` (`audit`, `check-code`), `/ws-wiki apply` (`reconcile`, `phase-3`), `/ws-wiki sync`, and `/ws-wiki from-code` (`reverse`, `reconstruct`).
- AC4: Moving 0076/0078 procedures into companions does not change sweep overlay order, current-code bias, verify classification, Phase 3 truth gates, or `ws-spec-write` code-handoff behavior except as this spec adds from-code and the init offer.
- AC5: `/ws-wiki from-code` without `index.wiki.md` STOP with a message to run `/ws-wiki init` first; it does not invent an index or feature pages.
- AC6: Helper `.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs` prints `--json` `{ ok, areas: [{ id, title, paths }], errors }` for the canonical area ids. An area with no existing candidate paths is omitted from `areas` and recorded in `errors` or a `skipped` array (not invented). Sort is the canonical id order in Description.
- AC7: Helper CLI validates `--repo-root` with directory containment (resolved path stays under repo root); unknown flags and leftover argv tokens are rejected before walking the tree; `--help` exits 0 and is never a filename. Helper does not call SCM HTTP.
- AC8: Candidate paths include `config.json` stack layer / `srcDir` / `sourceDir` values when those directories exist, plus convention hits for CI, docs, tests, and `{reviewsDir}` when configured. `git-surface` contributes no filesystem tree requirement; the agent uses local git commands only as specified (last 20 commits, branch names from `config.project`).
- AC9: Start `user-gate` for from-code: recommended Start merge reconstruction vs Cancel. When feature pages already exist, merge is the default; a separate overwrite confirm is required before deleting or replacing existing wiki statements. Cancel STOP writes no `from-code.state.json`. `autoMode` takes merge.
- AC10: Sequential walk is one area at a time. Merge mode creates missing domain/feature pages and fills empty 3-section headings from code/docs; it does not drop existing Business Rules or Architecture statements. Overwrite mode (after confirm) may replace page bodies but still writes 3-section pages and then `sync_wiki_index.cjs`.
- AC11: Checkpoint `{wikiDir}/from-code.state.json` records `status` (`running` | `completed`), `completedAreas`, `lastArea`, `mode` (`merge` | `overwrite`), `startedAt`, `updatedAt`. `--resume` continues after `lastArea` unless `--force`. Agents must not stage this file in product commits.
- AC12: `--dry-run` prints the area queue (and checkpoint summary if present) and writes neither wiki pages nor `from-code.state.json`.
- AC13: After a successful from-code finish, present `user-gate` Run Phase 2 wiki-vs-code audit (Recommended) vs Skip. Skip writes no verify artifacts. Cancel STOP. `autoMode` takes recommended.
- AC14: After successful `init`, if the helper/spec enumerator reports **zero** top-level specs, the init `user-gate` recommends from-code reconstruction; spec sweep remains an option. If one or more specs exist, sweep remains recommended and from-code merge is offered as a non-recommended option.
- AC15: From-code does not mutate product source, does not call `ws-spec-write`, and does not register `{plansDir}`. Finish still runs `validate_wiki.cjs --check`.
- AC16: `test/test-wiki.js` (or sibling `test/test-wiki-from-code.js` listed in `package.json` test scripts) covers AC6–AC7, AC12 dry-run, missing-index STOP copy or skill contract test, empty-area skip, containment/unknown-flag failures, companion file presence, and SKILL/CATALOG strings for `/ws-wiki from-code`. Existing sweep/verify SKILL string tests still pass via the router table.
- AC17: No host/IDE product names in skill body, companions, gates, or scripts (portable `user-gate` / `askQuestion` alias only).
- AC18: Authoring validation for this specification exits 0.

## Original Issue Context

Standalone `/ws-spec-write` (2026-09-12), free-text (paraphrase of operator prompt):

Improve `ws-wiki` with reverse-engineering from code for consumers that have no specs, only README / AGENTS / docs. Analyze project structure (frontend, backend, CI/CD, docs, features, domains, code-reviews, ship, commits, branches). Investigate each domain from code using existing context, then write the wiki. Decide whether to extend `ws-wiki` or add `ws-wiki-from-code`, and whether to split step files for progressive disclosure.

Interview lock (same session):

- Packaging: extend `ws-wiki` (no new skill id).
- Disclosure: extract sweep / verify / apply / sync (and init / update / from-code) into companion `.md` files in this spec.
- Genesis: new `/ws-wiki from-code` after init (not folded into init; not automatic empty-spec sweep).
- When: anytime after init; merge with existing wiki/specs/docs; overwrite only via explicit gate.

### Prior Work Sweep

See Description.

## Notes

- Stack: `node-skills-package` / TypeScript-Node invariants apply to the new `.cjs` helper (CLI validation, path containment, no floating Promises).
- Integrity: hashed `ws-wiki` files change → `npm run generate-integrity` in the same ship PR (implementation, not this spec-write).
- Do not load `ws-run-benchmark` for this work.
- `{wikiDir}` token: `plans.wikiDir` or default `.agents/specs/wiki`.
- Tests that `Read` full sweep/verify procedures must follow the new companion paths.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New skill package `ws-wiki-from-code` | Operator chose one skill id; shared `{wikiDir}` contract |
| Calling this mode Phase 4 | It is genesis beside sweep, not after apply |
| Implementing product code or `ws-spec-write` from from-code | Spec generation stays Phase 3 |
| Full git history / remote PR archaeology | v1 is last 20 local commits + branch names; no network |
| Replacing Phase 1 current-code overlay | Sweep unchanged |
| Auto-committing wiki or checkpoints | Staging stays a later docs/G2 commit |
| Machine-generated `{specsDir}` from code as the primary output | Wiki is the output; specs remain delivery contracts |
| Host-specific subagent IDs as the contract | Skill stays portable |
| Rewriting `validate_wiki.cjs` heading rules | Structural validate stays links + 3 headings |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Packaging | Same `ws-wiki` skill | Shared output contract and operator routing | y |
| Disclosure | Split companions in this spec | SKILL.md already over 150 lines; operator asked split-all-now | y |
| Subcommand | `/ws-wiki from-code` after init | Init stays taxonomy; from-code writes feature pages | y |
| When | Anytime after init; merge default | Specs-poor and spec-rich repos both exist | y |
| Overwrite | Extra gate only | Protects sweep/verify wiki | y |
| Git bound | 20 local commits, no fetch | Avoids network and unbounded archaeology | y |
| Area skip | Omit empty areas | Do not invent frontend when `sourceDir` is empty | y |
| Auth / rate limits / tenancy | N/A because local filesystem skill, no network API | Stack HTTP/auth dimensions do not apply | y |
| Checkpoint | `{wikiDir}/from-code.state.json`, not committed | Same pattern as sweep/verify | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill router + companions + area helper + tests + catalog mention; no orch FSM rewrite | Diff vs `0075`/`0076`/`0078` files |
| Atomic criteria | AC1–AC18 binary | `test-wiki` / from-code tests + `validate_spec --mode=authoring` |
| Failure modes | Missing index, empty areas, bad flags, path escape, start/overwrite Cancel, dry-run purity | Negative tests + skill STOP copy |
| Observation telemetry | Helper JSON areas; checkpoint fields; progress lines; validate exit | stdout / `--json` |
| Open blockers | None; interview defaults recorded in companion | Companion `0079-ws-wiki-from-code.context.md` |
| Stack: path traversal | Enumerator resolves under repo root only | Unit tests with `..` and absolute `--repo-root` |
| Stack: CLI input | Unknown flags rejected; `--help` exits 0 and is never a filename | Unit tests |
| Stack: async | New helper stays sync `fs` or awaited Promises; no floating Promises | Code review of `.cjs` |
| Stack: auth / DTO / subscriptions | N/A because no HTTP API, no Angular | Skip with reason |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs --json --repo-root .` prints ordered `areas[]`.
- From-code progress line per area: `{index}/{total} {areaId}`.
- `{wikiDir}/from-code.state.json` `lastArea` and `mode` advance as documented.
- After finish: `validate_wiki.cjs --check` JSON `ok`.
- Companion files exist; SKILL.md links resolve (`ws-doctor` / relative-link checks).
- `node test/test-wiki.js` (and from-code sibling if split) exit 0.

### Negative & Failing Test Scenarios

- Missing `index.wiki.md`: `/ws-wiki from-code` STOP; helper may still list areas; skill must not write feature pages.
- `--repo-root` resolving outside the intended tree: helper exit non-zero, no walk of the escaped path.
- Unknown argv token / leftover `--help` as path: `--help` exit 0; other dash tokens non-zero.
- `--dry-run` after a partial checkpoint: no wiki mtime/content change, no new checkpoint write.
- Merge mode on an existing page that already has a business rule: that rule remains in the file after the run.
- Overwrite without the extra confirm: no existing feature page body replaced.
- Empty frontend `sourceDir`: `frontend` omitted from `areas`; run still succeeds.
- Unauthenticated network calls: N/A because from-code does not call SCM HTTP; a regression that adds unauthenticated remote fetch for from-code must not ship.
- Stack path-containment / unknown-flag failures on the new helper (same class as sweep enumerator).
