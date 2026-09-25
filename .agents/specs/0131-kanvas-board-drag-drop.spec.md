---
id: null
slug: kanvas-board-drag-drop
title: "Kanvas board phase 2 — drag-and-drop columns with status update on move"
source: local
specDate: 2026-09-25
---

# Specification — Kanvas board phase 2 — drag-and-drop columns with status update on move

## Description

Extend the packaged `ws-kanvas` board (spec `0130-kanvas-board.spec.md`) from a read-only lens to an interactive board: cards can be dragged from one column and dropped onto another, and the drop persists the move by updating the owning status signal so the next board recompute shows the card in its new column.

v1 deliberately forbade all of this (`0130` Out of Scope row 1: no drag-and-drop moves, status writes, or any mutation; server is `GET`-only, anything else → 405). This phase intentionally lifts that constraint for one narrowly scoped mutation surface while keeping every other v1 guarantee: loopback-only, Node 22 stdlib only, CommonJS, no new `package.json` dependencies, path tokens and flags only (no hardcoded consumer directories), per-request recompute with no cache or watcher.

How a move works:

1. The board page (`refs/board.html`) makes cards draggable (native HTML5 drag-and-drop, no new frontend dependency) with a visible drop-target highlight. A keyboard path (focus card → Move action in the popup → target-column select → confirm) performs the same operation for keyboard-only use.
2. On drop, the client calls a single new mutating endpoint, `POST /api/move`, with a JSON body `{ "slug": "<slug>", "toColumn": "<column-id>" }`, then re-fetches `GET /api/board` and re-renders. The server recompute stays the source of truth: the client never places the card optimistically.
3. The server validates the body against a schema (`slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$` and resolves inside the configured roots via the collector's containment helper; `toColumn` is one of `backlog|sprint|development|staging|production|abandoned`), re-derives the card's current column with the v1 collector, checks the transition table below, performs the owning-file write through the existing writer semantics (never a forked parser, never a hand-edit of workflow-owned residue), re-derives the card, and returns it. Every move appends one server log line (`slug`, `from→to`, writer used, result).
4. `POST /api/move` is the only mutating route. All other non-`GET` requests still return 405, and the v1 `GET /`, `GET /api/board`, `GET /api/card` contracts are unchanged.

Transition table (drop target → precondition → owning write; first match wins, same-column drop → `200` no-op with the unchanged card):

1. **backlog** — Precondition: no `{plansDir}/{slug}/` run directory exists. Write: remove the index track row for the slug when present (untrack). A run directory exists → `409` (the board never deletes runs).
2. **sprint** — Write: ensure the `index.PRD` row tracks the slug as `[ ]` todo (`ws-spec-index` track semantics). The board never creates run directories, so when no run directory exists the response carries a typed notice (`tracked — enters Sprint when a workflow run starts`) and the recomputed column may still read Backlog per the v1 rules until a run starts.
3. **development** — Precondition: a run directory and its plan state file exist. Write: flip plan status to `active` through the workflow state writer.
4. **staging** — Derived-only in this phase: there is no writable staging signal (staging means "ship record exists but index not yet `[x]`", and the board must not fabricate ship records). Every drop onto staging returns `409` with a named reason; see the companion for the deferred design.
5. **production** — Precondition: delivery evidence exists (a `step-08-*.result.md` ship record or a recorded delivery commit/PR URL). Write: mark the index row `[x]` with a Done-log row (`ws-spec-index` sync semantics). Without evidence → `409` (the board never forges provenance).
6. **abandoned** — Write: when a plan state file exists, flip its status to `cancelled`; otherwise append an Archive-table row using the outcome vocabulary the collector already parses (`cancelled`/`failed`/`dropped`/`superseded`).

Demotions that would rewrite shipped history (for example `production→development`, `staging→development`, un-marking `[x]`) return `409`. The only backwards moves in this phase are `→backlog` (runless specs) and `→abandoned` (cancel). Moves are atomic: all preconditions are checked before the first write, and a writer failure leaves the index, plan state, and spec tree byte-identical. Retrying a completed move is idempotent (`200` with the unchanged card).

Error bodies keep the v1 typed shape (`code`, `message`, no stack trace, no absolute filesystem path leak; repo-relative paths at most).

## Acceptance Criteria

- AC1: A card dragged from a source column and dropped onto a target column triggers `POST /api/move`; the board re-fetches `/api/board` and the card renders per the v1 column rules. Drop targets highlight during `dragover`. The keyboard path (popup Move action → target select → confirm) issues the same `POST` and ends on the same recomputed board.
- AC2: `POST /api/move` schema-validates `{slug, toColumn}`: malformed slug → `400` before any filesystem call; unknown slug → typed `404`; unknown `toColumn` → `400`; malformed JSON or wrong body types → `400`. No error body carries a stack trace or an absolute path.
- AC3: Reachable promotion writes persist: `→sprint` ensures the index `[ ]` row; `→development` flips plan status to `active`; `→backlog` removes the track row when runless. One fixture per target asserts the owning file plus the recomputed column.
- AC4: `→production` writes `[x]` plus a Done-log row only when delivery evidence exists; `→abandoned` flips plan status to `cancelled` or appends an Archive row. Fixtures assert both branches of the abandoned write.
- AC5: Illegal moves return `409` with a named reason and zero file writes, proven by hashing the index, plan state, and spec tree before and after: `→staging`, evidence-free `→production`, `→backlog` with a run directory, history-rewriting demotions; same-column drop is a `200` no-op.
- AC6: Moves are atomic and idempotent: a failure-injection run (writer throws mid-move) leaves the index, plan state, and spec tree byte-identical; replaying a completed move returns `200` with the unchanged card and performs no second write.
- AC7: The server stays loopback-only (`127.0.0.1`, `4173` / `KANVAS_PORT`), stdlib-only with zero new `package.json` dependencies, and CommonJS. v1 `GET` endpoints and popup behavior are unchanged. Every move appends one log line with slug, `from→to`, writer used, and result.
- AC8: The full move flow works keyboard-only (focus, Move action, target select, confirm, announced result) with no pointer required and no new frontend dependency.
- AC9: The feature ships inside the existing `ws-kanvas` skill tree (`SKILL.md` documents the new endpoint and the transition table; `server.cjs` + `board.html` updated; collector parsers reused, not forked), `npm run generate-integrity` + `npm run verify-integrity` pass, and an install test asserts the installed skill serves `POST /api/move` from the install tree against a fixture consumer tree with non-default `specsDir`/`plansDir`.
- AC10: Every index, state, and frontmatter read/write strips a leading BOM and normalizes CRLF to LF before parsing, and writes LF blobs, so board edits stay surgical on Windows checkouts.

## Original Issue Context

Free-text feature request (paraphrased; no consumer data involved):

> Phase 2 for kanvas board enhancements: implement drag'n drop columns. Update state of status on move.

### Prior Work Sweep

Source is `local`, so keyword + git-history sweep (no tracker id): repo-wide search for `drag|drop` across `.agents/specs/*.spec.md` returns zero spec hits (`drop` appears in `board.html` only as popup `backdrop` identifiers, which is unrelated); `git log --grep=drag/drop` shows no kanvas drag-and-drop work (only unrelated "drop ..." wording in old fixes); `git log --oneline -- .agents/skills/ws-kanvas/` shows the v1 skill landing plus nine review rounds and a BOM-tolerance fix, none touching drag-and-drop. No exact same-feature PR exists — proceed. Conventions to reuse (not to modify): the `ws-kanvas` collector parsers (slug regex, containment, index dialects from review rounds 1–9), `ws-spec-index` track/sync row semantics, and the workflow state writer.

### Design Intent

Modification of an intentional v1 constraint, not a bug fix: commit `4e13f401` introduced the board as a read-only lens on purpose, and `0130-kanvas-board.spec.md` Out of Scope row 1 explicitly defers "Drag-and-drop moves, status writes, or any mutation" to the skills that own those files. This phase deliberately promotes a narrow, enumerated subset of those writes (the transition table above) into the board while keeping run lifecycle, ship evidence, and shipped history with their owning writers. No `git log -S` intent archaeology beyond this applies; the board, collector, and page are otherwise unchanged in contract.

## Notes

- Single-source parsing: the move endpoint reuses the collector's slug regex, `resolveInside` containment, and index-dialect handling (checkbox form, staging guard, archive vocabulary from v1 review rounds) at the same revision. No forked parser.
- Owning writers only: index edits follow `ws-spec-index` track/sync row semantics; plan status flips go through the workflow state writer and never touch `{us-dir}/.runtime/` residue (fail-closed validation); the board never creates run directories, `step-08` results, delivery commits, or PRs.
- Refresh model: per-request recompute plus refetch-after-move (v1 manual refresh retained). No watcher, no cache, no optimistic placement.
- `commitPlanFilesOnlyAtStep8` invariant: board writes land in working-tree index/state files only; the board never commits.
- Board page stays dependency-free (native drag-and-drop + `fetch`); server stays stdlib-only (`node:http`, `node:fs`, `node:path`).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Entering Staging from the board | No writable staging signal exists; staging is derived from ship records the board must not fabricate (typed `409`, deferred design in companion) |
| Creating or deleting run directories, plans, `step-08` results, commits, or PRs | Run and ship lifecycle belongs to the workflow skills that own those artifacts |
| Demotions that rewrite shipped history (un-marking `[x]`, editing the Done log) | Done log is append-only provenance |
| Authentication, multi-user, or remote exposure | Loopback-local single-user developer tool; same posture as v1 |
| Positional ordering of cards within a column | Columns are sets; no order store exists |
| Live reload, watchers, trend charts, or burn-down metrics | Same as v1; refetch-after-move covers freshness |
| New npm runtime dependencies or a frontend build pipeline | Stdlib-only keeps install weight zero and `ws-check-harness` clean |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Port and bind posture | `4173` via `KANVAS_PORT`, `127.0.0.1` only, same as v1 | Unchanged local-tool posture; no new surface | y |
| Concurrent boards editing the same tree | Last-write-wins with per-request precondition recheck; the loser gets `409` when preconditions no longer hold | Stateless per-request model needs no locks for a single-user local tool | y |
| Index dialect drift | Implementation reuses the collector parsers at the same revision | One parser revision means the board and the move endpoint can never disagree | y |
| Abandoned outcome wording | Plan state `cancelled`; Archive row uses the collector vocabulary (`cancelled`/`failed`/`dropped`/`superseded`) | Matches what the collector already parses | y |
| Absent implicit-requirement dimensions (data lifecycle/TTL, external-dependency failure, rate limits, auth boundaries beyond loopback) | `N/A because` the board is a stateless loopback-local tool with no TTL data, no external dependencies, and a single user | No applicable surface; covered dimensions (input validation, partial-failure atomicity, idempotent retry, concurrency recheck, state-transition guards, observability) have ACs above | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `ws-kanvas` `SKILL.md` (endpoint + transition table) + `server.cjs` + `board.html` (+ one shared move helper as needed) + tests + regenerated integrity; no runtime changes to other skills | `git status --porcelain` shows only those paths |
| Atomic criteria | AC1–AC10 each map to one behavior plus its named fixture or test | Each AC traces to a test listed under Telemetry or Negative scenarios |
| Failure modes | `400`/`404`/`409`/`405` matrix exercised against the running server; writer-failure injection proves zero partial writes | Run the matrix plus the injection test |
| Stack invariants (typescript-node, as applicable to plain JS) | No floating promises; `POST` body schema-validated; slug-to-path reads containment-checked; sockets closed on shutdown | `scan_stack_invariants.cjs --stack typescript-node` + code review of the server diff |
| Observation telemetry | One log line per move; `/api/board` and `/api/move` shapes asserted; column counts visible per column header | Run server + test suite |
| Zero open blockers | Assumptions table has no blocking `n` row | Confirm table above |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `curl -X POST http://127.0.0.1:4173/api/move -H "Content-Type: application/json" -d '{"slug":"<known>","toColumn":"sprint"}'` returns `200` with the AC7-shaped card; `curl http://127.0.0.1:4173/api/board` then shows the recomputed column and per-column counts.
- New test file (e.g. `test/test-kanvas-drag-drop.js`) asserts one transition fixture per reachable target, the `409` matrix with tree-hash equality, atomicity under writer failure, idempotent retry, BOM/CRLF-safe index edits, and the error-body shape; `npm run test` stays green.
- `npm run verify-integrity` passes with the updated skill hashed; install test asserts the packed skill serves `POST /api/move` from the install tree against a fixture consumer tree with custom `specsDir`/`plansDir`.
- Manual pass: drag cards across columns plus a keyboard-only move, both ending on the refetched board with a visible result notice.

### Negative & Failing Test Scenarios

- Red: `POST {"slug":"../../package","toColumn":"production"}` reaches any `fs` call (must `400` on validation first).
- Red: `POST` with missing `toColumn`, wrong body types, or malformed JSON passes validation (must `400` via schema).
- Red: drop onto staging writes any file (must `409` with the named reason, tree identical).
- Red: `→production` without delivery evidence writes the index (must `409`, tree identical).
- Red: a writer throwing mid-move leaves a partial index or state edit (tree must be byte-identical).
- Red: `POST` for an unknown slug returns `500` or a stack trace (must be the typed `404`).
- Red: `PUT`/`DELETE` (or `POST` anywhere except `/api/move`) returns `2xx` or mutates state (only `POST /api/move` mutates; the rest `405`).
- Red: any error body leaks an absolute filesystem path (must be repo-relative or omitted).
- Red: `package.json` gains a runtime dependency for this feature, or the server binds a non-loopback address by default.
