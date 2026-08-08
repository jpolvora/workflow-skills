---
name: ws-write-spec
description: Local spec authoring — drafts structured *.spec.md feature specifications under {specsDir} from free-text user requirements.
version: 0.0.119
disable-model-invocation: true
invocation_names:
  - write-spec
  - ws-write-spec
---

# ws-write-spec

> When this skill is loaded, output "ws-write-spec loaded."

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

Draft a **local** `*.spec.md` from free-text into the project specs directory only.

**Write path:** `{specsDir}/{slug}.spec.md` — resolve `{specsDir}` ← `config.json` → `plans.specsDir` (default `.agents/specs`; prefer existing repo-root `specs/` when that is the configured value). Create `{specsDir}` if missing.

**Do not** create `{plansDir}/{slug}/`, `step-00-*.spec.md`, state files, or any other plan/workflow artifact. Plan copies are owned by [ws-local-spec-provider](../ws-local-spec-provider/SKILL.md) `fetch-to-spec` / `--register` when a workflow starts — never by this skill’s default write.

**Format:** load [ws-spec-format](../ws-spec-format/SKILL.md) and follow it. Set `source: local` and `id: null`.

**Specs family:** Role = draft under `{specsDir}` only. Router / vocabulary: [`../ws-shared/autoload.md`](../ws-shared/autoload.md). Next: format → `ws-spec-format`; start workflow → `ws-local-spec-provider` register; browse → `ws-spec-list`.

## Invocation

Standalone:

```
/write-spec "<description>" [slug=<slug>] [output-dir=<path>] [--register]
```

Workflow (ws-spec-to-pr / lite Step 0 free-text): orchestrator runs this skill (specsDir write), then **must** register via ws-local-spec-provider before planning if a `{us-dir}/step-00-` copy is required. Do not treat plansDir as the write-spec destination.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<description>` | required | Raw feature / business text |
| `slug` | inferred | URL-safe id from title/description |
| `output-dir` | `{specsDir}` | Optional override for the specs directory only (still writes `{output-dir}/{slug}.spec.md`; never `{plansDir}`) |
| `--register` | false | After write, register into `{us-dir}/step-00-{slug}.spec.md` via ws-local-spec-provider (workflow only) |

## Steps

1. **Parse** — Infer title and url-safe `slug` from the description (or use provided `slug`).
   - Done when: title and `slug` are set.

2. **Draft** — Build the spec per [ws-spec-format](../ws-spec-format/SKILL.md).
   - Done when: frontmatter has `source: local`, `id: null`, `slug`, `title`, `specDate`; body has Description, Acceptance Criteria (each AC specific and testable), and Notes as needed; every stated requirement maps to ≥1 AC or an explicit out-of-scope note in Notes.

3. **Write** — Save `{specsDir}/{slug}.spec.md` (or `{output-dir}/{slug}.spec.md` when overridden). Ensure parent dir exists. **Never** mkdir or write under `{plansDir}`.
   - Done when: that specsDir file exists on disk.

4. **Optional register** — Only if `--register` or the orchestrator explicitly requests a workflow plan copy. Delegate; do not copy files yourself:

   ```bash
   python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py \
     --input "{specsDir}/{slug}.spec.md"
   ```

   That script normalizes `source: local` and writes `{us-dir}/step-00-{slug}.spec.md`. Use `--force` only when overwriting an existing plan copy that differs. Standalone `/write-spec` skips this step by default.
   - Done when: command succeeded, or this step was skipped.

5. **Handoff** — Return the `{specsDir}/{slug}.spec.md` path. Mention the `{us-dir}/step-00-` path only if `--register` ran. For workflow mode after register, orchestrator records `specPath` at the `step-00-` file and `specSource: local`.
   - Done when: caller has the specsDir path (and plan path only when registered).
