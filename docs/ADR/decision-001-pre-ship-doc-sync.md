# Decision 001 — Pre-ship doc-sync gate (DRAFT)

Status: **Final** (accepted by owner on 2026-09-24).

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

## Settled (continued)

- D4 — Wiki absent/unconfigured with flag on: warn-and-skip the wiki leg
  (visible warning in close output), index-sync and changelog legs still
  required. Reason: must not block ships for consumers who never adopted
  `ws-wiki`; silent skip would hide staleness.

## Settled (continued)

- D5 — Enforcement: gate-enforced close step. Both orchs block the ship
  phase until the trio legs complete (or the wiki leg warn-skips),
  honoring the flag. Reason: documentation-only "required" repeats the
  offered-not-mandatory drift being fixed.

## Settled (continued)

- D6 — Flag off restores exactly today's behavior (standard:
  offered-not-mandatory; lite: inline doc sync; index/changelog as today).
  Reason: zero regression risk for consumers who opt out.

## Open

- None. Pending explicit acceptance to flip Draft → Final.
- O3 — Gate vs documentation: hard gate in orch close logic or documented
  required step only.
- O4 — Artifact boundary for the implementing change (skill bodies, schema,
  example, GUI editor, tests, integrity regen).
