---
id: null
slug: ws-wiki-code-verify
title: "ws-wiki Phase 2 verify and Phase 3 plan/apply"
source: local
specDate: 2026-09-12
status: draft
---

# Specification — ws-wiki Phase 2 verify and Phase 3 plan/apply

## Description

The living wiki skill `ws-wiki` already has two complementary modes that reconstruct documentation from specs and shipped code:

- **Phase 1 (shipped, `0076`):** `/ws-wiki sweep` (aliases `first-time`, `backfill`) walks top-level `{specsDir}/*.spec.md` in prefix order, overlays `{wikiDir}/{domain}/{feature}.md`, and records **current code** when an old spec contradicts the tree. After init, a `user-gate` offers that sweep.
- **Per-delivery sync (`0075`):** `/ws-wiki sync [slug]` updates pages for one shipped feature and keeps a per-diff Apply/Cancel gate.

Phase 1 can still leave the wiki **internally consistent with last-pass code consults** while missing later drift, overstated rules, or statements that were never true in code. Operators need a second pass whose job is not “rebuild from specs” but **audit every current wiki claim against the project**.

This spec adds two sequential phases after Phase 1:

**Phase 2** (`/ws-wiki verify`, aliases `audit`, `check-code`) is read-only: extract every checkable wiki statement, look it up in code, classify it, and persist findings. It does not present the apply plan and does not write wiki pages or specs.

**Phase 3** (`/ws-wiki apply`, aliases `reconcile`, `phase-3`) is the plan and updating pass: show the findings plan, collect truth decisions, then batch-apply wiki edits and generate code-change specs.

Phase 2 flow:

1. **Offer after Phase 1.** When a sweep run finishes successfully (`validate_wiki.cjs --check` ran), present a `user-gate` before ending the turn: run Phase 2 wiki-vs-code audit (recommended) or skip. Cancel is HS-1 STOP (no Phase 2 writes).
2. **Standalone invoke.** `/ws-wiki verify` runs the same audit without a fresh sweep. **STOP** if `{wikiDir}/index.wiki.md` is missing (tell the user to run `init`, then Phase 1 if there are no feature pages). Empty feature-page set after init-only is success with findings `0`, not an error.
3. **Read-only audit.** Walk every feature page under `{wikiDir}` (not `index.wiki.md`, not `*.state.json`). Extract checkable statements from `## Business Rules & Logic` and `## Technical Architecture` (list items, numbered rules, table data rows). `## Feature Overview` contributes a statement only when the sentence is a testable invariant (permissions, required fields, state machine), not marketing purpose prose.
4. **Evidence against code.** For each statement, search the consumer project (skills, scripts, tests, hub files, application source as configured in `config.json` stack layers). Classify: `confirmed` (code matches), `differs` (code contradicts or implements a different rule), `absent` (no supporting implementation found), `inconclusive` (cannot decide; record why). Confirmed and inconclusive (with reason) are not actionable unless the user later asks to revisit.
5. **Offer Phase 3.** When the walk finishes, persist findings on the checkpoint with `status: audited`. Present a `user-gate`: run Phase 3 plan and apply (recommended) or skip. Skip leaves findings on disk and writes no wiki/spec updates. Cancel is HS-1 STOP. Zero actionable findings (`differs`/`absent` count 0) skips the Phase 3 gate; report counts and finish.

Phase 3 flow:

6. **Findings plan.** Present every `differs` and `absent` finding with wiki path, quoted statement, code evidence (paths + short excerpt or “no match”), and two truth options. Do **not** write wiki pages or specs until truth decisions are recorded.
7. **Truth gate per finding.** For each actionable finding, `user-gate` (host structured choice / `askQuestion` when bound; markdown fallback otherwise):
   1. **Update wiki (Recommended)** — code (or absence of code) is the source of truth; schedule a wiki edit that drops or rewrites the statement.
   2. **Update code** — the wiki statement stays; schedule a new spec so implementation can be changed to match.
   Cancel / dismiss → HS-1 STOP; keep already-recorded decisions; do not apply the remaining batch.
8. **Batch apply after all decisions (or after STOP of remaining).**
   - **Wiki batch:** apply scheduled wiki edits in one pass; `sync_wiki_index.cjs` if titles/one-liners changed; `validate_wiki.cjs --check`.
   - **Code batch:** do **not** edit product code in this skill. For each finding marked Update code, invoke standalone `ws-spec-write` with a prompt of the form: `Update feature {Feature Title} to reflect current wiki statement: {quoted statement}` (`slug` inferred, `source: local`). Those specs land under `{specsDir}` only (no `{plansDir}` register unless the user later starts a workflow).
