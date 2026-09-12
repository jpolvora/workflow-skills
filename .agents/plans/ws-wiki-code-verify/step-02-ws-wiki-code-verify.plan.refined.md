---
slug: ws-wiki-code-verify
title: ws-wiki Phase 2 verify and Phase 3 plan/apply
status: completed
step: 2
workflowId: ws-wiki-code-verify-20260912T160041Z
startedAt: "2026-09-12T16:00:41Z"
endedAt: "2026-09-12T16:20:00Z"
refinedFrom: .agents/plans/ws-wiki-code-verify/step-01-ws-wiki-code-verify.plan.md
spec: .agents/plans/ws-wiki-code-verify/step-00-ws-wiki-code-verify.spec.md
interview: .agents/plans/ws-wiki-code-verify/step-02-ws-wiki-code-verify.plan-interview.md
acRefs: []
---
*Step 2 (interview) resolutions folded inline (registry G1–G6 in `step-02-ws-wiki-code-verify.plan-interview.md`); `step-01` untouched. Pins added: §2 helper exclusions/flags/`domain` rule, §3 step-1/step-2/step-4 pins, §8 OQ1–OQ2 resolved.*

## 0. Summary & Business Rules

Add two sequential phases to the `ws-wiki` living-wiki skill after the shipped Phase 1 sweep (`0076`):

- **Phase 2** (`/ws-wiki verify`, aliases `audit`, `check-code`): read-only audit. Walk every feature page under `{wikiDir}` in deterministic helper order, extract checkable statements from `## Business Rules & Logic` + `## Technical Architecture` (plus `## Feature Overview` only for testable invariants), classify each as `confirmed` | `differs` | `absent` | `inconclusive` with file+line evidence (or explicit `no match`), persist to `{wikiDir}/verify.state.json` (`status: audited`). No wiki edits, no spec writes, no product-code mutation during the walk. `--dry-run` prints the queue and writes nothing.
- **Phase 3** (`/ws-wiki apply`, aliases `reconcile`, `phase-3`): findings plan for every `differs`/`absent` row, sequential per-finding truth `user-gate` (recommended Update wiki vs Update code), then batch apply: wiki-directed edits in one pass (+ `sync_wiki_index.cjs` + `validate_wiki.cjs --check`), code-directed findings each produce one standalone `ws-spec-write` with the exact template `Update feature {title} to reflect current wiki statement: {statement}` (`source: local`, no `{plansDir}` register, no orchestrator start).

Business rules preserved: Phase 1 current-code overlay bias unchanged; verify never rewrites the wiki; apply never rewrites the wiki until truth gates complete; sweep must not rewrite product source; Phase 3 never implements code. Cancel at any gate is HS-1 STOP with already-recorded decisions kept. `autoMode` takes the recommended gate option without prompting. Empty feature-page wiki (index only) is Phase 2 success with findings `0` and no Phase 3 gate.

## 1. Definition of Ready & Scope

Resolved assumptions (from `0078-ws-wiki-code-verify.context.md`): offer Phase 2 after sweep + standalone (not after every `sync`); plan/updating split into Phase 3; statement atoms are list items / numbered rules / table rows in BR+TA (+ testable overview invariants); sequential per-finding gates with Update-wiki recommended; one spec per code-directed finding; checkpoint at `{wikiDir}/verify.state.json`; auth/tenancy N/A (local filesystem skill, no network API).

Measurable Acceptance Criteria (AC1–AC19 from `step-00-ws-wiki-code-verify.spec.md`):

