# Project Living Feature Wiki & Domain Knowledge Base

## System Vision & Overview

The `workflow-skills` package provides agent- and IDE-neutral workflow skills, orchestrators, and utility skills for coding assistants, enabling seamless spec-to-PR delivery, adversarial code review, deterministic verification, and harness maintenance across software repositories.

## Architectural Boundaries

- **Harness & Orchestrators**: Standard (`ws-spec-to-pr`) and lite (`ws-spec-to-pr-lite`) state-machine dispatchers, test runners, and PR management.
- **Provider Adapters**: Host-neutral abstractions for GitHub, Azure DevOps, and local specification files.
- **Documentation & Specification**: Living wiki management (`ws-wiki`), PRD indexing (`ws-spec-index`), spec authoring (`ws-spec-write`), and spec drift synchronization (`ws-spec-update`).
- **Review & Quality Gates**: Adversarial auditing (`ws-fable-judge`), secrets leak detection (`ws-secrets-leak-review`), and senior developer delivery gates (`ws-senior-developer`).

## Domain: documentation

- [Living Feature Wiki & Domain Knowledge Base](documentation/ws-wiki.md): Living project feature wiki and domain knowledge base manager with deterministic link and heading validation.
