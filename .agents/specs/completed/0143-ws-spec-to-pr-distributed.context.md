# Context — Separate Multi-CLI Step Baton into a Dedicated ws-spec-to-pr-distributed Workflow

Companion to [`0143-ws-spec-to-pr-distributed.spec.md`](0143-ws-spec-to-pr-distributed.spec.md). Captures the boundaries and the decisions behind the extraction so the implementation plan does not have to re-litigate them.

## Feature Boundary

- **In:** a new packaged workflow skill `ws-spec-to-pr-distributed` that owns the distributed execution layer — coordinator run loop, runner mapping/validation, baton claim/release/expiry, one-shot worker spawn, coordinator gate surfacing, and the baton-specific reference prose and tests.
- **Out:** the standard 0–9 FSM, step bodies, artifact names, gate vocabulary, model routing (`stepModels` / `modelPresets`), and the shared pipeline skills — these stay owned by `ws-spec-to-pr` and `ws-shared/runtime`.
- **In:** making `ws-spec-to-pr` lighter by removing the coordinator script, the baton run-config prose, and any dependency on the coordinator.
- **Out:** any change to baton protocol semantics, telemetry event names, monitor fields, or the same-machine/same-repo boundary from spec `0094`.

## Implementation Decisions

1. **Shape — thin layer, not a fork.** `ws-spec-to-pr-distributed` delegates every step to the existing shared step skills and reuses the standard step index and artifact names. It does not copy the FSM or step bodies. Rationale: one source of truth for steps, no drift; the extraction is behavior-preserving.
2. **Coordinator home.** `step_coordinator.cjs` moves to `ws-spec-to-pr-distributed/scripts/`; `ws-spec-to-pr/scripts/` keeps no distributed run loop.
3. **Shared primitive stays shared.** `step_baton.cjs` remains under `ws-shared/runtime/scripts/` as a neutral reusable primitive, required only by the distributed workflow; the dependency edge is recorded in both manifests.
4. **Config keys keep their names and location.** `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` stay as-is; only their reader/owner changes. No consumer migration, no rename, no alias.
5. **Prose ownership.** `host-dispatch.md` §7 and `gates.md` § "Coordinator gate surfacing (step baton)" are re-homed into the distributed skill (or its references); shared runtime files loaded by `ws-spec-to-pr` keep no coordinator-language surface beyond a cross-reference.
6. **Standard keeps a pointer only.** The `ws-spec-to-pr/SKILL.md` baton section becomes at most a two-line neutral pointer to the new skill; no legacy coordinator command remains.
7. **Invocation is explicit.** The new workflow runs only on `/spec-to-pr-distributed` or its skill id; classifier, `ws-spec-multi`, and routers do not auto-select it.
8. **Package and quality.** Register the new skill in both dependency manifests under `workflows`, update `test-suites.json` and the moved tests/fixtures, extend the `ws-check-workflows` FSM registry, regenerate integrity, bump the package version once, and sync all docs/router surfaces.
9. **Tracker link for auto-close.** The spec frontmatter carries `source: github` + `id: 438` (issue #438 is the recovery mirror) with the descriptive `slug: ws-spec-to-pr-distributed` preserved instead of the usual `us-{id}` slug. Rationale: `ws-ship-pr` skips PR-body auto-close when `id` is null or `source: local`, so a tracker link is required for the merge to close the issue; the descriptive slug keeps the spec-of-record identity (`0143-ws-spec-to-pr-distributed`) and the `index.PRD` row stable. The workflow should be started from the local spec file, not by re-fetching the issue, to avoid a duplicate `us-438` spec of record.

## Deferred Ideas

- Distributed variant of `ws-spec-to-pr-lite` (lite keeps its inline 0–5 path).
- Per-runner credential/auth provisioning and health checks.
- Multi-machine queues, brokers, or remote worker provisioning.
- Consumer-config-driven auto-selection of the distributed workflow.
- A shared "execution layer" abstraction that could host other non-single-host runners (e.g. remote CI) behind the same coordinator interface.
