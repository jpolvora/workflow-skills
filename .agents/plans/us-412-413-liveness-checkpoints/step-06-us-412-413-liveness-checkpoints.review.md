---
step: 6
slug: us-412-413-liveness-checkpoints
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
status: completed
startedAt: "2026-09-24T06:43:12Z"
endedAt: "2026-09-24T06:57:16.203Z"
acRefs: []
base: 4fcc0f99
snapshot: git diff 4fcc0f99..ad134fce (workflow product commit ad134fce)
---
# Code review — us-412-413-liveness-checkpoints (Step 6)

- **Base / snapshot:** `git diff 4fcc0f99..ad134fce` — the workflow product commit `ad134fce` only. The raw `main...HEAD` range also carries the pre-existing `4fcc0f99` changelog/memory commit; excluded from findings per triage.
- **Stack / rule pack:** `typescript-node`; `localReviewCommand` is empty in `.ws/config.json:L243`, so no local reviewer dry-run was executed (gate not configured — not a defect).
- **Verdict:** clean — **0 Critical, 0 Warning**. 2 Suggestions (both carry-over, non-blocking) + 3 Info notes. Advance approved.

## Evidence (observed, not inferred)

- **Pre-fix red proof (NS coverage).** Materialized baseline `4fcc0f99` via `git archive` into a temp tree (no `.git` mutation), copied both new suites in, ran them:
  - `test/test-liveness-checkpoints.js` → exit 1 at T1 (`ERROR: operation must be dispatch, finish, finish-batch, or bypass`, test:102) — the new ops do not exist pre-fix.
  - `test/test-ws-monitor-liveness.js` → exit 1 at M1 (`correlated session must be read despite the flood (filesScanned=0)`, test:114) — exactly NS1's documented pre-fix shape.
  - M2/M9 are red by construction: baseline stores `tail: text.slice(-8000)` while filtering on the 256 KB window (`monitor_snapshot.cjs` pre-fix), and the single global 200-file budget lets the 210-file flood root exhaust discovery.
- **Post-fix green (re-run at `ad134fce`):** `node test/test-liveness-checkpoints.js` exit 0 (T1–T9, D1–D2); `node test/test-ws-monitor-liveness.js` exit 0 (M1–M9); `npm run verify-integrity` exit 0 (`bin/skill-integrity.json matches tree (v0.4.65)`); `node test/test-runtime-portability.js` exit 0; `scan_stack_invariants.cjs` over the touched scripts exit 0, 0 violations; `validate_state.cjs <state> --pre-advance 6` exit 0.
- **Op contract spot-checks (`workflow_state.cjs`):** fail-closed validation runs before any mutation (`:1525-L1528`); `stepCheckpoints` is a new step-keyed map — no legacy `checkpoints[]` field exists in `workflow-state.schema.json` (the `checkpoints[]` in `PROTOCOLS.md` is the git-tag mirror, a distinct concept); revision +1 and exactly one telemetry event per op (`:1823-L1857`, append at `:1934-L1936`); `finish` clears only non-internal finishes (`:1661-L1669`) and repeated finish replays byte-stably (T9); `dispatch` never writes/clears markers (T9); `pause-turn` `nextAction` derivation (`:1220-L1234`); dual-write + plans-index refresh on both ops (`:1920`, `:1937-L1938`) — T1 asserts the row hash.
- **Monitor contract spot-checks:** correlated-path root ranking (`monitor_snapshot.cjs:1093-L1101`), per-root slice reservation with honest `capped` (`:1177-L1194`), one sanitized window for filter/store/resolve (`:1207-L1229` + `:1361-L1379`), `scan-capped` only for zero candidates in a capped scan (`:1365-L1369`), stall reachability (`:1574-L1585`), `turnPause` suppression (`:1564-L1573`), pre-scan `--until-terminal` guards (`:1731-L1740`).
- **MEMORY sweep:** `.ws/MEMORY.md` entries reviewed against the diff — `2026-09-24 ws-monitor liveness tests` (discovery flag / scoped absence assertions) and `2026-09-22 Post-Step-5 product edits invalidate integrity` (integrity regen + ledger re-score after any Step 6 fix) both currently satisfied; no confirmed violations.
- **Intra-root enumeration repro (live):** one merged root with 301 candidates where the correlated file sorts last → `listTranscriptCandidates(root, 200)` returns 201 without the target; `scanTranscriptRoots` → `filesScanned: 0, capped: true`; `resolveTranscriptSource` → `scan-capped`. Related bound: 251 roots → the last roots get no slice (`remaining <= 0`) → same honest `scan-capped`.
- **`compactOutputs` repro (live):** an existing `## Step outputs (compact)` section is never updated because the heading's parentheses are unescaped in the RegExp; the live state.md shows `- Step 0: pending` after Steps 0–5 finished. Pre-existing, untouched by this diff (IN-002).

## Findings

### CR-001 [Suggestion] open .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs:L1139-L1192

`listTranscriptCandidates` stops enumeration at `slice + 1` **name-sorted** candidates, so the correlation-first ordering at `:1186-L1192` can only reorder what was already enumerated: a path-correlated file beyond that stop is never collected (refined-plan §2.3 bullet 3 partially defeated). Adjudication of the carry-over `intra-root-enumeration-stop` (step-05): **Suggestion, not Warning** — AC10/AC11 as written are root-centric and their binding fixtures (M1/M9) pass; the failure degrades to the documented, honest `scan-capped` (never a false `available`); reachability is a single/merged root (e.g. `--transcript-root <parent store>`) with more candidates than its slice where the target sorts late.

