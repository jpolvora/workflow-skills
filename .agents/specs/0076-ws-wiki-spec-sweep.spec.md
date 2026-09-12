---
id: null
slug: ws-wiki-spec-sweep
title: "ws-wiki first-time sequential spec sweep"
source: local
specDate: 2026-09-12
status: draft
---

# Specification — ws-wiki first-time sequential spec sweep

## Description

Extend the shipped `ws-wiki` skill (contract: `.agents/specs/0075-ws-wiki.spec.md`) so that after `init` an agent can backfill the living wiki from the whole spec board, in chronological filename order, instead of requiring a long free-text prompt.

Today `/ws-wiki init` writes `index.wiki.md` and **defers feature subpages**. `/ws-wiki sync [slug]` updates one delivered feature (or one git diff) and stops at a per-diff `user-gate`. That is correct for ongoing delivery, but it does not reconstruct current product knowledge when a consumer already has many `NNNN-*.spec.md` files. Operators currently paste a prompt such as: read every spec from `0001` through the last `NNNN-*`, and after each spec update the wiki in place so the final tree reflects the **current** system.

This spec adds a first-time **spec sweep** mode:

1. **Offer after init.** When `/ws-wiki init` finishes writing or confirming `index.wiki.md`, present a `user-gate`: run first-time spec sweep (recommended when the wiki has no feature pages, or only seed pages) or skip (index-only). Cancel is HS-1 STOP.
2. **Standalone invoke.** `/ws-wiki sweep` (aliases `first-time`, `backfill`) runs the same loop without requiring a fresh init, but **STOP** if `{wikiDir}/index.wiki.md` is missing (tell the user to run `init` first).
3. **Deterministic queue.** A Node helper lists **top-level** `{specsDir}/*.spec.md` only, ordered by numeric `NNNN` prefix ascending, then unprefixed `*.spec.md` lexicographically. Nested copies (`**/step-00-*.spec.md`), `{wikiDir}/**`, `*.context.md`, and non-spec markdown are excluded.
4. **Progressive overlay.** For each spec in that order: read the spec of record; inspect **current** shipped code/docs named by that spec (skills, scripts, tests, hub files); map domain page(s); refine `{wikiDir}/{domain}/{feature}.md` in place (later specs win over earlier ones); call `sync_wiki_index.cjs`; continue. Do not append changelog-style history on wiki pages.
5. **Current-version bias.** When the spec of record disagrees with the code now on disk, the wiki records the **code**. Spec text is provenance, not a frozen product claim.
6. **Sweep gates (not per-spec Apply/Cancel).** One start gate for the whole run (or the post-init offer). Writes proceed spec-by-spec without 0075 AC11’s per-sync Apply/Cancel. `/ws-wiki sync [slug]` keeps that per-item gate. Sweep Cancel at start writes nothing. Mid-run user Pause is allowed; resume continues after the last completed spec.

The enumerator is deterministic and testable. Domain mapping, page synthesis, and code consult remain agentic (same quality bar as `sync`), driven by the helper’s ordered list and checkpoint.

### Design Intent

`0075` deferred feature pages at init **on purpose** so empty stubs were not minted before delivery. That is not a bug. Sweep is an explicit first-time (and re-runnable) backfill that walks historical specs in prefix order so the wiki converges on present behavior. It does not replace per-slug `sync` after a new PR.

### Prior Work Sweep

