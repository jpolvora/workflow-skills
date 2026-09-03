---
name: ws-preview
description: Run the consumer-configured local pipeline review dry-run command without publishing PR threads.
version: 0.3.56
disable-model-invocation: true
invocation_names:
  - ws-preview
  - pipeline-review
  - exec-code-review
---

# ws-preview

> When this skill is loaded, output "ws-preview loaded."

User-invoked **local pipeline review dry-run**. Resolve the command from the **project** `{sharedDir}/config.json` and run it in the consumer repo root. Complement to [`ws-code-review`](../ws-code-review/SKILL.md) (in-agent pre-push / orch Step 6) — this skill does **not** vendor or name a reviewer product; the consumer owns the recipe.

**Never publish PR threads.** Do not wrap the command through packaged `{skillsRoot}/ws-preview` scripts (none are required).

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

## Invocation

```
/ws-preview
```

| Config | Required | Notes |
|--------|----------|-------|
| `preview.dryRunCommand` | yes | Shell command string run from the consumer repo root (cwd = git top-level or `$PWD` when not a git tree) |

Optional user wording after invoke (e.g. "committed only") is ignored unless the configured command already encodes that behavior — do not invent flags for a specific backend.

## Steps

1. **Resolve** — Read `{sharedDir}/config.json` → `preview.dryRunCommand` (trim). Expand path tokens from [`tools.md`](../ws-shared/tools.md) only if the string contains them.
   - Done when: a non-empty command string is known.
   - If missing/empty/whitespace-only: STOP. Tell the user to set `preview.dryRunCommand` in project `config.json` (or run `ws-configure-project`). Do not guess a default reviewer tool or download a backend.

2. **Run** — From the consumer repo root, invoke the resolved command via `Shell` with an explicit launcher when the string is a script path (`bash` / `node` / `python` per [`tools.md`](../ws-shared/tools.md) § Script launchers). Use a long-lived call (block timeout ≥ 600000 ms / 10 minutes) so clone/install/LLM work inside the consumer recipe is not killed. Pass no extra skill-owned flags.
   - Done when: the process exits (success or hard error). A timeout is a failed run.

3. **Report** — Summarize finding counts and top issues in the consumer/session language (skill body en-us). Non-zero exit or findings are still a completed dry-run report unless the process never started. Stop after the report (fixes only if the user asks).
   - Done when: the user has the summary (or the hard-error cause) and no PR threads were published.
