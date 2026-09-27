---
id: null
slug: kanvas-board
title: "Kanvas board — packaged local kanban visualizer for spec and workflow state"
source: local
specDate: 2026-09-24
---

# Specification — Kanvas board — packaged local kanban visualizer for spec and workflow state

## Description

Add a local, read-only kanban board that visualizes every spec of record under `{specsDir}` and its workflow state under `{plansDir}` in six columns: Backlog, Sprint, Development, Staging, Production, Abandoned. The feature ships as a first-class packaged skill, `ws-kanvas`, under `.agents/skills/ws-kanvas/` (`SKILL.md` + `scripts/` + board page asset), registered in `bin/skill-dependencies.json` and covered by the repo's skill integrity hashes, so the existing installer delivers it to consumers project-locally and globally like every other `ws-*` skill. A new `npm run kanvas` script dogfoods the packaged scripts in this repo; consumers launch the same code via `node {skillsRoot}/ws-kanvas/scripts/server.cjs` with `--specs-dir` / `--plans-dir` overrides resolved from their hub config. The server is loopback-only and built on the Node 22 standard library (no new npm dependencies); it renders a single self-contained board page backed by small CommonJS collector scripts that derive column placement from deterministic on-disk signals (spec frontmatter, `index.PRD` checkboxes, plan `*.state.md` status, `step-08-*.result.md` presence). Clicking a card opens a details popup (title, status, phase, acceptance-criteria summary, plan step, PR/commit evidence, file links). The board never mutates specs, plans, or the index — it is a read lens over the same sources `ws-spec-list` reads.

Column placement rules (first match wins, evaluated top-down):

1. **Abandoned** — plan state `status: cancelled` or `status: failed`, or the slug sits in the index Archive table with a dropped/superseded outcome.
2. **Production** — index Feature map / Next-specs row is `[x]` done (shipped per the E1 rule: delivery commit or PR URL recorded in the Done log).
3. **Staging** — a `step-08-*.result.md` ship record exists but the index row is not yet `[x]` (shipped, awaiting index sync / merge).
4. **Development** — a plan `*.state.md` exists with `status: active` (or `implemented`), regardless of current step.
5. **Sprint** — tracked in `index.PRD` as `[ ] todo` AND a `{plansDir}/{slug}/` run directory exists (committed to, not yet started), but none of the above apply.
6. **Backlog** — everything else: spec of record with no run directory and no done mark (specs not implemented).

## Acceptance Criteria

- AC1: `npm run kanvas` starts a local webserver on the loopback interface and serves a board page rendering all six columns (Backlog, Sprint, Development, Staging, Production, Abandoned) with one card per spec of record.
- AC2: Backlog contains exactly the specs not implemented: spec of record exists, no `{plansDir}/{slug}/` run directory, index row not `[x]`; verified by a collector fixture with a plan-less spec.
- AC3: Sprint, Development, Staging, Production, and Abandoned placement follows the first-match rules in Description; a fixture per column proves each rule (cancelled state → Abandoned, `[x]` + Done-log entry → Production, step-08 result without `[x]` → Staging, active state → Development, tracked-todo + run dir → Sprint).
- AC4: Clicking a card opens a popup showing title, column, index status, phase, AC count, plan step/status, PR or commit evidence when present, and repo-relative links to the spec file, plan directory, and index row; closing the popup returns to the board with no reload.
- AC5: Popup for an unknown or malformed slug renders a typed "not found" state (no stack trace, no raw filesystem path leak).
- AC6: Server binds loopback only by default, serves read-only `GET` endpoints only (no `POST`/`PUT`/`DELETE` routes), and adds zero new entries to `package.json` dependencies (Node 22 stdlib only).
- AC7: Collector output is a stable JSON shape (`slug`, `title`, `column`, `indexStatus`, `phase`, `acCount`, `planStep`, `planStatus`, `evidence`, `links`) covered by a snapshot test; board page consumes only that shape.
- AC8: Missing or unreadable `{specsDir}` / `{plansDir}` / `index.PRD` yields an empty board with a named warning banner, never a process crash.
- AC9: The feature is delivered as skill `ws-kanvas` (portable `SKILL.md`, `scripts/` collector + server, board page asset), listed in `bin/skill-dependencies.json`, and `npm run generate-integrity` + `npm run verify-integrity` pass with the new files hashed.
- AC10: `npm pack` output installs project-locally and globally via the existing installer flow, and the installed board serves from the installed skill path (covered by an install test asserting the skill files land and the server starts from the install tree).
- AC11: No hardcoded `.agents/specs`, `.agents/plans`, or repo-root assumptions in skill code; consumer custom `specsDir` / `plansDir` resolve from the consumer hub config or `--specs-dir` / `--plans-dir` flags, verified by launching the installed skill against a fixture consumer tree with non-default directories.

