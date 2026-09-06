---
id: null
slug: ws-shared-hub-agents-separation
title: "Separate consumer ws-shared hub from upstream root AGENTS.md"
source: local
specDate: 2026-09-06
---

# Specification — Separate consumer ws-shared hub from upstream root AGENTS.md

## Description

### Problem

Agents working in the `workflow-skills` upstream package or in consumer installs routinely **conflate** two distinct harness documents:

| Document | Path | Intended audience | Role |
|----------|------|-------------------|------|
| **Upstream authoring hub** | Repo-root `AGENTS.md` | Agents in `jpolvora/workflow-skills` source only | Skill SoT, upstream session contract (dogfood), global-vs-local invoke rules, harness change protocol, upstream developer workflow, progressive-disclosure router for authoring |
| **Consumer shared hub** | `{sharedDir}/AGENTS.md` (`.agents/skills/ws-shared/AGENTS.md`) | Every installed consumer project | Config resolution, gates, skill loading defaults, consumer task router, consumer-owned paths, managed-skill policy |

Today `ws-shared/AGENTS.md` still embeds upstream-only concepts (Skill SoT pointers, dogfood session-contract notes, upstream maintainer checklist stubs, `jpolvora/workflow-skills` naming) that belong exclusively in root `AGENTS.md`. That overlap causes agents to treat the **shipped consumer hub** as the upstream authoring contract, and to load or edit the wrong file during harness work.

Related hub companions under `ws-shared/` (`CATALOG.md`, `setup.md`, parts of `autoload.md`) also reference root `AGENTS.md` sections or duplicate upstream inventory with `../../../` paths, reinforcing the confusion.

### Root cause

Historical consolidation (spec `0010-remove-consumer-agents-md-requirement`) correctly made `ws-shared/AGENTS.md` the **consumer** SoT, but upstream authoring obligations were never fully **relocated** to root `AGENTS.md`. Subsequent dual-hub features (`0013-shared-autoload-md`, `0036-harness-efficiency-and-verifiability` AC1–AC2) trimmed size without completing a semantic split. A recent context-budget fix (`6217bc95`) moved the upstream maintainer ship checklist to root pointers only — partial progress, not a full audit.

### Solution

Audit every **managed hub template** under `.agents/skills/ws-shared/` (files shipped by installer `HUB_WHITELIST`; exclude consumer-owned `config.json`, `MEMORY.md`, `memory/*`, `CHANGELOG.md`, `STACK.md`, `installed-skills.json`). For each file:

1. **Classify** each section as `consumer-portable`, `upstream-only`, or `shared-reference` (portable contract both hubs may cite once, with consumer hub linking to root for upstream detail).
2. **Relocate** all `upstream-only` prose to root `AGENTS.md` (or root `CATALOG.md` when the content is inventory / before-ship tables already split per `0036` AC1).
3. **Rewrite** `ws-shared/AGENTS.md` opening banner and doc-roles table so agents cannot mistake it for root `AGENTS.md` — explicit "you are in the consumer hub" identity, one-line pointer to optional consumer root `AGENTS.md` override, and **no** upstream authoring/session-contract paragraphs.
4. **Deduplicate** `ws-shared/CATALOG.md` vs root `CATALOG.md`: consumer copy keeps only consumer task-router rows and external-dependencies mirror; upstream-only layers (upstream developer workflow, integrity ship rows, FEATURES pointers) stay in root `CATALOG.md` only.
5. **Update** `ws-check-harness` dual-hub drift rules and `test/test-context-budget.js` (or equivalent) so the split is enforced mechanically.
6. **Sync** cross-links in skills that say "hub: AGENTS.md" to name the correct hub per context (`rules.harness` → consumer; upstream tasks → root).

### Architectural touchpoints

- Installer hub whitelist (`bin/install-rules.js` → `HUB_WHITELIST`)
- Root `AGENTS.md` § Doc roles, § Harness change protocol, § Upstream developer workflow
- `ws-shared/AGENTS.md`, `ws-shared/CATALOG.md`, `ws-shared/setup.md`, `ws-shared/autoload.md`
- `ws-check-harness` Phase 0 hub resolution and dual-hub drift (`PHASES.md`)
- `config.json` → `rules.harness` (default `{sharedDir}/AGENTS.md`)
- Context budget test (`test/test-context-budget.js` or successor)