- AC1: SKILL.md names Phase 1/2/3 and documents both subcommands + aliases.
- AC2: Post-sweep Phase 2 offer gate (recommended Run vs Skip; Cancel STOP; autoMode takes recommended).
- AC3: Verify without `index.wiki.md` STOPs with init message; invents nothing.
- AC4: New helper `list_wiki_feature_pages.cjs` with `--json` `{ ok, pages: [{ file, domain, feature }], errors }`, POSIX lexicographic sort, exclusions as specified.
- AC5: Helper CLI containment for `--repo-root`/`--wiki-dir`, unknown-flag/leftover rejection before `readdir`, `--help` exit 0 never a filename.
- AC6: Phase 2 sequential walk in helper order, one page at a time; extraction scope per Description.
- AC7: Four-class classification with ≥1 evidence pointer per statement; checkpoint written before next page.
- AC8: Walk purity (no findings plan, no wiki edits, no spec-write, no product mutation); `--dry-run` writes nothing.
- AC9: Post-walk `audited` status + Phase 3 offer gate (Skip writes nothing; Cancel STOP; zero-actionable skips gate; autoMode takes recommended).
- AC10: Phase 3 findings plan lists every `differs`/`absent` row with path, quote, evidence, both proposals; confirmed/inconclusive counts summary-only.
- AC11: Per-finding truth `user-gate` (Update wiki recommended / Update code; structured choice when bound, markdown fallback; Cancel STOP on remainder).
- AC12: Wiki batch in place (3-section pages, no changelog append), then index sync if catalog lines changed, then validate; no product `.cjs`/skill-body edits for wiki findings.
- AC13: Code-directed findings → standalone `ws-spec-write` with exact template, `{title}` from page title/index one-liner, `source: local`; no implementation, no orch start.
- AC14: Checkpoint schema (`status`, `completedPages`, `lastFile`, `findings[]`, `startedAt`, `updatedAt`); never staged in product commits.
- AC15: `--resume` continues after `lastFile` unless `--force`; apply without `audited`/pending STOPs; success sets `completed` or deletes file.
- AC16: Index-only wiki is success (findings 0, no Phase 3 gate, validate still run).
- AC17: Tests cover AC4–AC5, AC8 dry-run, AC15 resume/apply-STOP, empty pages, containment/unknown-flag failures, SKILL/CATALOG strings.
- AC18: CATALOG router/row mentions Phase 2 + Phase 3; no host/IDE product names anywhere in body/gates/scripts.
- AC19: Authoring validation for the spec exits 0 (already verified at spec time; re-verify unchanged spec at Step 5).

Out of scope (per spec): rewriting Phase 1 bias; implementing product code in `ws-wiki`; registering generated specs into `{plansDir}`; replacing `validate_wiki.cjs`; auto-committing; auditing index one-liners; recursing into `{plansDir}/**/step-00-*`; host-specific subagent IDs; starting `ws-spec-to-pr`/lite from Phase 3.

## 2. Technical Design & Architecture

Layer edits (per `config.json` stack `node-skills-package`):

- **skills-sot** (`.agents/skills/ws-wiki/`):
  - `SKILL.md`: extend Subcommands block with `/ws-wiki verify` and `/ws-wiki apply` lines; add Modes § Phase 2 and § Phase 3 (offer gates, walk rules, findings plan, truth gates, batch apply, checkpoint/resume/dry-run/empty-wiki STOP copy); extend Deterministic Helpers block with the new enumerator usage. Portable wording only: `user-gate` / `askQuestion` alias; no host/IDE product names.
  - `scripts/list_wiki_feature_pages.cjs` (new): mirror `list_wiki_sweep_specs.cjs` CLI skeleton (`parseArgs` with `--repo-root/--wiki-dir/--json/--help`, unknown-flag exit 2 before any `readdir`, `--help` exits 0 and is never treated as a filename) and `assertContained(repoRoot, candidate, label)` directory-containment. Recursive `readdirSync` walk under resolved wiki dir; collect `**/*.md` excluding exactly `index.wiki.md` (basename at wiki root) and any `*.state.json`; emit repo-relative POSIX paths; derive `{ domain, feature }` from path relative to wiki dir (`domain` = first segment or empty for root-level pages, `feature` = basename minus `.md`); sort POSIX lexicographic; `--json` prints `{ ok, pages, errors }`. Sync `fs` only (same as siblings; no floating Promises). Never `readdir` outside containment; errors surfaced via `errors[]` with `ok: true` for empty wiki, non-zero exit for containment/flag failures.
    - Step 2 pins (G2/G3/G4): root-index-only exclusion is intentional and matches `validate_wiki.cjs` (root index at `path.join(wikiDir, 'index.wiki.md')`; every other `.md` is a feature page) — a nested `domain/index.wiki.md`, if ever created, lists as a feature page in both tools. `*.state.json` files are `.json` and naturally invisible to `.md` walks; the explicit drop covers the `*.state.json.md` edge. Flag set is exactly `--repo-root/--wiki-dir/--json/--help` — no `--specs-dir` (sibling-only: it scans specs while excluding a nested wiki); reject `--specs-dir` as unknown with exit 2. `domain: ""` for root-level pages (read-only filesystem truth; `sync_wiki_index.cjs normalizeDomain` `'general'`/`'core'` defaults are write-path only); test pins this.