- Proof: read evidence `monitor_snapshot.cjs:L1142,L1151` (stop at `> slice`) and `:1185-L1192`; failure scenario reproduced live (301-file merged root → `filesScanned: 0`, `scan-capped`); missing protection: no correlation input to enumeration; discards: root ranking only helps when the root *path* contains the key — session dirs named by session id are not path-correlated.
- Score: 9/10 (bounded edge, honest degradation, non-blocking).
- Sibling occurrences: the >200-root budget ceiling shares the same honest `capped` degradation (`:1180-L1183`); no other occurrence and no false-positive claim.
- Suggestion: pass the correlation keys into `listTranscriptCandidates` and prioritize correlated-path entries during enumeration (bounded pre-pass per root), keeping the `slice + 1` truncation detection; alternatively qualify `ws-monitor/SKILL.md:L117` (“Correlated-path entries are collected first within a root”) to “within the enumerated candidate window”. Do not block this workflow.

### CR-002 [Suggestion] open package.json:L3

Carry-over `release-bump-deferred`: `package.json` `version` is `0.4.65`, equal to the merge-base; `bin/skill-dependencies.json` `packageVersion` and the site footer are aligned at `0.4.65`. Release obligation (plan §3.9 item 2 / Step 8 pre-ship board row 1) not yet applied. Not an AC19 content defect.

- Score: n/a (ship-scope obligation).
- Suggestion: before push/PR run `npm run build-site:bump` once (package + `packageVersion` + site footer strictly above merge-base), rebuild `docs/index.html`, then `npm run generate-integrity` + `npm run verify-integrity` after the last product edit.

## Notes (informational, not gated findings)

- **IN-001** `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs:L125` (and `refresh_baseline.cjs:L171`)

Pre-existing (file last touched 2026-09-20; not in this diff): the G2-code commit appends `state.commits` and dual-writes state without `refreshPlansIndexForState`, so `plans index stateSha256` is stale until the next state write and `validate_state.cjs` reports `plans index state hash mismatch` (plain and `--pre-advance`) — observed live as the pre-advance-6 mismatch in this run, self-healed at the Step 6 dispatch. The new `checkpoint`/`pause-turn` ops do refresh the index (`:1920`), so they do not worsen it. Follow-up candidate: call `refreshPlansIndexForState(context, state, { stateFile })` after `syncStateDualWrite` in `commit_g2_code.cjs` (as `observer.cjs:L165-L168` and `step_coordinator.cjs:L534-L535` already do). Out of review scope; no action this workflow.

- **IN-002** `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:L1045`

Pre-existing (identical at `4fcc0f99`): `compactOutputs` builds its RegExp from the raw heading `## Step outputs (compact)`, whose parentheses are unescaped, so the pattern requires the literal text `## Step outputs compact` and never matches an existing section — `body.replace` is a no-op and `## Step outputs (compact)` freezes (live state.md shows only `- Step 0: pending` after Steps 0–5). `build_dispatch_context.cjs:235` reads that section for step context (JSON `state.handoffs` remains the primary source, so impact is limited). Follow-up candidate: escape the heading (`heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) or match with `indexOf`/slice. Out of review scope; no action this workflow.

- **IN-003** `test/test-ws-monitor-liveness.js:L71-L75`

The new monitor suite reuses the existing `muse` adapter fixture pattern already present in `test/test-ws-monitor-us356.js`; no host product name was introduced into skill prose, scripts, or contracts by this diff (adapter data pre-exists in `ws-monitor/SKILL.md` and `references/host-adapters.md`). `test-runtime-portability.js` exit 0. No action.

## Stack Invariant Compliance

`scan_stack_invariants.cjs` (stack `typescript-node`) exit 0, 0 violations. Plan §6 boundaries:

| Boundary | Verdict |
|---|---|
| State-writer integrity | Verified: revision +1 exactly once per op; dual-write + plans-index refresh (T1/T2/T5/T9); `syncAcCountsFromLedger` intentionally skipped for additive ops (`:1536-L1538`, `:1868`) |
| Schema / input validation (DTO) | Verified: fail-closed parse before mutation, byte-identical state on 9 malformed cases (T6/T8), `validateSnapshot` record checks (T7/NS6), telemetry `additionalProperties: false` |
| Concurrency / async safety | No new async primitives; watch loop bounded by `--iterations` xor `--until-terminal` (M6/M7) |
| Observer read-only / lifecycle | No writes outside the observer report path; discovery opt-in; `worker-session-paused` (info) replaces the stall under a pause marker (M5) |
| Privacy of retained windows | Sanitize-before-correlate; single sanitized window stored; tails deleted before serialization (`:1588`) |
| Portability / agent-agnostic | `test-runtime-portability.js` green; no new host coupling (IN-003) |
| Consumer-data isolation | Product diff excludes `.ws/config.json` / `STACK.md`; integrity manifest regenerated and verified |

## Apply fixes?

No. 0 Critical/Warning; both Suggestions are carry-overs (one bounded edge with honest degradation, one Step 8 ship-board obligation). Optional single fix pass on CR-001 if desired; otherwise advance to Step 7. **If any Step 6 fix touches hashed skill content, regenerate integrity and re-score the ledger (MEMORY 2026-09-22) before the next pre-advance.**
