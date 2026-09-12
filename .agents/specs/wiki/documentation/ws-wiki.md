# Living Feature Wiki & Domain Knowledge Base (`ws-wiki`)

## Feature Overview

`ws-wiki` provides an authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness. Unlike chronological changelogs (`CHANGELOG.md`) or point-in-time specifications (`*.spec.md`), `ws-wiki` maintains a consolidated, living feature documentation tree at `{specsDir}/wiki/` organized by bounded context domains.

Key subcommands include:
- `/ws-wiki init`: Bootstraps initial project taxonomy and `index.wiki.md`; offers first-time spec sweep when appropriate.
- `/ws-wiki sweep` (aliases `first-time`, `backfill`): Walks all top-level `NNNN-*.spec.md` files in order and overlays living wiki pages from specs plus current code.
- `/ws-wiki verify` (aliases `audit`, `check-code`): Phase 2 read-only wiki-vs-code statement verify; classifies each claim `confirmed` | `differs` | `absent` | `inconclusive` with code evidence; checkpoint at `{wikiDir}/verify.state.json` (`status: audited`).
- `/ws-wiki apply` (aliases `reconcile`, `phase-3`): Phase 3 findings plan plus batch apply; per-finding truth gate (Update wiki recommended vs Update code); wiki batch then standalone `ws-spec-write` per code-directed finding.
- `/ws-wiki sync [slug]`: Synchronizes one delivered feature or git diff to domain subpages (per-diff review gate).
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
- **First-Time Spec Sweep**: After init (or via `/ws-wiki sweep`), processes every top-level spec in prefix order; later specs supersede earlier wiki rules; current code wins over stale spec ACs. One start gate for the whole run; checkpoint at `{wikiDir}/sweep.state.json` supports resume.
- **Phase 2 Verify (read-only audit)**: Walks feature pages in `list_wiki_feature_pages.cjs` order, one page at a time; extracts checkable statements from Business Rules & Logic and Technical Architecture (Feature Overview only for testable invariants); every statement gets a file+line evidence pointer or explicit `no match`; `--dry-run` writes nothing; empty feature set is success with findings `0`.
- **Phase 3 Apply (plan then batch)**: Findings plan lists every `differs`/`absent` row with wiki path, quoted statement, evidence, and both truth options; truth gate per finding (Update wiki recommended); wiki-directed edits apply in one batch (no changelog append) then index sync plus validate; code-directed findings each produce one standalone `ws-spec-write` (`Update feature {title} to reflect current wiki statement: {statement}`, `source: local`); Phase 3 never implements code.
- **Per-Sync Review Gate**: `/ws-wiki sync [slug]` presents proposed wiki diffs via `user-gate` before writing; Cancel terminates without modifying files.

## Technical Architecture

- **CLI & Script Helpers**:
  - `validate_wiki.cjs`: Deterministic validator for relative links, index presence, and 3-section headings. Supports `--json` and `--check` modes.
  - `sync_wiki_index.cjs`: Idempotent index updater that creates domain sections and bullet links in `index.wiki.md`.
  - `list_wiki_sweep_specs.cjs`: Lists top-level specs in sweep order (`NNNN` ascending, then unprefixed); fail-closes on ambiguous dual filenames.
  - `list_wiki_feature_pages.cjs`: Lists feature pages in Phase 2 verify order (`**/*.md` excluding root `index.wiki.md` and `*.state.json`, POSIX lexicographic); `--json` prints `{ ok, pages, errors }`; containment-gated `--repo-root`/`--wiki-dir`, unknown flags exit 2, `--help` exit 0.
- **Configuration**:
  - Configured via `config.json` -> `plans.wikiDir` (schema default: `.agents/specs/wiki`).
- **Lifecycle Hooks**:
  - Registered as a post-close documentation hook in `ws-spec-to-pr` (Step 8) and `ws-spec-to-pr-lite` (Step 4).
- **Harness Integration**:
  - Registered in `CATALOG.md`, `ws-shared/autoload.md`, and `bin/skill-dependencies.json`.
