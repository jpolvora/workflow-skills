---
superseded: true
supersededBy: step-02-us-353.plan.refined.md
slug: us-353
title: Harden Step 9 goal-fix loop against batch-handoff wedge and preview-only no-op
status: completed
step: 1
workflowId: us-353-20260919T043606Z
startedAt: "2026-09-19T05:05:00.000Z"
endedAt: "2026-09-19T05:37:44.502Z"
acRefs: []
---
## 0. Summary & Business Rules

Harden the `ws-goal-fix-pr` session-owns-loop contract and the shared VerboseMode dispatch wording against the two failure modes observed on PR #350 (issue #353): (a) loop session wedged after batch-worker-result delivery with no follow-up model turn, and (b) resume loop preview-only no-op. Business rules: host runtime scheduler is external and unchanged; loop ownership stays session-owns-loop (us-347 design intent); all changes are skill-doc prose plus contract-locking tests; en-us, portable, no host product names, no hardcoded consumer paths.

Security mitigations: none (docs-only surface); typescript-node invariants apply to touched test/script code (no floating promises, validated inputs, contained paths).

## 1. Definition of Ready & Scope

Resolved assumptions from spec: payload bound enforced by contract prose + tests; watchdog thresholds documentary; typescript-node pack applies; absent implicit dimensions collapsed to `N/A because` row in spec.

ACs (from `.agents/plans/us-353/step-00-us-353.spec.md`):

- AC1: VerboseMode continuation mandate in `PROTOCOLS.md` Base Prompt Prefix addendum + `STEP-DISPATCH.md` verbose-preview section.
- AC2: Loop liveness watchdog documented in `ws-goal-fix-pr` (detection signals, checks, resume-takeover procedure incl. do-not-ping rule).
- AC3: `update_state dispatch` examples on the loop path show the state-path form only.
- AC4: Batch-worker result payload bound in dispatch contract (summary + artifact pointers; full transcript stays in artifacts).
- AC5: Contract wordings locked by tests; `npm run test` passes.
- AC6: Authoring validation passes; docs stay en-us/portable.

Out of scope: host scheduler fixes, loop-ownership redesign, site/installer/config-schema changes, version bump.

## 2. Technical Design & Architecture

Layer edits (config.json layers: skills-sot, installer-cli, tests):

- Skills-sot docs (prose only, no behavior code):
  - `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` § Base Prompt Prefix → VerboseMode addendum: append exact mandate "then immediately continue with tool calls in the same response; never end the turn after the preview" (AC1). Current text already forbids stopping after preview (line 327); strengthen to the issue's verbatim mandate so contract tests can match it.
  - `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` § Verbose preview (lines 30–41): add the same continuation mandate for the orch-owned path (AC1). Keep the pointer to the PROTOCOLS addendum for the dispatch-agent path.
  - `.agents/skills/ws-goal-fix-pr/SKILL.md`: new `## Loop liveness watchdog` section (AC2) + bounded-handoff wording in `## Round-batch dispatch` (AC4) + state-path `update_state dispatch` example fix (AC3). Restate each changed ownership line in ALL sections that state it (Steps, Round-batch dispatch, Subagent contract) per memory trap `2026-09-18-restated-ownership-whole-file-sweep`.
- Tests layer:
  - `test/test-goal-fix-pr-orchestrator-dispatch.js`: extend with same-batch assertions for watchdog section, state-path example, payload-bound wording, and the no-ping-mid-batch rule (AC5 + carve-out trap `2026-09-18-carveout-needs-same-batch-assertions`).
  - Locate the test locking PROTOCOLS/STEP-DISPATCH verbose wording (candidate: worker-turn-guard or dispatch-provenance tests) and extend with the continuation-mandate match; if none exists, add assertions to the goal-fix-pr dispatch test file reading those two files (keeps one test file owning all AC1–AC4 contract locks).