- **tests** (`test/`):
  - Extend `test/test-wiki.js` in place (Step 2 G1: current 439 lines → ~600–650 after additions, under the ~700-line split threshold; split into `test/test-wiki-verify.js` only if implementation exceeds it) and list any sibling in `package.json` `tests:harness-efficiency` chain next to `test-wiki.js`: enumerator order/exclusions/JSON shape; containment rejection (`--wiki-dir` outside root, no `readdir` of escaped path); unknown-flag and `--help`-as-path behavior; dry-run purity (no mtime/content/checkpoint/spec writes); resume skip after `lastFile` and `--force` restart; apply-without-audit STOP; empty-pages success; SKILL.md + CATALOG.md string assertions for Phase 2/3 subcommands and aliases.
- **installer-cli / site** (`CATALOG.md`, `.agents/skills/ws-shared/runtime/CATALOG.md`):
  - Update the `ws-wiki` skill row and task-router row to mention Phase 2 wiki-vs-code verify and Phase 3 plan/apply. Keep row granularity (one row per skill id; merge intents, no duplicate router rows).
- **Integrity (ship-time, not a plan edit)**: hashed `ws-wiki` files change → `npm run generate-integrity && npm run verify-integrity` in the same ship PR/commit sequence (Step 4+ concern; plan records the obligation only).

Fable domain check (`config.json.fable.enabled` + `autoDetectDomain` true, `ws-fable-domain` present): scanned for domain signals — no IaC (`*.tf`), K8s manifests, Docker, DB migrations, or data scripts are touched by this change (new helper is a read-only markdown enumerator; skill prose is local-filesystem gates). No domain adapter bound; standard evidence/observation rules apply. Missing-adapter STOP does not trigger.

## 3. Step-by-Step Plan

1. **Enumerator helper** (covers AC4, AC5; negatives NS2, NS3, NS9, NS11):
   - Action: write `.agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs` by mirroring `list_wiki_sweep_specs.cjs` arg parsing + `assertContained`; implement recursive walk, exclusions, POSIX sort, `--json` shape; `--help` text; exit codes (0 ok/help, 1 containment/runtime, 2 unknown-flag/missing-value, before `readdir`). Step 2 pins: exact flag set `--repo-root/--wiki-dir/--json/--help` (reject `--specs-dir`); root-index-only exclusion + `*.state.json` drop; `domain ""` for root pages.
   - Affected files: `.agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs` (new).
   - Engineering checks: manual `node ... --json --repo-root .` on this repo; escape attempt `--wiki-dir ../outside` exits non-zero; `--bogus` exits 2; `--help` exits 0 with no file named `--help` created.
2. **SKILL.md Phase 2 + Phase 3 prose** (covers AC1–AC3, AC6–AC16; negatives NS1, NS4–NS8, NS10):
   - Action: add subcommand lines + two mode sections + helper usage; encode every gate (post-sweep offer, post-audit offer, per-finding truth choice), every STOP (missing index, apply-without-audit, cancel), read-only and batch rules, checkpoint lifecycle, `--resume`/`--force`, `--dry-run` purity, empty-wiki success, no-orch-start. Keep `user-gate`/`askQuestion` portable aliases only. Step 2 pin (G6): wiki-batch writes reuse the `assertContained` pattern for targets under `{wikiDir}` (same as helper); do not invent a second containment scheme.
   - Affected files: `.agents/skills/ws-wiki/SKILL.md`.
   - Engineering checks: grep for forbidden host/IDE product names; visual diff vs `0075`/`0076` sections to confirm Phase 1 text untouched.