## Original Issue Context

Free-text feature request (paraphrased; no consumer data involved):

> Create a new spec for a new feature: canvas/kanban board spec visualizer and state. Make `npm run:kanvas` (kanban canvas) start a local webserver simple (use simple safe existing library) and a bunch of nodejs scripts to view columns: backlog (specs not implemented), sprint, development, staging, production, abandoned columns. Each card click shows a popup containing details.

### Prior Work Sweep

Source is `local`, so keyword + git-history sweep (no tracker id): repo-wide search for `kanban|kanvas|canvas board` under `.agents/skills`, `bin`, `test`, `docs` returns zero hits; `git log --grep=kanban -i` and `gh pr list --search kanban` return nothing; `git log --grep=board -i` hits are unrelated README/wiki progress-board docs. No exact same-feature PR exists — proceed. Related read-only viewers to reuse conventions from (not to modify): `ws-spec-list` (dual-board row model), `ws-monitor` snapshot scripts (state parsing), `ws-show-harness`.

### Design Intent

Greenfield: the server, collector scripts, and board page are new files, so no `git log -S` intent archaeology applies. Column semantics are defined fresh in Description; where the board reads existing writers' output (state files, step-08 results, index marks) it must match their current on-disk contracts, verified by fixtures at implementation time.

## Notes

