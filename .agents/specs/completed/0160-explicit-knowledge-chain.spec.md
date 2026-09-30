---
id: null
slug: explicit-knowledge-chain
title: "Explicit knowledge chain in research guidance"
source: local
specDate: 2026-09-30
---

# Specification — Explicit knowledge chain in research guidance

## Description

Investigative skills (`ws-fable-method` Step 2 Evidence, `ws-fable-judge` audits) direct agents toward primary sources and honest caveats, but the source order and anti-fabrication rules live only as implicit conventions: nothing names the chain to walk, nothing requires per-claim sourcing, and nothing forbids presenting inference as observed fact beyond a general honesty note. Under pressure, agents cite from memory, skip the codebase for the web, and dress guesses as findings.

This spec adopts an explicit knowledge chain in research guidance: for every factual claim, walk codebase first, then project docs, then MCP-provided sources, then the web, and flag the claim uncertain when no chain source grounds it. Anti-fabrication rules become explicit skill prose: never invent APIs, paths, numbers, or tool output; state gaps when the lookup budget is spent; mark every inference as inference. The report step emits a per-claim source table, and `ws-fable-judge` audits check chain compliance alongside verdicts.

## Acceptance Criteria

- AC1: Research guidance defines the ordered knowledge chain codebase, then project docs, then MCP sources, then web, with earlier links preferred over later ones.
- AC2: Every factual claim in findings cites the chain link that grounds it with a path, document, or URL reference.
- AC3: Claims with no grounding chain source carry an explicit uncertain flag and are never presented as observed fact.
- AC4: Anti-fabrication rules explicitly forbid inventing APIs, paths, numbers, versions, or tool output, and require stating gaps when the lookup budget is spent.
- AC5: The report step emits a per-claim source table carrying claim, chain link, reference, and uncertain marker.
- AC6: `ws-fable-judge` audits check chain compliance and flag unsourced or mis-sourced claims in the verdict.
- AC7: The existing max-2 lookup rounds budget is preserved; the chain orders lookups without adding rounds.
- AC8: `ws-fable-method` and `ws-fable-judge` skill prose carry the chain, the flag, and the anti-fabrication rules verbatim-testable by grep.

## Original Issue Context

Free-text request: adopt an explicit knowledge chain (codebase, docs, MCP, web, flag uncertain) in research guidance, since anti-fabrication rules are currently implicit.

### Prior Work Sweep

- Keyword and git sweep on `knowledge chain`, `anti-fabrication`, `flag uncertain`, `primary sources`: `ws-fable-method` Step 2 orders orient, then primary sources, then parallel lookups with max 2 rounds then state gaps, and Step 6 reports outcome first with honest caveats; no ordered chain, per-claim sourcing, or explicit fabrication ban exists.
- `ws-fable-judge` emits audit verdicts consumed by the ship gate; no sourcing-compliance check exists.
- No open PR covers a knowledge chain; nearest closed work is the fable-method and fable-judge deliveries.

### Design Intent

- Convention made explicit, not a bug restore: the implicit primary-sources-first habit was designed into the loop deliberately, and no prior version enforced a named chain, so `git log -S` shows intentional lightness rather than a removed rule.

## Notes

- Dependencies: `ws-fable-method/SKILL.md` (Evidence, Verify, Report steps), `ws-fable-judge/SKILL.md` (audit checklist, verdict shape), upstream `AGENTS.md` session contract (dogfood mirror of the loop).
- MCP links cover only configured, reachable MCP servers; an unreachable server is a stated gap, not a skipped link.
- The uncertain flag uses one fixed marker word so judges and grep checks match deterministically.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated claim extraction tooling | Sourcing is a prose discipline checked by judges, not a parser |
| Web-search vendor requirements | The web link uses whatever search surface the host provides |
| Changing the lookup round budget | Max 2 rounds stays; only ordering and flagging are added |
| Pipeline orchestrator research steps | Only the fable research skills change, not spec-to-pr steps |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Chain order | Codebase, docs, MCP, web | Closest-to-ground-truth first, most volatile last | y |
| Claim granularity | One table row per factual claim | Fine enough to audit, coarse enough to write by hand | y |
| Uncertain marker | One fixed marker word across method and judge | Deterministic matching for judges and grep checks | y |
| Unreachable MCP | Stated gap, not a skipped link | Preserves chain honesty when servers are down | y |
| Judge enforcement | Sourcing flags ride the existing verdict | No new gate; flags inform the existing audit outcome | y |
| Auth, rate limits, external dependencies | N/A because the change is skill prose with no new calls | No caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Chain, sourcing, flag, fabrication ban, report table, judge check only | AC1 through AC8 each map to one behavior |
| Atomic criteria | Each AC names a prose rule, table, or grep check | Review AC list against the skill files |
| Failure modes | Unsourced claim, skipped link, invented fact named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Skill prose and judge verdicts named | Telemetry section lists exact files and checks |
| Zero open blockers | Order, granularity, marker, gaps, and enforcement decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `ws-fable-method/SKILL.md` and `ws-fable-judge/SKILL.md` contain the chain order, the uncertain marker, and the anti-fabrication rules verifiable by grep.
- Finding reports carry a per-claim source table with chain link, reference, and uncertain marker.
- Judge verdicts flag unsourced or mis-sourced claims where present.
- `npm run test` stays green; no behavior tests change since only skill prose changes.

### Negative & Failing Test Scenarios

- A finding with an unsourced factual claim and no uncertain flag fails the judge sourcing check.
- A claim citing the web when the codebase grounds it is flagged as a skipped-link violation.
- An invented API path with no chain reference fails the anti-fabrication check instead of passing as a finding.
- A report without the per-claim source table is returned for completion before the audit counts.
