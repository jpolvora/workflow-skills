---
id: null
slug: merge-karpathy-into-senior-developer
title: "Merge ws-karpathy-guidelines into ws-senior-developer"
source: local
specDate: 2026-09-16
status: completed
---

# Specification — Merge ws-karpathy-guidelines into ws-senior-developer

## Description

The harness ships two overlapping delivery skills: `ws-senior-developer` (scope control, ambiguity stops, pre-ship proof) and `ws-karpathy-guidelines` (surgical diff hygiene). Operators must discover both ids, installers must maintain duplicate dependency edges, and every `ws-*` skill body carries dual complement references. The overlap increases context budget and review surface without adding distinct behavior.

This spec consolidates surgical diff hygiene, delivery gates, and coding guardrails into `ws-senior-developer` as the single owner. The standalone `ws-karpathy-guidelines` skill folder is removed. Invocation aliases `karpathy-guidelines` and `ws-karpathy-guidelines` resolve to `ws-senior-developer`. All in-tree references, dependency manifests, config compatibility alias, hub docs, site, and tests are updated. Follow-up stale mentions (for example `ws-megabrain` frontmatter and Step 5 instruction) route to `ws-senior-developer` without naming the removed skill.

## Acceptance Criteria

- AC1: `ws-senior-developer` SKILL.md owns surgical diff hygiene plus delivery gate directives in one body.
- AC2: Standalone `ws-karpathy-guidelines` skill folder is absent from the package tree.
- AC3: Invocation aliases for the retired skill resolve to `ws-senior-developer`.
- AC4: Zero in-tree skill bodies link to the retired skill path.
- AC5: Dependency manifests list `ws-senior-developer` where the retired edge existed.
- AC6: Config compatibility alias `karpathyGuidelines` points at the `ws-senior-developer` body.
- AC7: Opt-out phrase for the retired skill disables `ws-senior-developer` for the session.
- AC8: Skill integrity manifest is regenerated after hashed skill bytes change.
- AC9: `ws-megabrain` routes surgical diffs to `ws-senior-developer` without retired skill naming.

## Notes

### Design Intent

The retired skill was introduced for micro diff hygiene. The observed harm is dual discovery, dual dependency edges, and duplicated complement prose across every pipeline skill. Product intent: keep one delivery gate with six core directives (assumptions, memory consult, simplicity, scope enclosure, surgical diffs, goal verification) plus pre-ship proof and subagent contract; preserve backward-compatible invocation and opt-out strings so existing prompts keep working.

- Retired id remains reserved as an alias, never as a separate installable package.
- Upstream root `AGENTS.md` session contract owns dogfood wording; consumers resolve via `rules.seniorDeveloper`.
- Language of skill bodies remains en-us.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing gate semantics (scope rules, proof checklist, subagent contract) | Consolidation only; behavior stays identical |
| New verification commands or quality gates | Owned by `config.json` verification aliases |
| Renaming `ws-senior-developer` id or config key | Backward compatibility for installed consumers |
| Migrating consumer-local prompt history or vault traps | Consumer-owned data; never rewritten by upstream |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Alias preservation scope | Keep both `karpathy-guidelines` and `ws-karpathy-guidelines` as invocation and opt-out aliases | Existing prompts and session transcripts reference both forms | y |
| Config key preservation | Keep `karpathyGuidelines` as compatibility alias pointing at senior-developer body | Consumers may set either key; removal would break configure-project | y |
| Input validation / rate limits / data lifecycle / concurrency | N/A because this is a static Markdown consolidation with manifest updates, not a networked runtime | Only grep, tests, and integrity outcomes are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `ws-senior-developer` body, retired folder removal, reference updates, manifests, config, hub docs, site, tests | Diff vs this spec ACs |
| Atomic criteria | AC1–AC9 each map to a named file and a grep or test check | Reviewer checklist |
| Failure modes | Retired path link remains; alias missing; manifest edge missing; integrity stale | AC4, AC3, AC5, AC8 |
| Observation telemetry | Grep counts for retired id; integrity check; targeted skill tests | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Markdown-only edits plus manifest JSON; no new runtime code; no shell recipe changes; no path-token violation | Code review plus harness checks |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Grep for `ws-karpathy-guidelines` in skill bodies returns only alias rows inside `ws-senior-developer` frontmatter and opt-out table.
- `npm run generate-integrity && npm run verify-integrity` passes after hashed skill bytes change.
- Targeted suites pass: install, hybrid consumer root, megabrain, harness benchmark guard.
- `docs/index.html` and `CATALOG.md` describe one delivery gate with retired alias noted.

### Negative & Failing Test Scenarios

- NS1: A skill body links to the retired `ws-karpathy-guidelines/SKILL.md` path instead of `ws-senior-developer` → **fail** AC4.
- NS2: Invocation with `/karpathy-guidelines` does not load the consolidated gate → **fail** AC3.
- NS3: Dependency graph omits the direct `ws-senior-developer` edge where the retired edge existed → **fail** AC5.
- NS4: Integrity manifest is stale after skill body edits → **fail** AC8.
- NS5: `ws-megabrain` names the retired skill in frontmatter or Step 5 instruction → **fail** AC9.
