# Feature Boundary

`0078-ws-wiki-code-verify` adds Phase 2 (read-only wiki-vs-code audit) and Phase 3 (findings plan plus batch wiki updates and code-change specs). It does not change Phase 1 overlay policy, `index.PRD`, or per-slug `/ws-wiki sync`.

In scope: post-sweep Phase 2 offer, `/ws-wiki verify`, page enumerator, read-only walk, post-audit Phase 3 offer, `/ws-wiki apply`, findings plan, per-finding truth gates, wiki batch, `ws-spec-write` for code-directed findings, checkpoint/resume, dry-run, tests, catalog mention.

Out of scope: implementing those code specs, orch register, structural `validate_wiki.cjs` replacement, auto-commit.

# Implementation Decisions

1. **When Phase 2 is offered.** Valid options: (a) only after sweep; (b) after sweep and after every `sync`; (c) standalone only. **Chosen: (a) plus standalone `/ws-wiki verify`.** The user asked to confirm after wiki update from last spec definitions (sweep). Per-slug sync already has an Apply/Cancel wiki gate; stacking a full-tree audit there would dominate delivery close.

2. **Plan/updating is Phase 3.** Valid options: keep plan+apply inside Phase 2; split after the audit. **Chosen: split.** Phase 2 classifies only. Phase 3 presents the plan, collects truth, then batch-updates wiki and writes specs. Matches the operator naming.

3. **Statement granularity.** Valid options: every sentence on every page; BR+TA list/table atoms only; whole sections as one claim. **Chosen: list items, numbered rules, and table rows in Business Rules & Logic and Technical Architecture**, plus Feature Overview sentences only when they state a testable invariant. Avoids flooding the truth gates with purpose prose.

4. **Truth-gate UX.** Valid options: one multi-select matrix; sequential per-finding `user-gate`; auto wiki-wins. **Chosen: sequential per-finding `user-gate` after the Phase 3 findings plan**, recommended = update wiki. Matches “what should be truth?” without requiring a host widget that can tick N rows. `askQuestion` when bound; markdown fallback yields.

5. **Code-side packaging.** Valid options: one spec per finding (user template); one spec per feature page; one mega-spec. **Chosen: one standalone `ws-spec-write` per code-directed finding** using `Update feature {title} to reflect current wiki statement: {statement}`. Grouping by page is deferred.

6. **Recommended truth.** Valid options: wiki always; code always; no recommendation. **Chosen: Update wiki (code/absence is truth)** so Phase 3 defaults stay aligned with Phase 1 current-code bias unless the operator promotes a wiki rule into a spec.

7. **Checkpoint location.** Valid options: `{wikiDir}/verify.state.json`; `{plansDir}`; session only. **Chosen: `{wikiDir}/verify.state.json`**, same rationale as `0076` sweep checkpoint. Phase 2 ends at `audited`; Phase 3 moves through `applying` to `completed`.

# Deferred Ideas

- Group code-directed findings on the same wiki page into one spec with multiple ACs.
- Optional `plans.wikiVerifyBatchSize` Pause every N pages.
- Machine-checkable statement IDs embedded in wiki markdown (stable anchors for resume).
- Offer Phase 2 after `/ws-wiki sync` when the diff is large.