3. **CATALOG rows** (covers AC18):
   - Action: update `ws-wiki` skill + router rows in root `CATALOG.md` and `.agents/skills/ws-shared/runtime/CATALOG.md` to mention Phase 2 verify + Phase 3 plan/apply.
   - Affected files: `CATALOG.md`, `.agents/skills/ws-shared/runtime/CATALOG.md`.
   - Engineering checks: single row per skill id; wording mirrors SKILL.md subcommand names/aliases.
4. **Tests** (covers AC17; negatives NS1–NS9, NS11):
   - Action: extend `test/test-wiki.js` in place (Step 2 G1 resolved: split only past ~700 lines); fixture tmp wiki trees per case; assert exit codes, JSON shapes, file mtimes, and string presence. Pins: `domain ""` root-page case; `--specs-dir` rejection case; nested-`index.wiki.md`-as-feature-page consistency case optional.
   - Affected files: `test/test-wiki.js` (and optionally `test/test-wiki-verify.js`, `package.json` scripts line).
   - Engineering checks: `node test/test-wiki.js` (plus sibling) exit 0.
5. **Verification pass** (covers AC19 + stack gates):
   - Action: re-run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on the unchanged spec; run `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` scoped to touched files; run `npm run verify-integrity` read-only (regen itself is a Step 4+ ship action after final skill edits, per MEMORY trap: finish all hashed edits first, then `generate-integrity && verify-integrity`).
   - Engineering checks: all three exit 0 (integrity regen deferred, not skipped).

Explicit non-goals for implementers: no `{wikiDir}/verify.state.json` fixture commits; no product-code edits outside the files above; no `{plansDir}` writes; no benchmark loads; no `2>nul` redirects (use `>/dev/null` in bash).

## 4. Permissions, Tenancy & i18n

RBAC: N/A — local filesystem skill, no HTTP API, no endpoint attributes or route guards (spec assumption confirmed y). Tenancy: N/A — no tenant field, no shared datastore; wiki writes are repo-local paths contained under `{wikiDir}`. i18n: N/A — no user-facing locale strings; CLI `--help`/errors stay en-us per harness language rule. Path-traversal isolation (the applicable boundary here) is enforced by `assertContained` on `--repo-root`/`--wiki-dir` and link-escape checks already in `validate_wiki.cjs`; covered in §6.

## 5. Test Coverage

