# `kanvas-board-drag-drop` context — gray areas and deferred ideas

Companion to `0131-kanvas-board-drag-drop.spec.md`. No empty sections; each item ends in a pinned decision or an explicit deferral.

## Feature Boundary

The board performs only status flips whose owning contracts already exist (index track/sync rows, plan status flips, archive rows). It creates no run directories, no ship records, no delivery commits or PRs, and rewrites no shipped history. Anything that would invent provenance or lifecycle artifacts stays with the workflow skills that own those files, and the drop fails closed with a typed `409` instead.

## Implementation Decisions

### Move semantics: derived-signal writes vs an explicit board-status field

- Option A (chosen): drops write the owning derived signal (index row, plan status, archive row) and the v1 collector stays the single source of truth for column placement. Zero new metadata, zero migration, and the board can never disagree with the CLI views.
- Option B (deferred): an explicit board-status field (for example a `board:` frontmatter key or sidecar) that the collector prefers over derived signals. Simpler writes per move, but it forks column truth, needs a schema plus migration of existing specs, and requires every writer to adopt it.
- Decision: ship A. Revisit B only if the derived-signal writes prove too indirect in practice.

### Sprint entry: track-only vs board-created run directories

- Option A (chosen): the board only ensures the index `[ ]` row and returns a typed notice when no run directory exists; the card enters Sprint once a workflow run starts. Deterministic and confined to index semantics the board already understands.
- Option B (rejected): the board scaffolds a minimal run directory so the card lands in Sprint immediately. That opens a second workflow-entry path with its own cleanup, `.runtime` residue, and commit-timing semantics (`commitPlanFilesOnlyAtStep8`), owned by the orchestrator — rejected.
- Decision: A.

### Staging and evidence-free Production: gate vs fabricate

- Option A (chosen): gate with typed `409`s. Staging has no writable signal (it is derived from ship records), and Production without delivery evidence would forge provenance.
- Option B (rejected): let the board write placeholder ship records or un-evidenced `[x]` rows so every drop "succeeds". Fabricated provenance is worse than a refused drop — rejected.
- Decision: A. A writable ready-for-ship signal, if the workflow ever defines one, is the fast follow that unlocks board entry to Staging.

### Refresh: refetch vs optimistic placement

- Option A (chosen): refetch `/api/board` after each move and render the recomputed columns. The server recompute is the truth the CLIs share.
- Option B (deferred): move the card locally first, reconcile later. Snappier, but it can visibly disagree with recompute (for example track-only Sprint still reading Backlog) and needs rollback UX for `409`s.
- Decision: A. Optimistic UI stays deferred until a move exists whose recompute is always immediate.

### Abandoned write: status flip vs archive row

- Option A (chosen): flip plan status to `cancelled` when a state file exists, else append an Archive-table row in the collector vocabulary. Covers runless specs without inventing plan files.
- Option B (deferred): always write the Archive row and leave plan state alone. Simpler, but splits one user gesture across two truth sources when a plan exists.
- Decision: ship the conditional write; unify only if teams report confusion.

## Deferred Ideas

- Board entry to Staging once a writable ready-for-ship signal exists in the workflow contract.
- Positional ordering of cards within a column (needs an order store; columns are currently sets).
- Label-based sprint roster (carried over from the v1 companion).
- Swimlanes by phase or owner once specs carry that metadata.
- Optional `--open` flag to launch the browser on start (carried over from v1).
