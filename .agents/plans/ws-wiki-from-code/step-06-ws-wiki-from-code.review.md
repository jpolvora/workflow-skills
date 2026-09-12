---
step: 6
slug: ws-wiki-from-code
workflowId: ws-wiki-from-code-20260912T171926Z
status: completed
startedAt: "2026-09-12T17:19:26Z"
endedAt: "2026-09-12T17:28:12.689Z"
acRefs: []
---
# Code Review — ws-wiki-from-code (Step 6, round 1)

Base: `main` · HEAD: `013431e4` (`feat(ws-wiki): add from-code genesis and progressive-disclosure companions`) · Date: 2026-09-12
Scope (G2 product commit only): 12 files — new companions (`INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md`), new `scripts/list_wiki_from_code_areas.cjs`, refactored `SKILL.md` router, `CATALOG.md` + runtime `CATALOG.md` rows, expanded `test/test-wiki.js` (+735/−176 lines in commit stat).

No feedback

## Phase 1 — Triage (adversarial scan, hypotheses discarded)

- H1 (path traversal via config paths or `--repo-root`): candidate RCE/traversal. Discarded — `assertContained` in `list_wiki_from_code_areas.cjs:L61-L68` gates every collected path; escape probe in Test 21 exits 0 with no escaped paths collected (`NS2`).
- H2 (unknown-flag / positional injection): candidate CLI-injection. Discarded — `parseArgs` rejects non-`--` tokens and unknown flags with exit 2 before tree walk (`L40-L47`, Test 21 `NS3`/`AC7`).
- H3 (floating promises in new helper): candidate concurrency defect. Discarded — helper is sync `fs` only; no `async`/`await`/`Promise`; stack scan 0 issues.
- H4 (host/IDE coupling): candidate portability defect. Discarded — Test 19 host-pattern grep over SKILL, all companions, and scripts passes; `askQuestion` alias in `PHASE-3-APPLY.md` is spec-allowed per AC17.
- H5 (behavior drift from companion split): candidate regression. Discarded — sweep/verify/apply/sync prose moved verbatim to companions; `test/test-wiki.js` Tests 16–21 assert router strings, companion presence, and from-code helper contract; all pass. AC4 preserved.
- H6 (new packaged skill `ws-wiki-from-code`): candidate scope violation. Discarded — no folder; `bin/skill-dependencies.json` has no `ws-wiki-from-code` key (Test 21).
- H7 (network fetch in from-code helper): candidate isolation breach. Discarded — grep shows no `fetch(` in `list_wiki_from_code_areas.cjs`; Test 19 `NS8` asserts same.
- H8 (stale `bin/skill-integrity.json`): candidate ship blocker. Discarded as Step 6 defect — plan §7 and Step 5 report pin integrity regen to ship PR after final hashed edits (MEMORY G4); expected at Step 6, not a product-code defect in G2.

## Phase 2 — Adversarial investigation (4-part proof, none retained)

No hypothesis survived all four proof parts, so no Critical/Warning finding opened.

## Sibling / class generalization

- Searched full G2 diff and sibling wiki helpers (`list_wiki_sweep_specs.cjs`, `list_wiki_feature_pages.cjs`, `validate_wiki.cjs`, `sync_wiki_index.cjs`). New helper mirrors `parseArgs`/`assertContained`/exit-code conventions. Skip-empty areas use `skipped` array per spec AC6. `git-surface` always present with `paths: []` per AC8. No class finding.

## MEMORY sweep

Read `.agents/skills/ws-shared/MEMORY.md` against in-scope files and plan keywords. Checked: direct-invoke dependency (`ws-wiki` → `ws-spec-write` present in `bin/skill-dependencies.json` for Phase 3 apply); integrity-regen-last (deferred to ship per plan); path containment (helper copies sweep pattern); catalog single-row merge (AC1). No confirmed MEMORY violation.

## Check invariants and local reviewer dry-run

- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` on `list_wiki_from_code_areas.cjs` + `test/test-wiki.js`: 0 issues, exit 0.
- `node test/test-wiki.js`: all asserts pass, exit 0.
- `config.json` invariants: N/A HTTP/tenancy; `commitPlanFilesOnlyAtStep8` holds (no plansDir in G2).
- Local CI reviewer dry-run: N/A — no `localReviewCommand` configured, no `scripts/cursor-reviewer`.
- Fable autoAudit (`fable.enabled: true`, `autoAudit: true`): claims match `git show 013431e4` ground truth; tests and scans re-ran green; no weakened checks, false completion, scope creep, or unauthorized action detected. Verdict: VERIFIED.

### Stack Invariant Compliance

- [x] Zero unchecked `any` / `@ts-ignore` (plain `.cjs`)
- [x] Zero floating Promises (sync `fs` only in new helper)
- [x] CLI validation at boundaries (`parseArgs` exit 2 before walk)
- [x] Path containment (`assertContained` on collected paths)
- [x] Invariant scan: 0 issues
- [x] Tests: `node test/test-wiki.js` exit 0

Score: 10/10 — clean review.

**Apply fixes?** No — clean. Skip fix loop (0 rounds consumed). Advance to Step 7.
