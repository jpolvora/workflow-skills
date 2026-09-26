# Context — pre-ship documentation-sync gate

Companion to [`0129-pre-ship-doc-sync.spec.md`](0129-pre-ship-doc-sync.spec.md). Records the gray area where more than one implementation could satisfy the settled decision (ADR D1–D6) without changing product behavior.

## Feature Boundary

In scope: one `defaults.requirePreShipDocSync` switch, the gate-enforced close step in `ws-spec-to-pr` (Step 8) and `ws-spec-to-pr-lite` (Step 4), schema/example/GUI parity, a regression test, hub doc reconciliation, and integrity regeneration.

Out of scope: per-leg flags, changes to `ws-wiki` / `ws-spec-index` / `ws-changelog` semantics, wiki auto-provisioning, and consumer `config.json` migration.

## Implementation Decisions

- **Enforcement surface.** Two viable mechanisms: (a) prose gate written directly into both orchs' close rows, or (b) a shared helper (e.g. `ws-shared/runtime/scripts/*.cjs`) that both orchs call and that returns structured `{wiki, index, changelog}` leg status plus a warn-skip reason. Chosen default: start with the **orch close-row contract** (a) because both orchs already own their close ordering and the trio is a sequencing rule, not a computation; escalate to (b) only if test assertions on prose prove brittle.
- **Wiki-absent signal.** Reuse the existing `plans.wikiDir` existence check already named for the wiki leg, so the warn-skip path has one source of truth. Do not introduce a second "has wiki" probe.
- **Bypass posture.** Honor `skipQualityGates` as a global gate bypass (logged), matching every other gate; do not add a dedicated flag.
- **Structured leg telemetry.** Record each leg outcome (`ran | skipped:<reason>`) in the close output so AC6 and AC10 are assertable without re-parsing skill prose.

## Deferred Ideas

- A shared `pre_ship_doc_sync.cjs` helper if prose-gate assertions prove brittle.
- Surfacing the trio result on the Step 8 progress board as a named status row.
- Generalizing the flag to govern other post-close sync legs if additional ones are added later.
