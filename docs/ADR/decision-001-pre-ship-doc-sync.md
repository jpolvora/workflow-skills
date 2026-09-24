# Decision 001 — Pre-ship doc-sync gate (DRAFT)

Status: **Draft** (not accepted; acceptance requires explicit user sign-off).

## Context

`ws-spec-to-pr` (standard) documents `ws-wiki sync` as "offered, not mandatory"
(`STEP-DISPATCH.md:152`); `ws-spec-to-pr-lite` carries it inline in its steps
table; root `AGENTS.md` (Dual-mode close bullet) now requires wiki sync
pre-ship. The three surfaces disagree in strength and placement.

## Settled

- D1 — Scope: one config flag governs the whole pre-ship doc-sync trio
  (`ws-wiki sync` + `ws-spec-index sync` + changelog entry), not wiki alone
  and not three separate flags. Reason: the three already travel together in
  both orchs' close rows; one GUI binding keeps the change cheap.
- D2 — Record location: durable decisions live under `docs/ADR/` as
  `decision-xxx-<slug>.md`, starting with this file.

## Settled (continued)

- D3 — Flag: `defaults.requirePreShipDocSync`, boolean, default `true`.
  Reason: `defaults` already holds behavioral gates (`minVerifyScore`,
  `autoload`, `enableDag`); one GUI checkbox; default on matches the hub
  required-step intent.

## Open

- O2 — Enforcement when the wiki is absent/unconfigured: fail, warn-skip,
  or silent skip.
- O3 — Gate vs documentation: hard gate in orch close logic or documented
  required step only.
- O4 — Artifact boundary for the implementing change (skill bodies, schema,
  example, GUI editor, tests, integrity regen).
