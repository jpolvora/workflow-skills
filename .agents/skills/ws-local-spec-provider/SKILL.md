---







name: ws-local-spec-provider
description: Local Markdown spec provider — detects, normalizes, and registers hand-written *.spec.md feature specifications into canonical pipeline artifacts.
version: 0.3.12
disable-model-invocation: true
invocation_names:
  - local-spec-provider
  - ws-local-spec-provider
---

# ws-local-spec-provider

> When this skill is loaded, output "ws-local-spec-provider loaded."

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

Filesystem local-spec entry: detect/configure `plans.specsDir` (default **`.agents/specs`**; prefer existing repo-root `specs/`), then register/normalize any `*.spec.md` into **two ordered artifacts** — spec of record `{specsDir}/{slug}.spec.md`, then workflow copy `{us-dir}/step-00-{slug}.spec.md`. No remote trackers.

**Promotion primitive:** this skill's `register_local_spec.py` is the **single** promotion path for every provider. The SCM providers ([github](../ws-github-provider/SKILL.md) / [azure-devops](../ws-azure-devops-provider/SKILL.md)) write their spec of record into `{specsDir}` and then call it with `--source {origin}`, so `source:` reflects the real origin instead of being forced to `local`.

**Specs family:** Role = bridge `{specsDir}` ↔ `{us-dir}` (register / fetch-to-spec). Drafts come from [`ws-write-spec`](../ws-write-spec/SKILL.md) or hand-written files; format SoT [`ws-spec-format`](../ws-spec-format/SKILL.md). Orch entry for local files. Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

**PR/thread/merge:** hybrid — load `providers.scm` skill ([ws-github-provider](../ws-github-provider/SKILL.md) / [ws-azure-devops-provider](../ws-azure-devops-provider/SKILL.md)). Never no-op silently. Reject `scm: "local"`.

## Invocation

### Standalone Mode

```
/ws-local-spec-provider <intent> [args...]
```

Examples: `fetch-to-spec path/to/feature.spec.md` · `validate-auth` · `fetch-to-spec feature`. Prints `specsPath` (spec of record) and `specPath` (workflow copy).

### Workflow Mode

Orch when `providers.active=local` or input is `*.spec.md`; also after `ws-write-spec` when a workflow needs a `{us-dir}/step-00-` copy (`--register`). Records `specSource: local`, skips Step 0 → Step 1 gate when input was already a local spec.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<intent>` | required | Contract below |
| path / slug | — | Local file or slug under `specsDir` |
| `--source` | `local` | Origin stamped into frontmatter `source:` (`github` / `azure-devops` when a tracker provider promotes) |
| `--force` | false | Overwrite a spec of record / workflow copy that exists and differs |

## Config

| Key | Role |
|-----|------|
| `plans.specsDir` | Specs root (omit → prefer `specs/` if present, else `.agents/specs`) |
| `plans.dir` | `{us-dir}` = `{plansDir}/{slug}/` |
| `providers.active` | `local` → this skill for `fetch-to-spec` |
| `providers.scm` | `github` \| `azure-devops` for PR intents |

Missing `specsDir`: ensure dir + write key into local `config.json` (gitignored). Do not invent repo-root `specs/` unless chosen.

| Layout | Path |
|--------|------|
| Flat | `{specsDir}/{slug}.spec.md` |
| Nested | `{specsDir}/{slug}/README.spec.md` or `{slug}/{slug}.spec.md` |

**Write order (mandatory):**

1. **Spec of record** — `{specsDir}/{slug}.spec.md`. Inputs that already live under `{specsDir}` (flat or nested) are normalized **in place**, so no duplicate flat twin is created.
2. **Workflow copy** — `{us-dir}/step-00-{slug}.spec.md`, the canonical artifact every downstream step reads.

Registering never leaves a workflow copy without a spec of record.

## Intent contract

| Intent | Behavior |
|--------|----------|
| `fetch-to-spec` | Normalize → write spec of record under `{specsDir}`, then workflow copy `step-00`; stamps `--source` (default `local`); skip Step 0 |
| `validate-auth` | `specsDir` exists/creatable; `config.json` writable when configuring |
| `create-pr` / `list-threads` / `resolve-thread` / `merge-pr` | **Delegate** to `providers.scm` |

### Provider resolution

1. Read `providers.active` / `providers.scm`.
2. Absent `providers`: enabled GitHub → github; else ADO → azure-devops; else local. Prefer GitHub if both.
3. Absent `scm`: if active is github|azure-devops → scm=active; if local → parse `project.repoUrl` host; else **STOP** for explicit `providers.scm`.

## Scripts (Done when)

```bash
python {skillsRoot}/ws-local-spec-provider/scripts/detect_specs_dir.py --validate   # validate-auth
python {skillsRoot}/ws-local-spec-provider/scripts/detect_specs_dir.py --detect [--ensure]
python {skillsRoot}/ws-local-spec-provider/scripts/detect_specs_dir.py --configure specs
python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py \
  --input path/to/feature.spec.md [--slug feature] [--source github] [--force]
```

Slug: frontmatter `slug:` else basename (strip `step-00-`); nested README twin → parent dir name. Always set `source:` (from `--source`) + `slug`/`title`. Overwrite only if identical or `--force` / confirm. Validate sections via [`ws-spec-format`](../ws-spec-format/SKILL.md).

Path overrides when config defaults are wrong: `--specs-dir`, `--plans-dir`, `--repo-root` (the project owning `ws-shared/config.json` — needed when the skill runs from a global install).

## Entry patterns

| Input | Action |
|-------|--------|
| `*.spec.md` outside `{specsDir}` | Copy → `{specsDir}/{slug}.spec.md`, then `{us-dir}/step-00` |
| `*.spec.md` under `{specsDir}` (flat or nested) | Normalize in place, then `{us-dir}/step-00` |
| Slug under `specsDir` | Resolve file → same as above |
| Already canonical `step-00` | Re-normalize; also ensures the `{specsDir}` spec of record exists; skip Step 0 |

Standalone prints `specsPath` + `specPath`. Workflow records `specSource` from `--source`, skips Step 0 → Step 1 gate. en-us; portable via `config.json` only.
