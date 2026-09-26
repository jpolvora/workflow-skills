---
id: null
slug: skill-loader-host-capability
title: "skillLoader host capability and unified skill-load procedure"
source: local
specDate: 2026-09-26
---

# Specification — skillLoader host capability and unified skill-load procedure

## Description

The harness auto-detects host tools through the neutral host-capabilities mechanism: seven capability tokens (`readFile`, `writeFile`, `editFile`, `shellExec`, `dispatchAgent`, `askQuestion`, `browserVerify`) resolved per `hostId::orchestratorModel` key via `probe_host_capabilities.cjs`, the static pre-map `host-tool-map.json`, and the consumer-local cache `{sharedDir}/host-capabilities.json`. There is no token for loading skill bodies, so every skill phrases "load another skill / check whether it is already loaded" differently — direct `Read` of `SKILL.md` paths, relative Markdown links, progressive-disclosure prose, and already-loaded anti-patterns — with no canonical procedure and no harness enforcement.

This spec adds an eighth capability token, `skillLoader`, to the host-capabilities vocabulary with the same probe-once/cache-query-first semantics as the existing tokens: at skill-load time the agent queries the cached entry for the current session key; when `skillLoader` is bound to a host-native skill loader tool the agent uses it (including its already-loaded query when exposed); when it resolves to `none` the agent falls back to reading `{skillsRoot}/ws-<id>/SKILL.md` through `{readFile}` under the existing local-first/global resolution. It then sweeps all shipped skill bodies and hub/harness docs for divergent skill-load wordings, migrates every hit to one canonical procedure owned by a single normative doc, and adds harness enforcement so future divergent recipes fail the gate.

System boundaries: `ws-shared` runtime capability vocabulary (`host-capability-tokens.md`, `host-tool-map.json`, `probe_host_capabilities.cjs`, `host-dispatch.md`, `tools.md`), hub/harness docs that phrase skill loading (`AGENTS.md`, `{sharedDir}/AGENTS.md`, `autoload.md`), all shipped `ws-*` skill bodies, and `ws-check-harness` gates plus regression tests. No dispatch-tier, user-gate, or autoload-set behavior changes.

## Acceptance Criteria

- AC1: `skillLoader` is registered in the canonical capability vocabulary table and in the pre-map `tokens` array, and the unknown-host minimal set resolves it to `none` without failing startup.
- AC2: The probe script accepts `--declare skillLoader=<name>` as a capability token, persists it under `capabilities.skillLoader` and `declared.skillLoader` for the current key only, preserves all other keys, and keeps the prior declaration across a `--refresh` that omits re-declare.
- AC3: Every host shape in the static pre-map carries a `skillLoader` entry and resolution follows declared-over-pre-map-over-minimal precedence for the new token exactly as for existing tokens.
- AC4: Skill loading queries the cached host-capabilities entry for the current session key first (miss probes once, then re-reads), uses the bound native loader when `skillLoader` is bound, otherwise reads `{skillsRoot}/ws-<id>/SKILL.md` via `{readFile}` with local-first/global fallback, and neither path names host products.
- AC5: Before loading, the agent checks already-loaded state through the bound loader query when exposed (else session already-read tracking), never re-reads a skill loaded this session, and records the check so duplicate loads are auditable.
- AC6: The implementation sweep covers every shipped skill body plus hub and harness docs, reports a file-plus-wording inventory with zero unclassified hits, and migrates each hit to the canonical procedure or exempts it with a stated reason.
- AC7: The canonical skill-load procedure lives in exactly one normative doc and every other skill or hub reference delegates to it by link instead of restating steps.
- AC8: The harness gate fails a shipped skill body containing a divergent raw skill-load recipe while passing the canonical doc, informational mentions, and migrated bodies, with positive and negative fixtures proving both directions.
- AC9: A missing or unreadable cache behaves as a miss that probes once and degrades to the minimal set, an unknown host shape resolves skillLoader to `none` with `knownShape: false`, cache upserts preserve other keys, and the probe exits 0 in every degrade path.
- AC10: SkillLoader bind resolution is logged per run with hit-or-probe plus the resolved value so the skill-load path is auditable from telemetry.

## Original Issue Context

Free-text request (source local): add a `skillLoader` tool to the auto-detected host capabilities that checks whether the running harness exposes a skill loader tool and otherwise defaults to reading `SKILL.md` files; make skills use it when loading other skills or checking already-loaded state; scan all current skills for skill-load/read wordings and unify them on the canonical host-capability procedure.

### Prior Work Sweep

- Keyword sweep over `.agents/skills` for skillLoader, skill loader, and skill-loader variants: no existing token or loader procedure; only the seven established tokens appear.
- `git log` over `host-capability-tokens.md`, `host-tool-map.json`, `probe_host_capabilities.cjs`, and `host-dispatch.md`: origin work under us-348 (probe, declare, pre-map, precedence) plus us-351 hub relocation; no prior skillLoader attempt.
- `providers.scm` is github but no title-keyword PR matches this work; no exact same-issue open PR exists, so the run continues without a stop-or-reuse gate.

