# Senior Developer — docs sync

Mandatory when implementation changes **product behavior**, **API contracts**, **routes**, or **domain terms**. Update in the **same session** (or same PR) before calling work done. Do **not** only offer — apply edits unless the user explicitly opts out (`skip docs`).

**Skip** when: refactor/test-only with no product delta; comment/typo-only; purely internal code with no user-visible or API change.

## Checklist (use what applies)

| Artifact | When to update |
|----------|----------------|
| **Design spec** (`docs/superpowers/specs/*.md`) | API, rules, or slice behavior changed — match the feature’s spec |
| **Engineering constraints** (`docs/specs/backend_API.md`, `docs/specs/frontend_UI.md`) | Cross-cutting C# or React rules changed (tenancy, route guards, view patterns) |
| **Delivered / roadmap** (`*-delivered.md`, `*-roadmap.md`) | Slice shipped or status moved |
| **`CONTEXT.md`** | New/changed glossary term; program status; domain rule members should know |
| **`docs/MATRIX-PRODUCT-PRD.md`** | Requirement status, MX-ID notes, or backlog truth changed |
| **`README.md`** | Routes, ports, demo flow, tree/UI behavior operators need locally |
| **`AGENTS.md`** | New **skill**, **agent**, **rule**, or **verification command** in the hub — **never** spec paths or spec catalogs (see hub § No spec index) |
| **`DESIGN.md`** | New UI tokens, tree colors, or component rules for the web app |
| **Plan** (`docs/superpowers/plans/*.md`) | Only if the approved plan’s steps or scope changed |

## Completion proof

In **code review proof** ([SKILL.md](SKILL.md) § Code review proof), add:

```markdown
**Docs sync:** [files updated] | N/A (no product delta)
```

If product changed but docs were deferred, state **why** and list **remaining files** — do not mark done without user acknowledgment.

## After docs sync

Run [learning](../learning/SKILL.md): append `MEMORY.md` or mark `Learning: N/A` in code review proof. Docs sync alone does not close the task.