- Local keyword + `git log` on `.agents/skills/ws-wiki/**`, `test/test-wiki.js`, `0075-ws-wiki.spec.md`: skill shipped (`feat(ws-wiki)`, PR #319). Scripts today: `validate_wiki.cjs`, `sync_wiki_index.cjs`. No sweep/list enumerator.
- `ws-spec-multi` `list_pending_specs.cjs` lists **pending** board items only. Sweep must include completed specs so later overlays can supersede early ACs. Do not reuse the pending-only list.
- `ws-spec-organizer` `resolve_spec_path.cjs` fail-closes when both `{slug}.spec.md` and `NNNN-{slug}.spec.md` exist. Sweep must apply the same fail-closed skip for that slug, not pick last-readdir.
- `ws-spec-index` / `index.PRD` track delivery status; they are not wiki pages.
- GitHub PR search for “wiki sweep”: no matching open PR. Related: #319 `ws-wiki` itself.

## Acceptance Criteria

- AC1: `ws-wiki/SKILL.md` documents subcommand `/ws-wiki sweep` (aliases `first-time` and `backfill`) and a post-`init` `user-gate` offering first-time spec sweep (recommended) versus skip.
- AC2: After successful `init`, the agent presents that gate before ending the init turn; Skip leaves feature pages untouched; Cancel STOP without further wiki writes.
- AC3: `/ws-wiki sweep` without `index.wiki.md` STOP with a message to run `init` first; it does not invent an index.
- AC4: Helper `.agents/skills/ws-wiki/scripts/list_wiki_sweep_specs.cjs` lists only top-level `{specsDir}/*.spec.md` (respect `plans.specsDir`), excluding `{wikiDir}`, nested `step-00-*.spec.md`, and `*.context.md`.
- AC5: Helper sort order is integer `NNNN` ascending for `NNNN-*.spec.md`, then unprefixed `*.spec.md` lexicographically; `--json` prints `{ ok, specs: [{ prefix, slug, file }], errors }`.
- AC6: When both `{slug}.spec.md` and `NNNN-{slug}.spec.md` exist for the same slug, the helper does not choose one: it omits that slug from `specs` and records an error entry (fail closed), and the sweep continues with remaining specs.
- AC7: Helper CLI validates `--repo-root` / `--specs-dir` with directory containment (resolved path stays under repo root); unknown flags and leftover argv tokens are rejected before `readdir` (no treating `--help` as a path).
- AC8: For each queued spec, the agent reads that file, consults current matching product files, and writes or refines the mapped `{wikiDir}/{domain}/{feature}.md` 3-section pages before advancing to the next spec (progressive disk updates).
- AC9: When current code contradicts an older spec AC, the wiki page states the current behavior and may note the spec as historical provenance; it does not leave superseded rules as if they were still true.
- AC10: After each successful spec overlay, the agent runs `sync_wiki_index.cjs` for new or updated feature links; it does not wait until the end of the queue to index the first pages.
- AC11: Sweep does **not** present 0075’s per-sync Apply/Cancel `user-gate` for each spec; `/ws-wiki sync [slug]` still does. Sweep start Cancel writes no sweep pages. A completed spec in the checkpoint is not re-applied on `--resume` unless `--force`.
- AC12: Checkpoint `{wikiDir}/sweep.state.json` records `status`, `completedFiles` (repo-relative POSIX), `lastFile`, `startedAt`, `updatedAt`. `--resume` continues after `lastFile`. Successful full run deletes or sets `status: completed`. Agents must not stage this file in product commits.
- AC13: `--dry-run` prints the ordered queue (and checkpoint, if any) and writes neither wiki pages nor `sweep.state.json`.
- AC14: After the last spec (or on empty queue), the agent runs `validate_wiki.cjs --check` and reports counts: processed, skipped (ambiguous or unreadable), pages written, validate exit code. Empty `{specsDir}` is success with processed `0`, not an error.
- AC15: Sweep is sequential only (one spec at a time) so overlay order is the helper order; no parallel page writes for the same wiki file.
- AC16: `test/test-wiki.js` (or a sibling `test/test-wiki-sweep.js` listed in `package.json` test scripts) covers AC4–AC7, AC11 resume skip, AC13 dry-run, empty specs dir, and containment/unknown-flag failures.
- AC17: `CATALOG.md` task-router / skill row mentions first-time spec sweep; no host/IDE product names in skill body, gates, or scripts.
- AC18: Authoring validation for this specification exits 0.

## Original Issue Context

Standalone `/ws-spec-write` (2026-09-12), free-text:

> improve ws-wiki skill to support after init process, offer an first time sweep all specs from repository and code to run a first time inspect all specs to write. This will be a shortcut for a prompt like I did:
>
> "/ws-wiki get all specs one by one in order (0001, 0002, etc.) until last one (NNNN-*) and as you read each spec, update the wiki progressively. In the end we will have the wiki updated reflecting the current version updated."
>
> translate this into a spec well writen

## Notes

- Stack: `node-skills-package` / TypeScript-Node invariants apply to new `.cjs` helpers (CLI validation, path containment, no floating Promises).
- Integrity: hashed `ws-wiki` files change → `npm run generate-integrity` in the same ship PR (implementation, not a wiki page).
- Do not load `ws-run-benchmark` for this work.
- `{wikiDir}` token: `plans.wikiDir` or default `.agents/specs/wiki`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing `/ws-wiki sync [slug]` | Ongoing PR close still syncs one feature with per-diff review |
| Recursively sweeping `{plansDir}/**/step-00-*.spec.md` | Spec of record is top-level `{specsDir}`; plan copies duplicate and desync |
| Auto-committing wiki pages or `sweep.state.json` | Staging stays a later G2 / docs commit; checkpoint is scratch |
| Rewriting `0075` ACs or dropping per-sync gates | Sweep is an additive mode with an explicit gate exception |
| Using `list_pending_specs.cjs` as the queue | Pending-only lists omit shipped specs needed for overlay |
| Parallel DAG sweep | Ordering is the product: later `NNNN` must overwrite earlier rules |
| Generating wiki from `index.PRD` checkboxes alone | PRD is delivery status, not living rules; specs + current code are the evidence |
| Host-specific subagent IDs as the contract | Skill stays portable; standard `dispatch-agent` optional, not required |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Queue membership | Top-level `{specsDir}/*.spec.md` only | Matches spec-of-record layout; avoids wiki/plan copies | y |
| Sort | `NNNN` numeric then unprefixed alpha | Matches the operator prompt (`0001` … last `NNNN-*`) | y |
| Current vs spec | Code on disk wins | User asked for wiki reflecting the current version | y |
| Sweep approval | One start gate; auto-write per spec | Per-spec Apply/Cancel is unusable on large boards; `sync [slug]` keeps 0075 AC11 | y |
| Resume store | `{wikiDir}/sweep.state.json`, not committed | Survives session crash without `{plansDir}` | y |
| Auth / rate limits / tenancy | N/A because local filesystem skill, no network API | Stack HTTP/auth dimensions do not apply | y |
| Empty board | Success, processed 0 | Init-only repos should not fail sweep | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill text + `list_wiki_sweep_specs.cjs` + tests; no orch FSM rewrite | Diff vs `0075` files |
| Atomic criteria | AC1–AC18 binary | `test-wiki` / sweep tests + `validate_spec --mode=authoring` |
| Failure modes | Missing index, empty specs, ambiguous dual files, bad flags, path escape, start Cancel | Negative tests + skill STOP copy |
| Observation telemetry | Helper JSON queue; checkpoint fields; `validate_wiki.cjs --check` summary | stdout / `--json` |
| Open blockers | None; gray-area defaults recorded in companion | Companion `0076-ws-wiki-spec-sweep.context.md` |
| Stack: path traversal | Enumerator and writers resolve under `{specsDir}` / `{wikiDir}` only (same containment as `sync_wiki_index.cjs`) | Unit tests with `..` and absolute `--specs-dir` |
| Stack: CLI input | Unknown flags rejected; `--help` exits 0 and is never a filename | Unit tests |
| Stack: async | New helper stays sync `fs` or awaited Promises; no floating Promises | Code review of `.cjs` |
| Stack: auth / DTO / subscriptions | N/A because no HTTP API, no Angular | Skip with reason |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-wiki/scripts/list_wiki_sweep_specs.cjs --json --repo-root .` prints ordered `specs[]`.
- Sweep progress line per spec: `{index}/{total} {file}` then wiki paths written.
- `{wikiDir}/sweep.state.json` `lastFile` advances after each successful overlay.
- Final `validate_wiki.cjs --check` JSON `ok`, `validatedPages`, `errors`.
- `node test/test-wiki.js` (and sweep sibling if split) exit 0.

### Negative & Failing Test Scenarios

- Missing `index.wiki.md`: `/ws-wiki sweep` STOP; helper may still list specs, but the skill must not write feature pages.
- Dual spec-of-record (`foo.spec.md` and `0001-foo.spec.md`): helper `errors` includes that slug; `specs` omits both; sweep continues.
- `--specs-dir` resolving outside repo root: helper exit non-zero, no `readdir` of the escaped path.
- Unknown argv token / leftover `--help` as path: helper prints usage or `unknown argument`, exit 0 for `--help`, non-zero for other dash tokens (no `ENOENT` on `--help`).
- `--dry-run` after a partial checkpoint: no wiki file mtime/content change and no new checkpoint write.
- Start-gate Cancel: no `{domain}/{feature}.md` created by that sweep turn.
- Path-traversal feature slug from a malicious spec filename: writers reject; no write outside `{wikiDir}` (existing `isSafeSlug` / containment).
- Unauthenticated network calls: N/A because sweep does not call SCM HTTP; a regression that adds unauthenticated remote fetch for sweep is a failing case (must not ship).
