# `kanvas-board` context — gray areas and deferred ideas

Companion to `0130-kanvas-board.spec.md`. No empty sections; each item ends in a pinned decision or an explicit deferral.

## Feature Boundary

The board is a read-only lens over specs, plans, and the index. It defines no new workflow, writes no files, and owns no state of its own. Anything that changes spec/plan/index content stays in the skills that own those files.

## Implementation Decisions

### Sprint membership: derived signals vs labels

- Option A (chosen): Sprint = tracked `[ ] todo` + run directory exists. Deterministic, zero new metadata, computable from disk today.
- Option B (deferred): an explicit sprint roster (e.g. `Sprint:` frontmatter field or label). Richer curation but requires a writer, a schema change, and migration of existing specs.
- Decision: ship A. Revisit B only if teams report the derived rule misplaces cards in practice.

### Refresh: per-request recompute vs watcher

- Option A (chosen): recompute on each request + manual refresh button. Stateless, no file watchers, no cache-invalidation bugs.
- Option B (deferred): `fs.watch`-driven live reload. Nicer UX but adds flakiness surface (watcher limits, partial writes) for a local tool.
- Decision: ship A. Live reload is a fast follow only on request.

### Page delivery: self-contained HTML vs build step

- Self-contained `board.html` (inline CSS/JS, `fetch` to JSON endpoints) is chosen so the feature adds no build, no bundler, and no new devDependency. A built frontend would contradict the stdlib-only constraint.

### Delivery vehicle: packaged skill vs loose upstream scripts

- Option A (chosen): ship as `ws-kanvas` through the existing skill package/install/integrity machinery. Consumers get project-local and global installs, hash verification, and dependency-graph registration for free; upstream `npm run kanvas` dogfoods the same tree.
- Option B (rejected): loose `scripts/kanvas/` authoring utilities. Not packed (`package.json` files allowlist), not installed to consumers, invisible to integrity — a second distribution path for one feature.
- Decision: A. The normative layout lives under `.agents/skills/ws-kanvas/`.

## Deferred Ideas

- Label-based sprint roster (see above).
- Swimlanes by phase or owner once specs carry that metadata.
- Export board snapshot to `{plansDir}/kanvas-*.json` for reviews (would create plan artifacts — needs owning skill).
- Optional `--open` flag to launch the browser on start.
