---
name: 00-write-spec
description: >
  Receives a high-level feature description and returns a spec.md result file,
  ready for the next step (01-write-plan).
version: 3.0
---

# 00-write-spec — Draft spec from description

Receives a free-text feature description from the user, drafts a structured
`*.spec.md`, and writes it to `specs/[slug].spec.md`. The output is ready for
handoff to step `01-write-plan`.

**Scope:** description → spec file only. No issue fetching, no iterative
grilling, no orchestrator dispatch.

## Canonical format

Adhere to the canonical `*.spec.md` format defined by the
[spec-format](../spec-format/SKILL.md) skill. Minimal structure:

```yaml
---
id: null
slug: slug-unique-da-feature
title: "Feature Title"
source: local
specDate: YYYY-MM-DD
---
```

```markdown
# Specification — {title}

## Description

(Detailed description of business needs and feature flows)

## Acceptance Criteria

- AC1: ...
- AC2: ...

## Notes

(Technical context, constraints, useful links)
```

## Workflow

1. Receive feature description from user.
2. Infer a slug from the title/description.
3. Draft the spec following the canonical format above.
4. Write to `specs/[slug].spec.md`.
5. Return the file path so `01-write-plan` can pick it up.

## Output

Return the absolute or repo-relative path to the written spec file.
