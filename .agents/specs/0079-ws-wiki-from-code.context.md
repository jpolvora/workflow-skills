# Feature Boundary

`0079-ws-wiki-from-code` adds whole-tree **genesis from code** to existing `ws-wiki` and splits SKILL procedures into companion markdown files.

In scope: `/ws-wiki from-code` (aliases `reverse`, `reconstruct`), area enumerator, merge/overwrite gates, checkpoint/resume, dry-run, post-run Phase 2 offer, init-gate from-code option, SKILL.md router plus listed companions, tests, catalog mention.

Out of scope: a second skill id, Phase 4 naming, product-code edits, `ws-spec-write` from this mode, remote git/PR fetch, auto-commit.

# Implementation Decisions

1. **Packaging.** Valid options: (a) extend `ws-wiki`; (b) new `ws-wiki-from-code` skill; (c) thin second id that only routes. **Chosen: (a).** Same `{wikiDir}`, 3-section pages, validate/sync helpers, and Phase 2/3 chain. A second skill duplicates install graph and operator routing.

2. **Progressive disclosure.** Valid options: from-code companion only; split all phases now; split later. **Chosen: split all now** (`INIT.md`, `FROM-CODE.md`, `PHASE-1-SWEEP.md`, `PHASE-2-VERIFY.md`, `PHASE-3-APPLY.md`, `SYNC.md`, `UPDATE.md`). SKILL.md keeps a subcommand table so existing tests that grep `/ws-wiki sweep` and verify aliases still hit SKILL.md.

3. **Genesis shape.** Valid options: fold into `init --from-code`; auto-run when specs are empty inside sweep; new subcommand. **Chosen: `/ws-wiki from-code` after init.** Init still writes taxonomy and defers feature pages unless from-code or sweep runs.

4. **When it may run.** Valid options: empty-spec only; anytime merge; full rebuild default. **Chosen: anytime after init, merge default**, overwrite only via extra gate. Protects a wiki already built by sweep.

5. **Context precedence.** Existing wiki > specs (hints) > README/AGENTS/STACK/docs > code inference. Merge fills gaps; it does not implement 0076’s silent “code wins over wiki statements.” Disagreements after genesis are Phase 2/3’s job.

6. **Git bound.** Last 20 local commits + branch names from config. No `git fetch`, no SCM HTTP (same isolation as 0078 verify).

7. **Area skip.** Canonical ids with zero existing paths are omitted, not stubbed. Prevents fake frontend/backend pages on docs-only or backend-only repos.

8. **Post-init gate.** Zero specs → recommend from-code. Specs present → keep recommend sweep, still offer from-code merge.

# Deferred Ideas

- Per-area Pause / `plans.wikiFromCodeBatchSize`.
- Optional generation of draft `{specsDir}` pages from inferred features (would collide with Phase 3’s spec-write role).
- Deeper git history or PR title clustering.
- Host subagent-per-area parallelism (must not overlap writes to the same wiki file).
