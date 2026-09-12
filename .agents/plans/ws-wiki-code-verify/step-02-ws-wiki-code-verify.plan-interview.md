---
slug: ws-wiki-code-verify
title: ws-wiki Phase 2 verify and Phase 3 plan/apply
status: completed
step: 2
workflowId: ws-wiki-code-verify-20260912T160041Z
startedAt: "2026-09-12T16:00:41Z"
endedAt: "2026-09-12T16:20:00Z"
phase: interview
planPath: .agents/plans/ws-wiki-code-verify/step-01-ws-wiki-code-verify.plan.md
specPath: .agents/plans/ws-wiki-code-verify/step-00-ws-wiki-code-verify.spec.md
refinedPath: .agents/plans/ws-wiki-code-verify/step-02-ws-wiki-code-verify.plan.refined.md
autoMode: true
forceInterview: true
forceInterviewReason: Step 1 check_memory_conflict exit 2
round: 1
blocking_open: 0
shared_understanding: confirmed
acRefs: []
---
# Step 2 — Plan interview (ws-wiki-code-verify)

Forced interview (`force_interview=true`, Step 1 `check_memory_conflict` exit 2) executed under
`ws-plan-interview` in `autoMode`. Project-context sweep ran before any escalation; sweep-miss
blocking gaps would have closed as model-inferred with no `user-gate`. No escalation was needed:
all 6 registered gaps closed, `blocking_open == 0`.

## Audit coverage

Scanned plan sections 0–8 against spec AC1–AC19, negative scenarios NS1–NS11, spec DoR, companion
`0078-ws-wiki-code-verify.context.md`, MEMORY traps, and touched framework boundaries (§6).
Scenario probes run: soft-deletion (checkpoint loss), concurrency (parallel writes), list sizing
(large wiki / large findings plan), rate limits (N/A — local filesystem). Failing-test-baseline
check: every implementation task maps to a red test that fails before implementation (missing
helper → enumerator/containment tests fail; missing SKILL/CATALOG strings → string tests fail).
Section 6 boundary audit: concurrency/async TOUCHED, CLI input validation TOUCHED, path traversal
TOUCHED, authorization/subscriptions NOT TOUCHED with reasons — all with explicit verification
methods. No blocking gap found in any section.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|-----------|
| G1 | open-question | 8 | Sibling vs extension for tests: extend `test/test-wiki.js` in place or add `test/test-wiki-verify.js`? | Extend in place unless file exceeds ~700 lines, then split and register sibling in `package.json`. | closed | Extend `test/test-wiki.js` in place. Current file is 439 lines; the AC4–AC5/dry-run/resume/empty/strings additions (~150–200 asserts) land at ~600–650 lines, under the 700-line split threshold. Split only if implementation exceeds it. | project | `test/test-wiki.js` (439 lines, read 2026-09-12); plan §8 OQ1 threshold; `package.json` `tests:harness-efficiency` chain (sibling registration path confirmed) | none |
| G2 | design-choice | 2 | `domain` for root-level pages (`{wikiDir}/*.md` with no subfolder): `""` vs `"general"`? | `""` (empty string), `feature` = basename. | closed | Keep `""`. The enumerator is read-only and reports filesystem truth (no folder = no domain); `sync_wiki_index.cjs` `normalizeDomain` (`'general'`/`'core'` defaults) is a write-path folder picker, not a read precedent. Test pins `""`. | model-inferred | `sync_wiki_index.cjs:35-36,51` (`general`/`core` write defaults considered); `validate_wiki.cjs:111` (root-only index, no domain concept); no existing enumerator derives `domain` — judgment call between conflicting precedents | none |
| G3 | scope-clarification | 2 | Exclusion scope: "excluding `index.wiki.md`" — root only or any nested basename? `*.state.json` edge (a `**/*.md` walk never matches `.json`)? | Exclude root `index.wiki.md` only; collect `**/*.md`, then drop root-basename match + any `*.state.json` (covers `*.state.json.md` edge). | closed | Plan wording ("exactly `index.wiki.md` (basename at wiki root)") is correct and consistent with `validate_wiki.cjs`, which treats only the root index as index (line 111) and every other `.md` file as a feature page (line 142). Nested `domain/index.wiki.md`, if ever created, lists as a feature page in both tools. `*.state.json` files are `.json` and naturally invisible to `.md` walks; explicit drop is belt-and-braces. No behavior change; folded as doc pin in refined §2. | project | `validate_wiki.cjs:64-77` (`findMarkdownFiles` collects `.md` only), `:111` (root index), `:142` (all other `.md` = feature pages) | none |
| G4 | scope-clarification | 2 | Helper flag set: sibling `list_wiki_sweep_specs.cjs` parses `--specs-dir`; does the new helper need it? | No. New helper scans `{wikiDir}` only; parse `--repo-root` / `--wiki-dir` / `--json` / `--help`; reject `--specs-dir` as unknown (exit 2). | closed | AC5 names only `--repo-root`/`--wiki-dir`; `--specs-dir` exists on the sibling because it scans specs while excluding a nested wiki — inapplicable here. Implementers must not copy `--specs-dir` blindly. Folded as doc pin in refined §2/§3-step-1. | project | `list_wiki_sweep_specs.cjs:11-49` (sibling flag set + exit-2 unknown-flag guard); spec AC5 | none |
| G5 | memory-conflict | 1, 2, 3, 6 | Step 1 `check_memory_conflict` exit 2 forced this interview: overlapping MEMORY traps could contradict plan guidance (known class: newer High forbid vs older Medium tip, e.g. benchmark/ORCH; plus integrity-regen, nul-redirect, router-row-duplication traps). | Verify every applicable trap is already folded in the plan; record the fold; no plan change if complete. | closed | Plan already folds all four applicable traps: (a) no-benchmark — §3 non-goals "no benchmark loads" + spec Notes "Do not load `ws-run-benchmark`" (MEMORY 2026-08-31 High + 2026-08-28 Medium pair); (b) integrity-regen-last — §6 obligation "finish all hashed edits first, then `generate-integrity && verify-integrity`" (MEMORY 2026-09-09 High + 2026-09-06 High); (c) `>/dev/null` only — §3 non-goals "no `2>nul` redirects (use `>/dev/null` in bash)" (MEMORY 2026-09-11 Medium); (d) one router row per skill id — §2 "Keep row granularity (one row per skill id; merge intents, no duplicate router rows)" (MEMORY 2026-09-02 Medium). No contradiction remains; no plan change. This forced interview is thereby discharged. | project | `MEMORY.md` traps 2026-08-31, 2026-08-28, 2026-09-09, 2026-09-06, 2026-09-11, 2026-09-02; plan §2/§3/§6 citations above | none |
| G6 | scope-clarification | 4, 5, 6 | Phase 3 wiki-batch writer containment (NS9): plan pins `assertContained` for the helper, but the wiki-batch writers are skill prose — do they reuse the same containment? | Yes: any wiki-batch write target resolves under `{wikiDir}` via the same `assertContained` pattern; NS9 traversal test covers it. | closed | Covered by existing plan text: §4 cites "`assertContained` on `--repo-root`/`--wiki-dir` and link-escape checks already in `validate_wiki.cjs`"; §5 NS9 mandates the traversal test; `validate_wiki.cjs:131,164` already enforces link-escape and `test-wiki.js` Test 11 asserts slug/`--file` rejection. Refined §3-step-2 carries a one-line pin so implementers reuse (not reinvent) the pattern. No behavior change. | project | `validate_wiki.cjs:131,164` (escape checks); `test-wiki.js` Test 11 (traversal rejection asserts); plan §4/§5 | none |

