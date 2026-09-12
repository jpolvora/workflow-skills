# Feature Boundary

`0076-ws-wiki-spec-sweep` adds first-time (and re-runnable) sequential wiki backfill. It does not change the meaning of `index.PRD`, `CHANGELOG.md`, or per-slug `/ws-wiki sync`.

In scope: post-init offer, `/ws-wiki sweep`, deterministic enumerator, overlay order, current-code bias, checkpoint/resume, dry-run, tests, catalog mention.

Out of scope: pending-only queues, plan-folder specs, parallel writes, auto-commit.

# Implementation Decisions

1. **Sweep gates vs 0075 per-sync Apply/Cancel.** Valid options: (a) keep Apply/Cancel on every spec; (b) one start gate plus auto-write; (c) checkpoint every N specs. **Chosen: (b).** A board with dozens of `NNNN-*.spec.md` makes (a) the prompt this feature is meant to replace. Per-slug `sync` still uses (a).

2. **Queue source.** Valid options: all top-level specs; `index.PRD` `[x]` only; `list_pending_specs`. **Chosen: all top-level `{specsDir}/*.spec.md`.** Overlay needs shipped history so later specs can supersede early ACs.

3. **Checkpoint location.** Valid options: `{wikiDir}/sweep.state.json`; `{plansDir}/wiki-sweep.state.json`; session memory only. **Chosen: `{wikiDir}/sweep.state.json`**, deleted or marked completed at end, never staged. Avoids creating `{plansDir}` from a standalone spec-write follow-through and survives a crashed session.

4. **Conflict policy.** Valid options: spec text always wins; code always wins; stop and ask. **Chosen: code wins**, with optional provenance note. Matches “wiki reflecting the current version.”

# Deferred Ideas

- Incremental “only specs newer than last sweep” using specDate (not required for first-time).
- Optional mid-batch Pause every N specs as a config knob (`plans.wikiSweepBatchSize`).
- Mapping table from `index.PRD` phase names to wiki domains (agent mapping is enough for v1).
