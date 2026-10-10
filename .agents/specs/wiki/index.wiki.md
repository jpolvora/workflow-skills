# Project Living Feature Wiki & Domain Knowledge Base

## System Vision & Overview

`workflow-skills` is an LLM-agnostic, host-neutral skill package for spec-driven software delivery. Canonical `*.spec.md` files are the contract of record; plans, code, reviews, and pull requests are derived from them. Standard and lite orchestrators share one project `config.json`. Consumer config, STACK, MEMORY, and changelog stay local on install/update.

Primary use cases from `index.PRD`: end-to-end Spec-to-PR (standard or lite), sequential multi-spec queues, harness integrity audits, and opt-in adversarial verification.

## Architectural Boundaries

- **Harness & install**: Portable skill bodies under `.agents/skills/ws-*`, installer CLI, integrity hashes, hybrid global vs project-local install. Consumer hub `.ws/` holds config; managed `runtime/` and `templates/` stay installer-owned under `{skillsRoot}/ws-shared/`.
- **Delivery orchestrators**: `ws-spec-to-pr` (steps 0–9) and `ws-spec-to-pr-lite` (steps 0–5); `ws-spec-multi` classifies each spec and dispatches one pipeline at a time. Isolated `workflowType`; no cross-resume.
- **SCM providers**: GitHub, Azure DevOps, and local specs implement the same required intents; orchestrators never embed host CLI names.
- **Specs vs plans vs wiki**: Specs are point-in-time contracts. `{plansDir}` holds run artifacts. `index.PRD` tracks phases. `CHANGELOG.md` is chronological history. This wiki is the living domain knowledge base.
- **Quality gates**: Derived verify score (`defaults.minVerifyScore`, default 9), commit-before-review, adversarial review and fable audit, secrets scan, stack invariant scan.
- **Memory**: Local MEMORY files and/or spec-memo vault (`enableMemoryFiles` / `enableSpecMemoIntegration`). `ws-spec-memo` is setup/bridge; vault runtime is `ws-memo`.

## Domain Catalog

Living synthesis of specs 0001–0150. The delta since adds empty-alias verify skips (`us-446`, 0147), per-run batch state with legacy resume (`us-448`, 0148), the `ws-version` install snapshot (`us-455`, 0149), global-fallback skill resolution without junctions (`us-457`, 0150), durable dispatch prompt-audit pairs (0154), per-task test adequacy (0156), EARS-shaped criteria with closure finder (0157), fixed-model comparison publishing (0158), per-step dispatch context budgets (0159), the explicit knowledge chain with `UNCERTAIN` marking (0160), slug-scoped monitor discovery (0168-us-464), literal-status monitor severity (0166-us-473), session-source stall deference (0162-us-477), the stale-parent propagation grace (0163-us-476), issue-proposal sanitization (0161-us-478), deterministic spec-index sync filing (0165-us-474), the shared-head foreign-commit guard (0164-us-475), hub-style doctor path citations (0167-us-469), physical folder copy for Antigravity IDE on Windows with regex `include_only` filter in skills.json (`us-488`, 0169), and the scope-aware Phase 5a link gate with install-layout notes plus the complete relocated-autoload runtime-sibling rewrite (`us-497`, 0171), and truthful install-mode scope and version reporting (`us-498`, 0172). Prior synthesis of specs 0001–0146. The delta since `7d6d39fb` covers centralized skill versioning with version-bound integrity checksums, autoMode continuous orchestration through ship and fix-pr, orchestrator prose compaction with byte budgets, the `ws-spec-to-pr-distributed` extraction, token-centered skill loading at inline body-load sites, the `ws-spec-to-issue` outbound tracker skill, agentic reviewer prompt hygiene, and website/wiki feature emphasis. Specs are filed under `{specsDir}/pending/`, `completed/`, and `archived/`. Index `[x]` and Done-log rows file a spec into `completed/` even when frontmatter `issueState` is `open`. `plans.autoOrganizeByStatus` applies that filing when status subfolders are enabled. The kanvas page describes the shipped board, including the drag-and-drop phase. Feature subpages use `{domain}/{feature}.md` with `## Feature` and `## How it works` required; `## Backend`, `## Frontend`, and `## Third-party services` are conditional.

## Domain: harness

- [Install & Hub](harness/install-and-hub.md): Packaging, hybrid global/local install, secondary host targets, hub layout, naming law, and subagent projection.
- [Diagnostics & Benchmarks](harness/diagnostics-and-benchmarks.md): Doctor, harness auditors, benchmarks, cleanup, audit wrapper, and host binding.

## Domain: delivery

- [Spec-to-PR Delivery Pipeline](delivery/spec-to-pr-pipeline.md): Standard/lite orchestrators, verify bar, commit-before-review, close-before-ship, fix-PR discipline.

## Domain: providers

- [SCM Providers](providers/scm-providers.md): GitHub, Azure DevOps, and local provider intents with visual-attachment parity.

## Domain: specs

- [Spec Lifecycle](specs/spec-lifecycle.md): Author, validate, organize, index, list, explain, translate to a human runbook, update, and archive specifications.
- [Kanvas Board](specs/kanvas-board.md): Read-only local kanban of spec and workflow state in six columns.

## Domain: quality

- [Verification & Review](quality/verification-and-review.md): Derived verify scores, adversarial review, testing/mutation gates, per-task test adequacy, and fix-PR convergence.

## Domain: memory

- [Knowledge & Timesheet](memory/knowledge-and-timesheet.md): Memory backends, self-learning traps, changelog, spec-memo bridge, and invoice timing.

## Domain: engineering

- [Practices & Tooling](engineering/practices-and-tooling.md): Surgical-diff engineering practices, toolchain uniformity, and the opt-in ws-retro retrospective loop

## Domain: documentation

- [Living Feature Wiki & Domain Knowledge Base](documentation/ws-wiki.md): Living project feature wiki and domain knowledge base manager with deterministic link and heading validation.
- [Website & Hub Docs](documentation/website-and-hub.md): Static engineering site, doc-sync protocol, and consumer hub documentation split.

## Sync Baseline

- Commit: `0b3e832875e48653a36b1cd534558a15268f5c80`
- Synced: 2026-10-10

Next wiki update: diff this commit against `HEAD` (`git diff --name-status <commit>..HEAD`) and sweep only the changed specs and code areas. A full-tree sweep is only needed when this block is missing or the commit is unreachable. Contract: `ws-wiki` SKILL.md § Incremental baseline.
