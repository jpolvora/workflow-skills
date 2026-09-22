# Example companion (Tier 2)

Source spec (sample, two ACs, one boundary):

```markdown
- AC1: Drafts are auto-saved every 30 seconds.
- AC2: A banner shows the last saved time.
## Out of Scope
| Feature | Reason |
|---------|--------|
| Offline editing | Requires a sync engine; deferred |
```

Companion `step-00-demo.spec-translated.md` (en-us):

```markdown
## Draft auto-save runbook

> Source: `step-00-demo.spec.md` · Consulted: agent spec, README, AGENTS.md · Not found: issue snapshot, vault

### Implementation
1. Start a 30-second timer while a draft is dirty; on fire, persist the draft. (AC1)
2. After each save, publish the saved timestamp for the banner. (AC1, AC2)

### UI Test
1. From a clean draft, type one character and wait 30 seconds; verify the banner shows a fresh saved time on the **Editor** screen. (AC2)
2. From a saved draft, reload the page; verify the draft text is intact and the [unresolved: sync status icon] shows the saved state. (AC1)

### Out of scope
- Offline editing.
```

Notes: AC1 maps to two implementation steps plus UI step 2; AC2 maps to
implementation step 2 plus UI step 1. The `[unresolved: sync status icon]`
flag marks a label with no project source instead of inventing one. A
`pt-BR` rendering would use `Implementação` / `Teste UI` / `Fora de escopo`
with the same steps and citations.