9. **Standalone Phase 3.** `/ws-wiki apply` requires a checkpoint with `status: audited` (or leftover `pending` decisions). Missing checkpoint → STOP with a message to run `/ws-wiki verify` first. `--resume` continues truth gates then apply.
10. **Phase 3 does not implement code.** Generating specs is the handoff. Starting `ws-spec-to-pr` / lite is out of band.

Agentic extraction and code consult stay agentic. Page order and checkpoint membership are deterministic (Node helper). Phase 1 current-code bias during sweep is unchanged. Phase 2 records disagreements. Phase 3 is where the operator picks which side is truth and the wiki/specs are updated.

### Design Intent

`0076` chose **code wins** during sweep so a first-time backfill would not resurrect superseded spec ACs. That overlay policy is not a bug. Phase 2 is a new, gated audit that only classifies statements. Phase 3 is the plan and updating pass: operators may decide wiki is the intended product rule and that **code** should move. Sweep must not silently start rewriting product source. Verify must not rewrite the wiki. Apply must not rewrite the wiki until the truth gates complete.

### Prior Work Sweep

- Local keyword + `git log` on `.agents/skills/ws-wiki/**`, `test/test-wiki.js`, `0075-ws-wiki.spec.md`, `0076-ws-wiki-spec-sweep.spec.md`: Phase 1 shipped (`feat(ws-wiki): add first-time sequential spec sweep mode`). Helpers today: `validate_wiki.cjs`, `sync_wiki_index.cjs`, `list_wiki_sweep_specs.cjs`. No verify/audit enumerator, no `verify.state.json`, no post-sweep Phase 2 gate, no Phase 3 apply subcommand.
- `ws-spec-update` patches a single `*.spec.md` when code drifts; it does not audit the living wiki.
- `ws-plan-verify` / `ac_ledger` score pipeline ACs against implementation; they are orch Step 5, not wiki pages.
- `0077-website-wiki-page` publishes `{wikiDir}` HTML on GitHub Pages; it does not verify statements.
- GitHub: no open PR for wiki verify / wiki-vs-code audit.

## Acceptance Criteria

- AC1: `ws-wiki/SKILL.md` names Phase 1 as sweep/backfill, Phase 2 as wiki-vs-code statement verify, and Phase 3 as findings plan plus batch apply, and documents `/ws-wiki verify` (aliases `audit`, `check-code`) and `/ws-wiki apply` (aliases `reconcile`, `phase-3`).
- AC2: After a successful Phase 1 sweep finish (including empty-queue success), the agent presents a `user-gate` before ending the turn with recommended option Run Phase 2 wiki-vs-code audit versus Skip. Skip writes no verify artifacts. Cancel STOP. `autoMode` takes the recommended option without prompting.
- AC3: `/ws-wiki verify` without `index.wiki.md` STOP with a message to run `/ws-wiki init` first; it does not invent an index or feature pages.
- AC4: Helper `.agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs` lists repo-relative POSIX paths of `{wikiDir}/**/*.md` excluding `index.wiki.md` and any `*.state.json`; `--json` prints `{ ok, pages: [{ file, domain, feature }], errors }`. Sort is POSIX path lexicographic.
- AC5: Helper CLI validates `--repo-root` / `--wiki-dir` with directory containment (resolved path stays under repo root); unknown flags and leftover argv tokens are rejected before `readdir`; `--help` exits 0 and is never a filename.
- AC6: Phase 2 walks pages in helper order, one page at a time (no parallel writes to the same wiki file). For each page it extracts checkable statements from Business Rules & Logic and Technical Architecture as specified in Description; Feature Overview only when the claim is a testable invariant.
- AC7: Each extracted statement is classified `confirmed` | `differs` | `absent` | `inconclusive` with at least one evidence pointer (file path + line or explicit `no match`). Classifications are written to checkpoint before the next page.
- AC8: During the Phase 2 walk the agent does not present the findings apply plan, does not apply wiki edits, does not run `ws-spec-write`, and does not mutate product source. `--dry-run` on verify prints the page queue (and checkpoint summary if present) and writes neither wiki pages, nor `verify.state.json`, nor specs.
- AC9: After the last Phase 2 page, checkpoint `status` is `audited`. Actionable findings trigger a `user-gate` (recommended Run Phase 3 versus Skip). Skip writes no wiki or spec updates. Cancel STOP. Zero actionable findings skips the gate. `autoMode` takes recommended when the gate is shown.
- AC10: Phase 3 starts by presenting a findings plan listing every `differs` and `absent` row (wiki path, quoted statement, evidence, proposed wiki edit vs proposed code-change spec). `confirmed` / `inconclusive` counts appear in the summary only.
- AC11: For each actionable finding Phase 3 presents a `user-gate` with recommended option Update wiki (code/absence is truth) and option Update code (wiki statement is truth). Host structured choice when `askQuestionTool` is bound; markdown fallback yields the turn. Cancel STOP without applying the un-decided remainder.
- AC12: After Phase 3 decisions are recorded, wiki-directed findings are applied in one batch (in-place 3-section pages, no changelog append). Then `sync_wiki_index.cjs` if catalog lines changed, then `validate_wiki.cjs --check`. Product `.cjs`/skill bodies outside `{wikiDir}` are not edited for those findings.
- AC13: Each code-directed finding produces a standalone `ws-spec-write` (skill `ws-spec-write`, not a `{plansDir}` register) whose description is exactly the template `Update feature {title} to reflect current wiki statement: {statement}` with `{title}` from the wiki page title or index one-liner and `{statement}` the quoted wiki text. Frontmatter `source: local`. Phase 3 does not implement those specs and does not start an orchestrator.
- AC14: Checkpoint `{wikiDir}/verify.state.json` records `status` (`running` | `audited` | `applying` | `completed`), `completedPages`, `lastFile`, `findings` (id, page, statement, class, evidence, decision), `startedAt`, and `updatedAt`. Agents must not stage this file in product commits.
- AC15: `--resume` on verify continues after `lastFile` unless `--force`. `/ws-wiki apply` without `status: audited` (or leftover pending decisions) STOP. Successful Phase 3 apply sets `status: completed` or deletes the file.
- AC16: Empty feature-page wiki (index only) is Phase 2 success: findings `0`, no Phase 3 gate, validate still run if index exists.
- AC17: `test/test-wiki.js` (or a sibling `test/test-wiki-verify.js` listed in `package.json` test scripts) covers AC4–AC5, AC8 dry-run, AC15 resume skip and apply-without-audit STOP, empty pages, containment/unknown-flag failures, and SKILL/CATALOG strings for Phase 2 `/ws-wiki verify` and Phase 3 `/ws-wiki apply`.
- AC18: `CATALOG.md` task-router / skill row mentions Phase 2 wiki-vs-code verify and Phase 3 plan/apply. No host/IDE product names in skill body, gates, or scripts (portable `user-gate` / `askQuestion` alias only).
- AC19: Authoring validation for this specification exits 0.