## Scenario probes (no new gaps)

- **Soft-deletion (checkpoint loss):** verify with no checkpoint starts fresh from page 0 (helper order);
  `--resume` with no checkpoint ≡ fresh run; apply without `audited`/pending STOPs (AC15). Covered.
- **Concurrency:** one-page-at-a-time walk + sync-`fs` helper ⇒ zero parallel writes to the same wiki
  file and zero floating Promises. `sweep.state.json` vs `verify.state.json` coexist under `{wikiDir}`
  (both `.json`, invisible to `.md` walks and to `validate_wiki.cjs` discovery). Covered.
- **List sizing:** unbounded sequential truth gates are spec-mandated (AC11); zero-actionable skips the
  Phase 3 gate (AC9). `plans.wikiVerifyBatchSize` Pause stays deferred per companion. No change.
- **Rate limits:** N/A — local filesystem skill, no network API (spec assumption confirmed y). No change.

## DoR re-check

Bounded scope, atomic AC1–AC19, failure modes (NS1–NS11 mapped in §5), observation telemetry (§5 +
Validation Notes), open blockers none (companion gray-area defaults recorded), stack
path-traversal/CLI/async rows with unit-test + scan verification, auth/DTO/subscriptions N/A with
reason. AC19 authoring validation already exit 0 at spec time; re-verified at Step 5 per plan §3-step-5.

## Step-output (workflow mode)

```yaml
status: success
refine:
  registry:
    - {id: G1, class: open-question, section: 8, gap: "sibling vs extension for tests", status: closed, resolution: "extend test/test-wiki.js in place (~439 lines, headroom to ~700)", resolutionSource: project, evidence: "test/test-wiki.js line count; package.json tests:harness-efficiency chain", dependsOn: []}
    - {id: G2, class: design-choice, section: 2, gap: "domain for root-level pages", status: closed, resolution: 'keep "" with feature=basename; test pins it', resolutionSource: model-inferred, evidence: "sync_wiki_index.cjs:35-36,51 (write-path precedent considered); validate_wiki.cjs:111 (no read precedent)", dependsOn: []}
    - {id: G3, class: scope-clarification, section: 2, gap: "index.wiki.md / *.state.json exclusion scope", status: closed, resolution: "root index only; nested index.wiki.md lists as feature page (matches validate); *.state.json drop covers .md edge", resolutionSource: project, evidence: "validate_wiki.cjs:64-77,111,142", dependsOn: []}
    - {id: G4, class: scope-clarification, section: 2, gap: "helper flag set (--specs-dir?)", status: closed, resolution: "no --specs-dir; reject as unknown exit 2", resolutionSource: project, evidence: "list_wiki_sweep_specs.cjs:11-49; spec AC5", dependsOn: []}
    - {id: G5, class: memory-conflict, section: "1,2,3,6", gap: "check_memory_conflict exit 2 forced interview", status: closed, resolution: "all four applicable traps already folded; no plan change; forced interview discharged", resolutionSource: project, evidence: "MEMORY.md 2026-08-31/2026-08-28/2026-09-09/2026-09-06/2026-09-11/2026-09-02; plan §2/§3/§6", dependsOn: []}
    - {id: G6, class: scope-clarification, section: "4,5,6", gap: "wiki-batch writer containment (NS9)", status: closed, resolution: "reuse assertContained for write targets; NS9 test covers", resolutionSource: project, evidence: "validate_wiki.cjs:131,164; test-wiki.js Test 11; plan §4/§5", dependsOn: []}
  round: 1
  blocking_open: 0
  shared_understanding: confirmed
```

`autoMode` took effect: no `user-gate` emitted; sweep-miss fallback not needed (every gap had a
project hit except G2, closed as model-inferred per protocol). No product edits made.