## Acceptance Criteria

- AC1: `ws-shared/AGENTS.md` opens with an explicit Consumer hub identity banner that names the file as the installed consumer hub, not repo-root `AGENTS.md`, and points upstream authoring work at root `AGENTS.md`.
- AC2: Zero paragraphs in `ws-shared/AGENTS.md` instruct upstream-only workflows (Skill SoT authoring, global-vs-local invoke tie-break, inlined dogfood session contract, version bump, integrity regenerate, FEATURES sync, hub-sync maintainer checklist). Each relocated topic exists in root `AGENTS.md` or root `CATALOG.md` § Upstream developer workflow / Before ship PR.
- AC3: `ws-shared/AGENTS.md` retains all **consumer-portable** obligations: config & tools table, consumer-owned files, mandatory skill-loading table (`ws-karpathy-guidelines`, `ws-changelog`, `ws-self-learning`), consumer root override / dual-hub precedence (pointing at optional repo-root `AGENTS.md` + `autoload.md`), specs progressive disclosure, hub contracts, task router, managed-skills policy, cross-platform runtime, consumer Feature Delivery Checklist, skill discovery, external dependencies (via `ws-shared/CATALOG.md`).
- AC4: `ws-shared/CATALOG.md` contains no upstream-only sections (Before ship PR maintainer table, upstream developer workflow prose, `bin/skill-integrity` ship steps). Consumer task router and external-dependencies mirror remain. Root `CATALOG.md` remains the upstream authoring inventory SoT.
- AC5: `ws-shared/setup.md` and `ws-shared/autoload.md` link to root `AGENTS.md` only for upstream authoring context (`../../../AGENTS.md` or equivalent) and never present root hub content inline. Consumer agents reading only `ws-shared/*` are not told to apply upstream session contract or global-vs-local invoke rules.
- AC6: Root `AGENTS.md` § Doc roles table explicitly contrasts root vs `{sharedDir}/AGENTS.md` with a "do not confuse" row and lists which skills/harness checks load which hub in upstream vs consumer mode.
- AC7: `ws-check-harness` upstream mode flags **critical** when `ws-shared/AGENTS.md` contains any string from a maintained denylist of upstream-only phrases (e.g. `Upstream session contract`, `Global vs local`, `generate-integrity`, `build-site:bump`, `this repo only — mandatory` for authoring). Consumer mode does not require root `AGENTS.md`.
- AC8: `ws-check-harness` dual-hub drift check passes when root and `ws-shared` hubs differ **intentionally** per this spec (consumer on-demand defaults vs upstream dogfood autoload) and fails when `ws-shared/AGENTS.md` reintroduces upstream authoring sections duplicated in root.
- AC9: `test/test-context-budget.js` (or documented successor) continues to pass: `ws-shared/AGENTS.md` ≤ 14,000 B after the semantic split (size cap is necessary but not sufficient — AC7 enforces content).
- AC10: `npm run test` and `ws-check-harness` report 0 critical findings after the refactor; hub cross-links in `ws-spec-format`, `ws-show-harness`, and `ws-check-harness` SKILL bodies name the correct hub per upstream vs consumer mode.
- AC11: Installer `HUB_WHITELIST` behavior unchanged for consumer-owned paths; fresh install/update still copies trimmed `ws-shared/AGENTS.md` without writing consumer repo-root `AGENTS.md`.
- AC12: A consumer-only tree without repo-root `AGENTS.md` resolves harness questions to `{sharedDir}/AGENTS.md` only and does not surface upstream Skill SoT or global-vs-local invoke rules from the shared hub.

## Original Issue Context

### Prior Work Sweep

