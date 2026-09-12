# Living Feature Wiki & Domain Knowledge Base (`ws-wiki`)

## Feature Overview

`ws-wiki` provides an authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness. Unlike chronological changelogs (`CHANGELOG.md`) or point-in-time specifications (`*.spec.md`), `ws-wiki` maintains a consolidated, living feature documentation tree at `{specsDir}/wiki/` organized by bounded context domains.

Key subcommands include:
- `/ws-wiki init`: Bootstraps initial project taxonomy and `index.wiki.md`.
- `/ws-wiki sync [slug]`: Synchronizes delivered features or git diffs to domain subpages.
- `/ws-wiki update [target]`: Surgically refines individual feature pages.
- `/ws-wiki validate`: Deterministically validates relative links and 3-section headings.

## Business Rules & Logic

- **Standard 3-Section Format**: Every feature subpage must contain exactly three standard headings:
  1. `## Feature Overview`
  2. `## Business Rules & Logic`
  3. `## Technical Architecture`
- **Deterministic Link Resolution**: All relative markdown links within `index.wiki.md` and feature subpages must resolve to existing files on disk. Broken links fail verification with exit code 1.
- **Bounded Context Partitioning**: Features are organized under domain subdirectories (e.g. `{specsDir}/wiki/{domain}/{feature}.md`).
- **In-Place Refinement**: Shipped features update and reconcile existing business rules in place rather than appending repetitive change histories.
- **Multi-Page Domain Mapping**: Features spanning multiple modules update all touched domain subpages and cross-link dependencies.
- **Vibe-Coding Mode**: When no spec exists, business rules and data models are reverse-engineered directly from git diffs and commit messages.
- **Approval Review Gate**: Proposed wiki diffs are presented to the user via `user-gate` before writing changes to disk; selecting Cancel terminates immediately without modifying files.

## Technical Architecture

- **CLI & Script Helpers**:
  - `validate_wiki.cjs`: Deterministic validator for relative links, index presence, and 3-section headings. Supports `--json` and `--check` modes.
  - `sync_wiki_index.cjs`: Idempotent index updater that creates domain sections and bullet links in `index.wiki.md`.
- **Configuration**:
  - Configured via `config.json` -> `plans.wikiDir` (schema default: `.agents/specs/wiki`).
- **Lifecycle Hooks**:
  - Registered as a post-close documentation hook in `ws-spec-to-pr` (Step 8) and `ws-spec-to-pr-lite` (Step 4).
- **Harness Integration**:
  - Registered in `CATALOG.md`, `ws-shared/autoload.md`, and `bin/skill-dependencies.json`.
