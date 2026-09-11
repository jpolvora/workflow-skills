---
slug: us-310
title: Code review — repeated file-list flags accumulation
status: completed
step: 6
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:40:00.000Z"
acRefs: []
---
## Code review (committed diff `main...HEAD`, G2 ba9935d6)

Scope: 61 files — 1 runtime fix (`workflow_state.cjs`), 1 new regression suite, version-sync files (`package.json` 0.4.15→0.4.16, 54 SKILL.md frontmatters, `skill-dependencies.json` ×2, `test/package.json`, `docs/index.html`, `bin/skill-integrity.json`), `tests:harness-efficiency` wiring.

### Verdict: clean — no Critical / Warning (fix → re-review loop not entered, round 0/3)

Adversarial pass (challenge the fix, then answer):
- A1: Does accumulation leak to scalar flags? No — allowlist gate `FILE_LIST_FLAGS.has(key)` with closed `Set` of 3 post-normalization keys; scalar branch byte-identical to before (`else options[key] = value`). T7 unit + CLI proof.
- A2: Does single-use shape change break `options.* !== undefined` precedence in `normalizeFilesTouched`? No — first occurrence stores the raw value verbatim; array conversion happens only on repeat. T4 green before and after.
- A3: Trailing flag with missing value (`--modified` last)? Pre-existing shape (`undefined` stored, `listArg` filters); accumulation branch requires `!== undefined`, so a lone trailing flag behaves exactly as before. No new crash path.
- A4: Mutation via `Array.push` on `options[key]`? Single-threaded synchronous parse; the array is fresh per `parseArgs` call. No shared-state hazard.
- A5: camelCase drift (`--dry-run` style keys)? File-list keys contain no dashes; normalization is identity for them. Exported `FILE_LIST_FLAGS` lets tests pin the allowlist (T7 does).
- A6: Normalizer/dedup/containment bypass? No — values still flow through `normalizeFileList` → `listArg` → `toRepoRelative`; `Set` dedup untouched (T6).
- A7: Second file-list parse path? Swept: only `normalizeFilesTouched` reads the three options; per-script `parseArgs` twins are independent local parsers; `update_state.py` is a frozen exec-delegate. Single fix site.
- A8: Release hygiene? Version strictly above merge-base (0.4.16 > 0.4.15); `verify-integrity` exit 0; benchmark timestamp side effects restored; tarball removed; no `{plansDir}`/foreign files in G2.

Stack rule pack (`typescript-node`): boundary validation preserved (closed allowlist + existing normalizer), no floating promises (sync-only), path handling via existing `toRepoRelative`, `scan_stack_invariants.cjs` exit 0 (0 issues).

Checks: `npm run test` exit 0 on committed tree (targeted suite re-ran green after the ledger-anchor comment); sabotage `test-failed-as-expected` + restored; mechanical harness gates (`check_duplicates`, `check_pipeline_handoff`, `check_shell_quoting`, `measure_harness`) all OK; ledger score 10/10 with all negatives covered.

### Findings

None. No fix commit required; product tree clean at review time.