- AC1 → string test: SKILL.md contains `Phase 2` + `verify`/`audit`/`check-code` and `Phase 3` + `apply`/`reconcile`/`phase-3` (test-wiki string block).
- AC2 → skill-prose test: post-sweep gate copy present (recommended Run vs Skip, Cancel STOP, autoMode); no negative-test machine coverage (gate behavior is prose + orch autoMode, asserted by string test).
- AC3 → negative test NS1: verify-STOP copy in SKILL.md; helper on index-less fixture lists nothing/fails without writing pages.
- AC4 → enumerator tests: exclusions (`index.wiki.md`, `*.state.json`), JSON shape, POSIX sort, `domain`/`feature` derivation.
- AC5 → CLI tests: containment exit non-zero with no escaped `readdir`; unknown-flag exit 2; `--help` exit 0 and never a filename.
- AC6 → prose + order test: walk-order copy in SKILL.md; enumerator order fixture reused as queue source.
- AC7 → prose test: four classes + evidence-pointer requirement + per-page checkpoint write copy.
- AC8 → dry-run purity test NS4: mtimes + directory listing unchanged; no `verify.state.json`, no specs written.
- AC9 → prose test: `audited` + Phase 3 offer copy (Skip/Cancel/zero-actionable/autoMode).
- AC10 → prose test: findings-plan row shape copy (`differs`/`absent` only; confirmed/inconclusive summary-only).
- AC11 → prose test: truth-gate copy (recommended Update wiki, structured-vs-fallback, Cancel STOP).
- AC12 → prose test: batch-apply + sync + validate ordering copy; no-product-edit rule.
- AC13 → prose test: exact `Update feature {title} to reflect current wiki statement: {statement}` template copy + `source: local` + no-register/no-orch copy.
- AC14 → prose test: checkpoint schema copy + never-stage rule.
- AC15 → resume tests: skip-after-`lastFile`, `--force` restart, apply-without-audit STOP.
- AC16 → empty-pages test: index-only fixture → findings 0, no Phase 3 gate, validate run.
- AC17 → meta: the above tests exist in `test-wiki.js` (or registered sibling).
- AC18 → string test: CATALOG rows mention Phase 2 + Phase 3; forbidden-product-name grep empty on body/gates/scripts.
- AC19 → `validate_spec.cjs --mode=authoring` exit 0 on the spec.
- NS9 → traversal test: malicious wiki filename cannot escape `{wikiDir}`.
- NS10 → regression guard: no network-fetch import added to new helper (static grep for `fetch(`/`http` in `ws-wiki/scripts`).
- NS11 → covered by AC5 containment/unknown-flag tests on the new helper.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` (stack id `node-skills-package`; invariants `commitPlanFilesOnlyAtStep8: true`, EF/tenancy keys false/N/A). Touched framework boundaries:

- **Authorization & endpoint protection**: NOT TOUCHED — no HTTP endpoints, no middleware, no role attributes in this change. Verified by: grep of new helper for `authoriz|middleware|policy|guard(` returns only prose comments (expected: none); no test needed beyond the NS10 fetch-grep.
- **Concurrency & async safety (zero floating Promises)**: TOUCHED (new Node helper). Rule: sync `fs` (`readdirSync`/`existsSync`/`readFileSync` only, mirroring both sibling helpers) — zero async calls, therefore zero floating Promises. Verified by: code review of the helper (no `async`, no bare `Promise`, no `*_async` fs APIs) + `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` scoped to `.agents/skills/ws-wiki/scripts/` exits 0.
- **Input validation & DTO boundary (schemas, injection defenses)**: TOUCHED (CLI surface). Rules: every external input (`--repo-root`, `--wiki-dir`, argv tokens) validated before use — unknown `--flags` and leftover positionals rejected with exit 2 before `readdir`; `--help` short-circuits; resolved `--wiki-dir`/`--repo-root` pass `assertContained` (resolve + `path.relative` must not start with `..`). Verified by: AC5/NS2/NS3/NS11 tests + invariant scan path-containment rule.
- **Subscription & lifecycle cleanup (streams, listeners, descriptors)**: NOT TOUCHED — no streams, sockets, watchers, or event listeners opened; sync calls release descriptors on return. Verified by: review (no `createReadStream`/`on(` handler without cleanup in new code).

Pre-PR verification commands (run at Step 4+/7, recorded here for implementers):

```bash
node test/test-wiki.js
node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring ".agents/plans/ws-wiki-code-verify/step-00-ws-wiki-code-verify.spec.md"
```

Integrity obligation (ship-time): after final hashed skill edits, `npm run generate-integrity && npm run verify-integrity` in the same ship sequence (MEMORY trap 2026-09-09 / 2026-09-06: never interleave hashed edits with verification; regenerate from a clean tree with no untracked skill-tree files).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skill body + scripts + tests + catalog only; no orch FSM, no `{plansDir}` writes, no product-code edits).
- [ ] Domain entities and mappings encapsulated (N/A — no domain model; wiki page 3-section format preserved).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — no endpoints; path-containment checks applied instead).
- [ ] Stack & security invariants verified (sync-only helper, CLI validation, containment; scan exits 0).
- [ ] i18n keys declared (N/A — en-us CLI prose only).
- [ ] Test cases cover all ACs (§5 mapping complete; AC19 authoring validation exit 0).

## 8. Open Questions

1. **Sibling vs extension for tests** — RESOLVED (Step 2 G1): extend `test/test-wiki.js` in place (439 lines now; ~600–650 after additions, under ~700). Split into `test/test-wiki-verify.js` + `package.json` registration only if implementation exceeds ~700 lines.
2. **`domain` for root-level pages** — RESOLVED (Step 2 G2): `""` (empty string) with `feature` = basename; test pins it. (`sync_wiki_index.cjs` `'general'`/`'core'` defaults are write-path only.)
3. **No other blockers** — spec DoR records none; stack detected from `config.json`; MEMORY consulted and forced-interview conflict discharged (Step 2 G5: benchmark/integrity/redirect/router-row traps all folded; no plan change).