- Invariant checks (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` — no plan-dir commits until Step 8; product commits path-scoped `files_touched` only.

Fable domain check: `config.json.fable.enabled` true + `autoDetectDomain` true, but no IaC/K8s/migration signals in this docs-only change → skip `ws-fable-domain` adapters (no domain binding).

Design intent (from spec § Design Intent): session-owns-loop is intentional (us-347 `7440d018`); wedge was host-runtime failure. No behavior reversal.

## 3. Step-by-Step Plan

1. Re-read target regions: `ws-goal-fix-pr/SKILL.md` §§ Steps/Round-batch dispatch/Subagent contract, `PROTOCOLS.md` §§ Base Prompt Prefix + VerboseMode addendum, `STEP-DISPATCH.md` verbose-preview block, `test-goal-fix-pr-orchestrator-dispatch.js` head/tail structure. Locate `update_state dispatch` bare-id example on the loop path (grep `ws-goal-loop/TEMPLATES.md`, `host-dispatch.md`, `state-hygiene.md`); record exact file+line or record absence.
2. AC1: edit PROTOCOLS.md addendum + STEP-DISPATCH.md verbose block with the verbatim continuation mandate. Engineering check: `grep` both files for the mandate sentence.
3. AC2: add `## Loop liveness watchdog` to `ws-goal-fix-pr/SKILL.md` after `## Goal contract guards`: signals (round-log freshness under `{reviewsDir}/PR-<N>-round-*.md`, session-log mtime silence after worker-result delivery), checks (fresh `list-threads` + `check-pr-status` per round), resume-takeover procedure (fresh loop dispatch with handoff brief → fallback parent-driven inline batches, one fresh worker per batch, per-batch audit + telemetry, merge on `activeThreads == 0` + green checks; do NOT ping a fix worker mid-batch). Restate the takeover ownership in Subagent contract bullets.
4. AC3: fix bare workflow-id `update_state dispatch` example(s) to the state-path form (`{plansDir}/{slug}/{workflow-id}.state.md`); add a grep-locked assertion. If no bare-id example exists on the loop path, add the state-path example to the watchdog section (self-correction note becomes preventive guidance) and assert its presence.
5. AC4: extend `## Round-batch dispatch` fresh-worker bullet + worker-scope ownership bullet: worker writes full output to the round artifact (`{reviewsDir}/PR-<N>-round-*.md`) and returns summary + artifact pointers only (no full transcripts in the delivered result). Mirror one line in Subagent contract (restated-ownership rule).
6. AC5: extend `test-goal-fix-pr-orchestrator-dispatch.js` with assertions for AC1 (mandate in both dispatch files), AC2 (watchdog headings + no-ping rule), AC3 (state-path form, no bare-id dispatch on loop path), AC4 (summary + pointers wording). Run the single test file, then `npm run test` full.
7. AC6: run authoring validation on the spec (already PASS; re-run after any spec touch), `scan_stack_invariants.cjs --stack typescript-node` on touched scripts, verify en-us/portability (no product names, no absolute paths) in changed docs.
8. Defect-class sibling sweep (repo-wide): grep all `ws-*` skills for other `update_state dispatch` bare-id examples and other verbose-preview blocks missing the mandate; fix in place or record skips with reason.

Each step writes only its assigned files; no product-code behavior changes; no commits until Step 5 G2.

## 4. Permissions, Tenancy & i18n

RBAC/permissions: N/A because docs-only change with no endpoints, roles, or tenant data. Tenant isolation: N/A because no data layer touched. i18n: N/A because skill bodies are en-us by harness contract (no locale strings).

## 5. Test Coverage

- AC1 → extended contract test: `PROTOCOLS.md` addendum and `STEP-DISPATCH.md` verbose block match `/then immediately continue with tool calls in the same response; never end the turn after the preview/i` (red before, green after).
- AC2 → contract test: `ws-goal-fix-pr/SKILL.md` matches `/Loop liveness watchdog/`, `/round-log freshness|session-log mtime/i`, `/resume-takeover|resume.*takeover/i`, and `/do not ping a fix worker mid-batch|never ping.*mid-batch/i`.
- AC3 → contract test: loop-path `update_state dispatch` examples match state-path form (`{workflow-id}.state.md` / `{plansDir}/{slug}/`); assert no bare `dispatch <workflow-id>` without a path on the loop path.
- AC4 → contract test: dispatch contract matches `/summar.*\+.*artifact pointer|summary.*artifact pointer/i` and round-artifact path `{reviewsDir}/PR-<N>-round-`.
- AC5 → `npm run test` exit 0 (full suite, not just the extended file).
- AC6 → `validate_spec.cjs --mode=authoring` exit 0 + invariant scan exit 0 + portability grep clean.
- Sabotage verification: `run_sabotage.py` is unset for this docs-only change; sabotage equivalent = temporarily strip the mandate sentence and confirm the extended test fails (red/green proof), then restore. Record in Step 5 report.

## 6. Stack & Security Invariants Verification Plan

Stack `node-skills-package` → `typescript-node.md` rule pack; touched framework boundaries:

- Authorization & endpoint protection: N/A because no endpoints, providers, or auth code touched (docs + test assertions only).
- Concurrency & async safety: test-file edits must not introduce floating promises — every async helper awaited or returned; verify via `scan_stack_invariants.cjs --stack typescript-node` exit 0 and full `npm run test` green.
- Input validation & DTO boundary: N/A because no CLI/file-input boundaries changed; test regexes operate on repo files read via explicit relative paths (path containment preserved — no new dynamic path joins).
- Subscription & lifecycle cleanup: N/A because no streams, listeners, or sessions created; no temp files left behind (remove any red/green-proof scratch).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot docs + tests only).
- [ ] Domain entities and mappings encapsulated (N/A — no domain code).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — no auth surface).
- [ ] Stack & security invariants verified (scan exit 0, §6 boundaries addressed).
- [ ] i18n keys declared (N/A — en-us skill bodies).
- [ ] Test cases cover all ACs (§5 mapping complete).

## 8. Open Questions

- None blocking. Advisory: if the sibling sweep (§3 step 8) finds bare-id dispatch examples in `ws-goal-loop/TEMPLATES.md` or `host-dispatch.md`, fixing them in this run expands the diff beyond `ws-goal-fix-pr` + `ws-spec-to-pr`; the interview may bound the sweep to those two trees plus test file only, recording other hits as skips.