| Item | Finding |
|------|---------|
| Spec `0010-remove-consumer-agents-md-requirement` | Established `ws-shared/AGENTS.md` as consumer SoT; removed `.agents/AGENTS.md` requirement |
| Spec `0013-shared-autoload-md` | Consumer root `AGENTS.md` optional override via `autoload.md`; dual-hub precedence documented |
| Spec `0036-harness-efficiency-and-verifiability` AC1–AC2 | Moved skill catalog to `CATALOG.md`; byte cap on `ws-shared/AGENTS.md` |
| Commit `6217bc95` | Trimmed upstream maintainer checklist from `ws-shared/AGENTS.md` to fix context budget CI |
| `ws-check-harness` PHASES.md | Already distinguishes upstream vs consumer hub resolution; needs denylist enforcement (AC7) |
| Open PRs for same tracker id | None found (local spec, `source: local`) |

### Design Intent

The dual-hub model is **intentional**: consumers get a portable hub under `ws-shared/`; the upstream repo keeps a richer root hub for authoring. The defect is **content leakage** across hubs, not the existence of two files. Do not collapse back to a single monolithic hub or re-require consumer repo-root `AGENTS.md`.

## Notes

- **In scope:** Managed hub templates under `.agents/skills/ws-shared/` listed in installer whitelist (`.md` hubs, `*.example`, `*.template`, `skill-dependencies.json` upstream block wording, scripts only where they embed hub prose).
- **Out of scope:** Consumer-owned hub data (`config.json`, `MEMORY.md`, `memory/*`, `CHANGELOG.md`, `STACK.md`, `installed-skills.json`); skill `SKILL.md` bodies except cross-link fixes; website/docs rebuild (follow harness change protocol in same PR).
- **Repo:** `jpolvora/workflow-skills`
- **Related:** `0036-harness-efficiency-and-verifiability`, `0010-remove-consumer-agents-md-requirement`, `0013-shared-autoload-md`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merging root and `ws-shared` into one AGENTS file | Breaks consumer install contract and portability |
| Requiring consumer repo-root `AGENTS.md` | Explicitly removed by spec 0010 |
| Rewriting skill bodies for context budget | Separate ongoing work; this spec is hub-doc separation only |
| Changing `rules.harness` default path | Stays `{sharedDir}/AGENTS.md` for consumers |
| Moving `autoload.md` Always-applied set | Consumer feature; stays in `ws-shared` |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Byte cap for `ws-shared/AGENTS.md` | Keep ≤ 14,000 B per `0036` AC2 | CI context-budget test already enforces | y |
| `ws-shared/CATALOG.md` remains shipped | Yes — consumer on-demand inventory | Consumers without repo root need task router | y |
| Upstream denylist maintenance | `ws-check-harness` script or inline list in PHASES.md | Mechanical enforcement beats manual review | y |
| Auth / rate limits / concurrency | N/A because docs-only refactor | No runtime API surface | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Hub template files only; listed ACs | Spec AC1–AC12 cover files and checks |
| Atomic criteria | Each AC is pass/fail without judgment calls | Review AC wording |
| Failure modes | Denylist false positives documented in harness | AC7 + negative AC12 |
| Observation telemetry | `ws-check-harness`, `npm run test`, context-budget test | AC9–AC10 |
| Zero open blockers | Prior specs 0010/0013/0036 shipped | Prior work sweep |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node test/test-context-budget.js` — `ws-shared/AGENTS.md` byte size ≤ 14000
- `npm run test` — full package test suite exit 0
- `ws-check-harness` (upstream mode) — 0 critical; denylist scan pass (AC7)
- `git diff --stat AGENTS.md .agents/skills/ws-shared/` — upstream content moves root-ward, consumer hub shrinks semantically
- Grep: `rg "Upstream session contract|Global vs local|build-site:bump" .agents/skills/ws-shared/AGENTS.md` → no matches post-implementation

### Negative & Failing Test Scenarios

- **Fail:** `ws-shared/AGENTS.md` still contains "Upstream Maintainers" checklist body (not a one-line pointer). Relocation incomplete.
- **Fail:** Consumer tree with only `{sharedDir}/AGENTS.md` loaded; agent cites root-only "Global vs local `ws-*`" rules. Hub confusion not fixed (AC12).
- **Fail:** `ws-check-harness` upstream mode passes while `ws-shared/AGENTS.md` contains `generate-integrity` instructions. Denylist not wired (AC7).
- **Fail:** `test-context-budget` exceeds 14000 B after adding new upstream paragraphs to consumer hub. Size regression.
