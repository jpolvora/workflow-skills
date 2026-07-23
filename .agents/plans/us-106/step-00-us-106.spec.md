---
id: 106
slug: us-106
title: "check-harness: residual AGENTS.md wording in report outline + DoD checklist after #103"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/106"
specDate: 2026-07-23
---

# Specification — check-harness: residual AGENTS.md wording in report outline + DoD checklist after #103

**State:** open

## Description

## Summary

Follow-up to #103 (closed / fixed in **0.0.73**). Re-verified in consumer test repo **jskills** after:

```bash
npx --yes github:jpolvora/workflow-skills --version   # → 0.0.73
npx --yes github:jpolvora/workflow-skills update --yes
```

## #103 verification — FIXED

| Item | Status in 0.0.73 |
|------|------------------|
| Out of scope link (was `../../../AGENTS.md`) | **Fixed** — now `shared/AGENTS.md` + § Hub resolution |
| Phase 4 heading | **Fixed** — "Skills/rules not routed in the **resolved hub**" |
| Phase 4 intro link | **Fixed** — points at `shared/AGENTS.md` (consumer) / root (upstream) |
| `check-workflows` | **PASS** (0 issues) |
| Hub broken links / unrouted skills / retired path ids | **0** |
| #101 consumer hub + checklist split + configure-project heuristic | Still good |

## Residual (this report)

`check-harness/SKILL.md` Phase 4 body was corrected, but two leftover phrases still hardcode bare `` `AGENTS.md` `` and can reintroduce the same consumer-mode confusion for agents following the report template / DoD checklist:

| Location | Current text | Problem |
|----------|--------------|---------|
| Output format § required sections, item **4** (~L672) | `Skills and rules not routed in \`AGENTS.md\`` | Should say **resolved hub** (match Phase 4 heading) |
| Quick checklist / DoD Step 1 (~L720) | `Phase 4 executed: filesystem ↔ \`AGENTS.md\` (+ packaged hub / …)` | Should say **resolved hub** (consumer: `shared/AGENTS.md`; upstream: root `AGENTS.md`) |

`REPORT-FORMAT.md` does not repeat these phrases (OK).

## Proposed fix

1. L672 → `Skills and rules not routed in the resolved hub`
2. L720 → `Phase 4 executed: filesystem ↔ resolved hub (§ Hub resolution; shared/AGENTS.md in consumer mode) (+ packaged hub / skill-dependencies.json when present) diff documented`

## Severity

**Suggestion** — no workflow breakage; pure doc consistency after #103.

## Repro

```bash
rg -n 'not routed in \`AGENTS\.md\`|filesystem ↔ \`AGENTS\.md\`' .agents/skills/check-harness/SKILL.md
```

**Test consumer:** jpolvora/jskills @ workflow-skills **0.0.73**

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Comments (audit)

- **jpolvora:** ### Additional residual in `REPORT-FORMAT.md`

Same leftover bare-`AGENTS.md` wording in the report template (not just `SKILL.md`):

| Location | Text |
|----------|------|
| `REPORT-FORMAT.md` ~L47 | `### Skills and rules not routed in AGENTS.md` |
| `REPORT-FORMAT.md` ~L57 | `Skills/rules on disk vs \`AGENTS.md\`` |

Please align those to **resolved hub** when fixing L672 / L720 in `SKILL.md`.

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
