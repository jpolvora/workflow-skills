---
name: spec-format
description: >-
  Creates, reviews, or formats *.spec.md artifacts (local US/feature specification). Project-agnostic.
  Load when the user invokes /spec-format, @spec-format, "create spec", "review spec",
  "format spec" or requests validation of local specification format.
upstream: jpolvora/workflow-skills — this skill is a us-workflow pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
disable-model-invocation: true
version: 1.0
---

# spec-format — Canonical `*.spec.md` format

Skill to **create**, **review**, or **format** local specifications (`*.spec.md`) — a single, portable artifact for a feature/US. Replaces direct GitHub reading in downstream skills; all read `*.spec.md` from the working directory.

> **Canonical source of the `*.spec.md` format.** Other skills and `us-workflow` **reference** this skill — they do not duplicate frontmatter, sections, or validation rules. See also [`AGENTS.md`](../../../../../AGENTS.md) § Skill loading.

> **Language:** responses to user in **en-us**.

## Invocation triggers

| Trigger | Example |
|---------|---------|
| Command | `/spec-format`, `@spec-format` |
| Create | "create spec", "generate spec", "new specification" |
| Review | "review spec", "validate spec", "audit spec" |
| Format | "format spec", "fix spec format" |

## Modes

| Mode | When | Output |
|------|--------|-------|
| **create** | User describes a feature or provides a GitHub issue without a local spec | New `*.spec.md` file in canonical format |
| **review** | Existing spec with possible gaps or format drift | Gap report + proposed fixes (edit only with approval) |
| **format** | Spec with valid content but frontmatter/sections outside the standard | Spec reformatted in-place or proposed diff |

If the mode is not explicit, infer from context or ask.

## File name

| Source | Pattern | Example |
|--------|--------|---------|
| GitHub issue `{id}` | `us-{id}.spec.md` in `.cursor/plans/us-{id}/` | `us-1474.spec.md` |
| Local spec (slug) | `{slug}.spec.md` in `.cursor/plans/{slug}/` | `relatorios-financeiros.spec.md` |

The working directory **slug** (`{us-dir}`) is:
- `us-{id}` when the input is a GitHub issue number;
- the basename of the file (without `.spec.md`) when the input is a local spec — e.g.: `my-feature.spec.md` → folder `.cursor/plans/my-feature/`.

## YAML Frontmatter (required)

```yaml
---
id: 1474              # integer — GitHub issue number; null if purely local spec
slug: us-1474         # working folder identifier (us-{id} or spec name)
title: "Feature title"
source: github        # github | local
issueState: open      # optional — issue state when source=github
issueUrl: "https://github.com/{org}/{repo}/issues/1474"  # optional
specDate: 2026-07-02  # generation date or last relevant update
---
```

## Body (required sections)

```markdown
# Specification — {title}

## Description

(description text — GitHub issue body in Markdown when applicable)

## Acceptance Criteria

- AC1: …
- AC2: …

## Child Tasks

(optional — filled when `source: github` and the issue had sub-tasks/checklist)

### Task #{id} — {title}

- **Status:** …
- **Description:** …

## Notes

(links, dependencies, extra context — optional)
```

## Validation rules

1. **Acceptance Criteria** must be enumerable and testable — one line per AC.
2. When `source: local`, the author is responsible for complete ACs; there is no issue fetch.
3. The raw `*.issue.json` snapshot (when it exists) is **audit-only** — downstream skills do **not** read `issue.json` directly; they always read `spec.md`.
4. Local specs can be versioned in `.cursor/plans/specs/` or any path — `us-workflow` copies to `{us-dir}/` at Step 0 if needed.

## Flow — review mode

1. Read the provided `*.spec.md` (or locate in `{us-dir}/`).
2. Validate frontmatter, required sections, and AC quality (enumerable, testable, unambiguous).
3. Cross-reference with [`docs/superpowers/specs/2026-05-27-matrix-saas-design.md`](../../../../../docs/superpowers/specs/2026-05-27-matrix-saas-design.md) when there is parity with legacy.
4. Emit report:

| Check | Status | Proposed fix |
|-------------|--------|-------------------|
| Frontmatter complete | OK / FAIL | … |
| Description section | OK / FAIL | … |
| ACs testable | OK / FAIL | … |

5. **Do not edit** without explicit user approval (`apply fixes`, `format`).

## Flow — create mode

1. Collect title, description, and ACs (free text, GitHub issue via `gh issue view {n}`, or user draft).
2. If input is an issue number: use `gh issue view {n}` + `.agents/skills/us-workflow/scripts/github-issue-to-spec.py` (see `us-workflow` → Specification Protocol).
3. Generate file at the canonical path with complete frontmatter and sections.
4. Confirm final path to user.

## Downstream consumers

`us-workflow`, `write-plan`, `interview`, `verify-plan`, `integration-validation` read **`{us-dir}/{slug}.spec.md`** — never the GitHub API directly and never `*.issue.json`.

## References

- Harness routing: [`AGENTS.md`](../../../../../AGENTS.md)
- Architecture: [`docs/superpowers/specs/2026-05-27-matrix-saas-design.md`](../../../../../docs/superpowers/specs/2026-05-27-matrix-saas-design.md)
- Workflow protocol: [`../../us-workflow/SKILL.md`](../../us-workflow/SKILL.md) → Specification Protocol