## Original Issue Context

Standalone `/ws-spec-write` (2026-09-12), free-text:

> improve ws-wiki skill by enhancing instructions to do the following:
>
> last version, we added the backfill/first time run/sweep to ws-wiki. Its job is to create the initial state reflecting the specs. I will call it the PHASE 1.
> Now I want the PHASE 2: after updating the wiki markdown files based on last spec definitions, I want to check every statement in the resulting wiki checked against the code. Offer to user to confirm if wanst to run the PHASE 2 (user gate) askQuestion etc.
> So, the phase 2 will check every rule/definition/statement in the current wiki pages/domains/business rules to look into code if is still true. Everything checked. Propose in the end a plan to update findings that differs between code / project and the wiki. We can have items to update in two ways: Code vs Wiki definition. What should be truth ? If a finding differs (wiki vs code), propose to user: update the wiki, letting the code is right, or update the code, reflecting the wiki statement. In the end, update in batch: what will be updated in wiki, or what will be in a plan to change code. Changing code needs a new spec to be generated: ws-write-spec "Update feature XXX to reflect current wiki statement YYYY"

Follow-up in the same spec-write session: name the plan/updating pass PHASE 3.

## Notes

- Stack: `node-skills-package` / TypeScript-Node invariants apply to new `.cjs` helpers (CLI validation, path containment, no floating Promises).
- Integrity: hashed `ws-wiki` files change → `npm run generate-integrity` in the same ship PR (implementation, not this spec-write).
- Do not load `ws-run-benchmark` for this work.
- `{wikiDir}` token: `plans.wikiDir` or default `.agents/specs/wiki`.
- Phase 3 may call `ws-spec-write` only for code-directed findings after gates; it must not create `{plansDir}/{slug}/` itself.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting Phase 1 sweep current-code bias | Sweep still records code during backfill; Phase 2 classifies; Phase 3 asks which side is truth |
| Implementing product code inside `ws-wiki` | Code changes require a new spec and a later workflow |
| Registering generated specs into `{plansDir}` | Standalone `ws-spec-write` default; user starts orch later |
| Replacing `validate_wiki.cjs` structural checks | Validate stays links + 3 headings; Phase 2 is semantic |
| Auto-committing wiki pages, checkpoints, or new specs | Staging stays a later G2 / docs commit |
| Auditing `index.wiki.md` catalog one-liners as statements | Index is a map; feature pages hold rules |
| Recursively verifying `{plansDir}/**/step-00-*.spec.md` | Specs are provenance; Phase 2 evidence is wiki vs code |
| Host-specific subagent IDs as the contract | Skill stays portable |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Statement set | Bullets, numbered rules, and table rows in BR + TA; overview only if testable | Full-sentence NLP on overview would flood false positives | y |
| Post-sweep offer | Always after successful sweep finish | User asked to confirm Phase 2 after wiki update from specs | y |
| Post-verify offer | Always after audited findings with at least one actionable row | Phase 3 is explicit; skip keeps the audit for later `/ws-wiki apply` | y |
| Truth default | Update wiki recommended | Matches 0076 “current code” unless operator promotes a wiki rule | y |
| Code handoff | One `ws-spec-write` per code-directed finding using the given template | Matches the operator prompt; grouping deferred | y |
| Resume store | `{wikiDir}/verify.state.json`, not committed | Same pattern as sweep checkpoint | y |
| Auth / rate limits / tenancy | N/A because local filesystem skill, no network API | Stack HTTP/auth dimensions do not apply | y |
| Empty feature wiki | Success, findings 0 | Init-only repos should not fail verify | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill text + `list_wiki_feature_pages.cjs` + tests + catalog row; no orch FSM rewrite | Diff vs `0075`/`0076` files |
| Atomic criteria | AC1–AC19 binary | `test-wiki` / verify tests + `validate_spec --mode=authoring` |
| Failure modes | Missing index, empty pages, bad flags, path escape, start/truth Cancel, dry-run purity | Negative tests + skill STOP copy |
| Observation telemetry | Helper JSON pages; checkpoint fields; findings plan; validate exit; spec paths written | stdout / `--json` / `{specsDir}` |
| Open blockers | None; gray-area defaults recorded in companion | Companion `0078-ws-wiki-code-verify.context.md` |
| Stack: path traversal | Enumerator and writers resolve under `{wikiDir}` / `{specsDir}` only | Unit tests with `..` and absolute `--wiki-dir` |
| Stack: CLI input | Unknown flags rejected; `--help` exits 0 and is never a filename | Unit tests |
| Stack: async | New helper stays sync `fs` or awaited Promises; no floating Promises | Code review of `.cjs` |
| Stack: auth / DTO / subscriptions | N/A because no HTTP API, no Angular | Skip with reason |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs --json --repo-root .` prints ordered `pages[]`.
- Verify progress line per page: `{index}/{total} {file}` then statement counts by class.
- `{wikiDir}/verify.state.json` `lastFile` and `findings[].decision` advance as documented.
- Findings plan printed once at Phase 3 start, before truth gates.
- After Phase 3 wiki batch: `validate_wiki.cjs --check` JSON `ok`.
- After Phase 3 code batch: one `{specsDir}/NNNN-*.spec.md` (or unprefixed) path per code-directed finding; `validate_spec.cjs --mode=authoring` on each.
- `node test/test-wiki.js` (and verify sibling if split) exit 0.

### Negative & Failing Test Scenarios

- Missing `index.wiki.md`: `/ws-wiki verify` STOP; helper may still fail or list nothing; skill must not write feature pages.
- `--wiki-dir` resolving outside repo root: helper exit non-zero, no `readdir` of the escaped path.
- Unknown argv token / leftover `--help` as path: `--help` exit 0; other dash tokens non-zero (no `ENOENT` on `--help`).
- `--dry-run` after a partial checkpoint: no wiki file mtime/content change, no new checkpoint write, no new spec files.
- Post-sweep Phase 2 Skip: no `verify.state.json` and no spec-write from that turn.
- Post-Phase-2 Phase 3 Skip: checkpoint stays `audited`; no wiki edits and no spec-write until `/ws-wiki apply`.
- `/ws-wiki apply` with no audited checkpoint: STOP; no wiki or spec writes.
- Truth-gate Cancel after some decisions: wiki batch applies only decided wiki items or applies none until a later `--resume` apply step; undecided findings stay `pending`; no product code edits.
- Path-traversal domain/feature from a malicious wiki filename: writers reject; no write outside `{wikiDir}`.
- Unauthenticated network calls: N/A because verify does not call SCM HTTP; a regression that adds unauthenticated remote fetch for verify is a failing case (must not ship).
- Stack path-containment / unknown-flag failures on the new helper (same class as sweep enumerator).
