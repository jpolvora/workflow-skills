# Project Living Feature Wiki & Domain Knowledge Base

## System Vision & Overview

`workflow-skills` is an LLM-agnostic, host-neutral skill package for spec-driven software delivery. Canonical `*.spec.md` files are the contract of record; plans, code, reviews, and pull requests are derived from them. Standard and lite orchestrators share one project `config.json`. Consumer config, STACK, MEMORY, and changelog stay local on install/update.

Primary use cases from `index.PRD`: end-to-end Spec-to-PR (standard or lite), sequential multi-spec queues, harness integrity audits, and opt-in adversarial verification.

## Architectural Boundaries

- **Harness & install**: Portable skill bodies under `.agents/skills/ws-*`, installer CLI, integrity hashes, hybrid global vs project-local install. Consumer hub `ws-shared/` holds config; managed `runtime/` and `templates/` are installer-owned.
- **Delivery orchestrators**: `ws-spec-to-pr` (steps 0–9) and `ws-spec-to-pr-lite` (steps 0–5); `ws-spec-multi` classifies each spec and dispatches one pipeline at a time. Isolated `workflowType`; no cross-resume.
- **SCM providers**: GitHub, Azure DevOps, and local specs implement the same required intents; orchestrators never embed host CLI names.
- **Specs vs plans vs wiki**: Specs are point-in-time contracts. `{plansDir}` holds run artifacts. `index.PRD` tracks phases. `CHANGELOG.md` is chronological history. This wiki is the living domain knowledge base.
- **Quality gates**: Derived verify score (`defaults.minVerifyScore`, default 9), commit-before-review, adversarial review and fable audit, secrets scan, stack invariant scan.
- **Memory**: Local MEMORY files and/or spec-memo vault (`enableMemoryFiles` / `enableSpecMemoIntegration`). `ws-spec-memo` is setup/bridge; vault runtime is `ws-memo`.

## Domain Catalog

Living synthesis of specs 0001–0075. Feature subpages use `{domain}/{feature}.md` and the three required headings.

## Domain: harness

- [Install & Hub](harness/install-and-hub.md): Packaging, hybrid global/local install, hub layout, naming law, and subagent projection.
- [Diagnostics & Benchmarks](harness/diagnostics-and-benchmarks.md): Doctor, harness auditors, benchmarks, cleanup, audit wrapper, and host binding.

## Domain: delivery

- [Spec-to-PR Delivery Pipeline](delivery/spec-to-pr-pipeline.md): Standard/lite orchestrators, verify bar, commit-before-review, close-before-ship, fix-PR discipline.

## Domain: providers

- [SCM Providers](providers/scm-providers.md): GitHub, Azure DevOps, and local provider intents with visual-attachment parity.

## Domain: specs

- [Spec Lifecycle](specs/spec-lifecycle.md): Author, validate, organize, index, list, explain, update, and archive specifications.

## Domain: quality

- [Verification & Review](quality/verification-and-review.md): Derived verify scores, adversarial review, testing/mutation gates, and fix-PR convergence.

## Domain: memory

- [Knowledge & Timesheet](memory/knowledge-and-timesheet.md): Memory backends, self-learning traps, changelog, spec-memo bridge, and invoice timing.

## Domain: engineering

- [Practices & Tooling](engineering/practices-and-tooling.md): Surgical scope, reply shape, investigate loop, Node-only runtime, megabrain, config editor.

## Domain: documentation

- [Living Feature Wiki & Domain Knowledge Base](documentation/ws-wiki.md): Living project feature wiki and domain knowledge base manager with deterministic link and heading validation.
- [Website & Hub Docs](documentation/website-and-hub.md): Static engineering site, doc-sync protocol, and consumer hub documentation split.