- Packaged layout (normative paths): `.agents/skills/ws-kanvas/SKILL.md` (portable skill contract: launch, endpoints, column rules), `.agents/skills/ws-kanvas/scripts/collect.cjs` (board JSON builder), `.agents/skills/ws-kanvas/scripts/server.cjs` (`node:http` + `node:fs`, serves page + `/api/board` + `/api/card?slug=`), `.agents/skills/ws-kanvas/refs/board.html` (self-contained page, no frontend build step). All scripts CommonJS so they run under the repo's `"type": "module"` root without a loader flag.
- `npm run kanvas` = `node .agents/skills/ws-kanvas/scripts/server.cjs` (dogfood entry; consumer entry is `node {skillsRoot}/ws-kanvas/scripts/server.cjs` from the installed tree).
- Ship-scope file changes: new skill tree + `package.json` (`kanvas` script), `bin/skill-dependencies.json` entry, `CATALOG.md` row + task-router entry, regenerated integrity data, and the installer/install-test coverage for the new skill. `package.json` `files` already includes `.agents/skills/` — verify at implementation that no allowlist change is needed for the pack to contain the skill.
- Port default `4173` with `KANVAS_PORT` override; print the URL on start. Bind `127.0.0.1` only — no `0.0.0.0` flag unless a later spec explicitly asks.
- Card identity is the spec `slug`; slugs arriving over HTTP are validated against `^[a-z0-9]+(-[a-z0-9]+)*$` and resolved with directory-containment checks before any filesystem read (typescript-node invariant 4).
- Refresh model: recompute per request (no cache, no watcher); a manual refresh button suffices for v1.
- The other session's `0129-pre-ship-doc-sync` spec exists in the same directory; the collector must not assume filename numbering is gap-free.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Drag-and-drop moves, status writes, or any mutation of specs/plans/index | Read-only lens v1; writes belong to the workflow skills that own those files |
| Authentication, multi-user, or remote exposure | Loopback-local developer tool; no auth surface by design |
| New npm runtime dependencies or a frontend build pipeline | Stdlib-only keeps install weight zero and `ws-check-harness` clean |
| Historical trend charts or burn-down metrics | No time-series store exists; out of v1 scope |
| Replacing `ws-spec-list` / `ws-monitor` CLIs | The board complements them; CLIs stay the scriptable surface |
| Host-specific adapters or marketplace manifests for the board | The portable `ws-kanvas` skill contract only; host pointers stay out per harness neutrality |
| Publishing the board as a standalone npm package | Ships inside this package's skill tree and installer; no separate publishable artifact |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Server port | `4173`, override via `KANVAS_PORT` | Unused high port; env override is the repo's config convention | y |
| Sprint membership rule | Tracked `[ ] todo` + run dir exists (see companion for the label-based alternative) | Deterministic from on-disk signals, no new metadata to maintain | y |
| Popup content source | Frontmatter + index row + plan state, fetched live per open | Same sources as the board; no duplication | y |
| Board auto-refresh | Manual refresh button only | Per-request recompute keeps v1 stateless; see companion | y |
| Skill id and installer mechanics | `ws-kanvas`, shipped through the existing skill package/install/integrity machinery (no new installer) | Consumer installability rides the same path as every `ws-*` skill | y |
| `package.json` files allowlist | No change expected (`.agents/skills/` already packed); verify with `npm pack --dry-run` at implementation | Assumption to confirm, not a design fork | n |
| Auth, TLS, CORS, CSP edge cases | `N/A because` loopback-only, same-origin, static page with no inline secrets | Implicit-requirement dimensions with no applicable surface collapse to this row | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | New skill tree `.agents/skills/ws-kanvas/` + `kanvas` npm script + `skill-dependencies.json` entry + `CATALOG.md` row + regenerated integrity + install-test coverage; no edits to other skills except the dependency-graph registration | `git status --porcelain` shows only those paths |
| Atomic criteria | AC1–AC8 each map to one behavior plus its named fixture/test | Each AC traces to a test listed under Negative scenarios or Telemetry |
| Failure modes | Unknown slug → typed not-found; missing inputs → warning banner; non-GET → 405; traversal slug → 400 | Exercise each against the running server |
| Stack invariants (typescript-node, as applicable to plain JS) | No floating promises; query/body input validated; slug→path reads containment-checked; sockets closed on shutdown | `scan_stack_invariants.cjs --stack typescript-node` + code review of server diff |
| Observation telemetry | Startup URL logged; `/api/board` and `/api/card` shapes asserted by snapshot test; column counts visible per column header | Run server + test suite |
| Zero open blockers | Assumptions table has no blocking `n` row | Confirm table above |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `npm run kanvas` logs the bound URL; `curl http://127.0.0.1:4173/api/board` returns all six columns with per-column counts.
- `curl "http://127.0.0.1:4173/api/card?slug=<known>"` returns the AC7 JSON shape; unknown slug returns typed not-found JSON.
- New test file (e.g. `test/test-kanvas-board.js`) asserts column fixtures, popup payload, and the AC7 snapshot; `npm run tests` stays green.
- `npm run verify-integrity` passes with the skill hashed; install test asserts the packed skill lands project-locally and globally and serves from the install tree.
- Installed skill launched against a fixture consumer tree with non-default `specsDir`/`plansDir` renders the board from those directories.

### Negative & Failing Test Scenarios

- Red: spec with no run dir and no done mark lands anywhere except Backlog.
- Red: cancelled/failed plan state renders outside Abandoned.
- Red: `/api/card?slug=../../package` reads outside the specs tree (must 400 before any `fs` call).
- Red: `/api/card?slug=no-such-spec` returns 500 or stack trace (must be typed not-found).
- Red: `POST /api/board` mutates state or returns 2xx (no mutating routes exist).
- Red: `package.json` gains a runtime dependency for this feature.
- Red: server binds a non-loopback address by default.
- Red: `ws-kanvas` missing from `bin/skill-dependencies.json` or `verify-integrity` fails after adding the skill.
- Red: installed skill renders empty against a fixture consumer tree with custom `specsDir`/`plansDir` (hardcoded upstream paths).
- Red: `npm pack --dry-run` omits the skill tree (allowlist gap).
