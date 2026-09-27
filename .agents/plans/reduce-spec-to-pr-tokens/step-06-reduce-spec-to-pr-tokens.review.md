---
us: reduce-spec-to-pr-tokens
workflowId: reduce-spec-to-pr-tokens-20260927T043013Z
step: 6
slug: reduce-spec-to-pr-tokens
status: completed
score: 9
reviewedCommit: ffae2209e8d74093b3eb8bbfb20e15e491651804
base: main
startedAt: "2026-09-27T07:00:00Z"
endedAt: "2026-09-27T07:00:00Z"
acRefs: []
---
# Code Review — reduce-spec-to-pr-tokens (Step 6)

**Outcome first:** Clean. Docs-only refactor, no Critical or Warning findings. Two Suggestions/Infos, both non-blocking. Advance to Step 7.

**Scope:** Pinned commit `ffae2209` (12 files; see Scope note below). `git diff main...HEAD` on `develop` contains foreign workflow commits — findings are scoped to `ffae2209` only via `git show ffae2209 -- <path>`. Product-tree readonly: no edits made.

## Phase 1 — Triage hypotheses (adversarial)

| # | Hypothesis | Disposition |
|---|------------|-------------|
| H1 | Deleted/duplicated rules unreachable via pointers | Tested — 24/24 parity checks PASS, discarded as finding |
| H2 | Byte budgets exceeded or combined overflow | Tested — all 5 asserts PASS, discarded as finding |
| H3 | Test assertions weakened (removals) | Tested — diff is additive-only, discarded as finding |
| H4 | Version/integrity mismatch | Tested — 0.5.3 once, integrity verify exit 0, discarded as finding |
| H5 | Lite references STEP-DISPATCH step numbers | Tested — single intentional guard sentence, discarded (see Discards) |
| H6 | Blank-line sediment in STEP-DISPATCH | Retained as CR-001 (Suggestion) |

## Phase 2 — Adversarial discards

- **H5 discarded:** `.agents/skills/ws-spec-to-pr-lite/SKILL.md:13` mentions `STEP-DISPATCH.md` only to forbid its use for lite step numbers ("Do **not** use `STEP-DISPATCH.md` for lite step numbers"). This is the required isolation guard per plan T05, not a step-number reference. No alternative defense needed — the reference itself is the protection.
- **H1–H4 discarded:** each has positive proof below (pointer checks, budget rerun, additive diff, verify exit 0). No four-part exploit proof applies to a docs-only refactor with green gates; speculative Criticals deliberately not manufactured.

## Findings

### CR-001 [Suggestion] open .agents/skills/ws-spec-to-pr/STEP-DISPATCH.md:9-19

**Evidence:** The `### autoMode ≠ skip planning` pointer block is surrounded by ~8 blank lines (L9–L12, L14–L18) left over from table deletion.

**Why Suggestion (not Warning):** No parity or budget impact; purely cosmetic sediment of exactly the class AC4 targets.

**Suggested fix (size-neutral, saves ~8 B — safe under all budgets):**

```markdown
### autoMode ≠ skip planning

See `SKILL.md` § `autoMode != skip planning` — autoMode auto-selects index 0 and chains Steps 0→9 without skipping planning; honor classifier `runInterview` / `execMode` outputs.
```

Caller-owned fix loop decides; leaving as-is does not block Advance.

### INFO-001 Razor-thin budget headroom (no fix proposed)

LF-normalized rerun (this review): SKILL.md 10958/11776, STEP-DISPATCH.md 20113/24064, PROTOCOLS.md 20896/20992 (**96 B** headroom), lite SKILL.md 10206/10240 (**34 B** headroom), total 62173/67072. Any future prose in PROTOCOLS.md or lite SKILL.md must be pointer-only. CR-001's fix direction (delete blank lines) is the only safe edit class at these margins.

### INFO-002 Dispatch file-count mismatch (caller text, not product)

Dispatch prompt claims 13 files including `docs/wiki/delivery/spec-to-pr-pipeline.html`; `git show ffae2209 --stat` holds **12 files** and that wiki path has zero log entries (`git log main...HEAD -- <path>` empty). No product impact — future dispatches should list the 12 committed paths.

## Verification evidence (observed this review, exit codes)

- `node test/test-context-budget.js` → exit 0 (`test-context-budget: ok`)
- `node test/test-liveness-checkpoints.js` → exit 0 (incl. D1 autoMode chaining + pause fallback)
- `npm run verify-integrity` → exit 0 (`skill-integrity.json matches tree, v0.5.3`)
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` → exit 0, 0 issues
- `node .agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs --repo-root .` → exit 0 (`OK, 11 skills`)
- `git diff main...HEAD --check` → exit 0
- Pointer parity: 24/24 PASS (canonical autoMode table in SKILL.md; dispatch pointer-only with zero table rows; host/model/preview/state pointers resolve to `host-dispatch.md`/`tools.md`/`gates.md`; PROTOCOLS Steps 5/6/8/9 point at STEP-DISPATCH.md; lite points at `gates.md`/`tools.md`/`git-ownership.md`; `state.handoffs` retained in DISPATCH + PROTOCOLS + lite post-mutating sequence; D1-locked `turn-boundary`/`checkpoint`/`pause-turn` present in PROTOCOLS:203-215; `Chain host turns` + `Host-forced turn end` in SKILL.md:51/55; no `does not chain host turns` anywhere; FSM F0–F6 + Steps 0–9 + G2-code-after-Step-5 + observer pointer intact)
- Test diff: `git show ffae2209 -- test/test-context-budget.js` is **additive-only** (7 added lines: 4 per-file asserts + combined assert); zero assertion removals
- Version: 0.5.2 → 0.5.3 exactly once across `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `test/package.json` (+ site footer); `verify-integrity` confirms hash match
- Full `npm run test` 137/137 cited from Step 5 report (score 10/10); not re-run in this review (targeted gates re-run above, all exit 0)
- `localReviewCommand` is undefined in `.ws/config.json` — dry-run gate skipped per contract, no command invented

## Stack Invariant Compliance

Stack `node-skills-package` (Node 22, CommonJS `.cjs`, LF blobs, zero Python): docs-only markdown + one test-assertion file + T08 ship hygiene (version lines, regenerated `bin/skill-integrity.json`, site `docs/index.html` footer). Zero `.cjs`/`.js` logic edits in scope; `scan_stack_invariants.cjs` 0 issues; no new interpreters; `git diff --check` clean. Memory sweep: no MEMORY violations — `state.handoffs` phrase retained, no `ws-run-benchmark`/harness-benchmark loads, LF-normalized measurement used.

## Sibling sweep

Same defect class beyond the diff: blank-line sediment from table deletion is unique to STEP-DISPATCH.md L9–L19 (SKILL.md canonical table intact, PROTOCOLS pointers single-line, lite file compact). No sibling occurrences.

---
memory_consult: local `.ws/MEMORY.md` + `.ws/memory/` listing read (applied: CRLF LF-normalized checks, ship-verify-ordering respected, `state.handoffs` dedup-lock untouched); spec-memo vault skipped (memo CLI not on PATH).

Learning: N/A (read-only review; no new project knowledge; zero tool/test failures before pass).

**Next action (caller-owned):** Advance to Step 7 — optionally apply CR-001's blank-line collapse in the Step 6 fix loop (saves bytes, zero risk), then proceed.