### Design Intent

Greenfield enhancement: no prior skillLoader behavior exists to preserve, so no `git log -S/-L` symbol hunt applies. The binding-alias-vs-token declare rule from MEMORY (2026-09-21 host capability trap) is intentional and reused by AC2 rather than relitigated.

## Notes

- Files expected to change: `host-capability-tokens.md` (eighth token row), `host-tool-map.json` (`tokens` plus per-shape entries), `probe_host_capabilities.cjs` (`TOKENS`, `MINIMAL`, declare path), `host-dispatch.md` (cache-entry schema), `tools.md` (token list and skill-load section), hub docs and every `ws-*` body carrying load wording, one `ws-check-harness` gate script, and regression tests.
- Implementation must run the skill dependency-graph check (`bin/skill-dependencies.json`) for callers and callees of the touched skills and regenerate integrity (`generate-integrity` plus `verify-integrity`) in the same change, since skill bodies and runtime docs are hashed content.
- Keep the normative procedure out of the SoT consumer hub (`ws-shared/runtime/AGENTS.md`, 14KB budget); home it in `host-capability-tokens.md` or `tools.md` and link from elsewhere.
- No gray area detected: the token name is fixed by the request and the canonical-doc home is an implementation choice with one documented answer, so no `.context.md` companion is written.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New host-product pre-map entries beyond the existing shape list | Shape coverage stays additive through `--declare`; new vendor shapes ship separately |
| Dispatch-tier or user-gate binding changes | skillLoader is load-only; dispatch tiers and gate semantics stay untouched |
| Autoload-set expansion | Only the load mechanism unifies; which skills autoload is unchanged |
| Global-tree writes from this package root | Forbidden by the existing upstream rule; verification uses local tests only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Capability token name | `skillLoader` (`{skillLoader}` in prose) | Matches the camelCase token style and the requested name | y |
| Binding alias schema | Unchanged four dispatch aliases; skillLoader lives in `capabilities` only | Loading is not dispatch; avoids binding-schema churn | y |
| Fallback read path | `{skillsRoot}/ws-<id>/SKILL.md` via `{readFile}`, local-first then global | Reuses the existing resolution contract | y |
| Absent implicit dimensions (auth and rate limits, concurrency and ordering, data lifecycle and expiry, external-dependency failure, state-transition integrity) | N/A because skill loading is a local read-only lookup with no auth surface, no shared mutable state, no TTL data, no external calls, and no state machine | Bounds scope; present dimensions are ACs (input validation in AC2, failure plus partial-failure with idempotent probe-once in AC9, observability in AC10) | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Token, probe, pre-map, canonical procedure, sweep, and gate only | Out of Scope table holds; plan file list matches |
| Atomic criteria | Every AC carries one pass-or-fail signal | AC1 through AC10 each tested by one focused check |
| Failure modes defined | Cache-miss, unknown-host, and invalid-declare paths specified | AC9 plus Negative and Failing Test Scenarios |
| Observation telemetry | Bind and load resolution is loggable per run | AC10 plus Telemetry and Observable Signals |
| Stack invariants (typescript-node) | Declare validated against the token allowlist, SKILL.md reads contained to package roots, no floating promises, file handles closed | scan_stack_invariants.cjs --stack typescript-node and the review checklist |
| Zero open blockers | Token name and single-home procedure decided | Assumptions Confirmed column all y |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `host-capability-bind | {json} | {hit|probe} | ISO` step-telemetry line extended with the resolved skillLoader value (AC10).
- `node {skillsRoot}/ws-shared/runtime/scripts/probe_host_capabilities.cjs --key <hostId::model> --json` prints `capabilities.skillLoader` for the session key (AC2, AC3).
- `ws-check-harness` skill-load gate reports zero findings on a migrated tree and names offending files otherwise (AC8).
- Per-load already-loaded checks emit a `skill-load | {id} | {loaded|read} | ISO` record in step telemetry (AC5).

### Negative & Failing Test Scenarios

- Probe with `--declare subagentTool=x` (a binding alias, not a token) leaves `capabilities` unchanged and the load path falls back (AC2).
- Probe for an unknown host shape resolves skillLoader to `none` with `knownShape: false` and exit 0 (AC9).
- Missing or unreadable cache file triggers exactly one probe, degrades to the minimal set, and startup still succeeds (AC9).
- Skill id containing traversal (`../`) is refused fail-closed instead of reading outside package roots (typescript-node path containment).
- Harness fixture with a divergent raw load recipe fails the gate while the canonical-procedure fixture passes (AC8).
