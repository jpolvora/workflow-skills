---
name: ws-spec-provider-local
description: Local Markdown spec provider — detects, normalizes, and registers hand-written *.spec.md feature specifications into canonical pipeline artifacts.
version: 0.3.59
disable-model-invocation: true
invocation_names:
  - spec-provider-local
  - ws-spec-provider-local
---

# ws-spec-provider-local

> When this skill is loaded, output "ws-spec-provider-local loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Filesystem local-spec entry: detect/configure `plans.specsDir` (default **`.agents/specs`**; prefer existing repo-root `specs/`), then register/normalize any `*.spec.md` into **two ordered artifacts** — spec of record (path from `ws-spec-organizer` `resolve_spec_path.cjs`: `{specsDir}/{slug}.spec.md` or `{specsDir}/NNNN-{slug}.spec.md`), then workflow copy `{us-dir}/step-00-{slug}.spec.md` (plan folder and filename stay unprefixed). No remote trackers.

**Promotion primitive:** this skill's `register_local_spec.cjs` is the **single invoked** promotion path for every provider. Specs of record written under `{specsDir}` (drafted or enhanced via [`ws-spec-write`](../ws-spec-write/SKILL.md) for local or tracker origins) are promoted to the canonical workflow copy `{us-dir}/step-00-{slug}.spec.md` with `--source {origin}`, so `source:` reflects the real origin. The Python helper remains a supported frozen equivalent.

**Specs family:** Role = bridge `{specsDir}` ↔ `{us-dir}` (register / fetch-to-spec). Drafts and reformulations come from [`ws-spec-write`](../ws-spec-write/SKILL.md) or hand-written files; format SoT [`ws-spec-format`](../ws-spec-format/SKILL.md). Orch entry for local files. Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).


**PR/thread/merge:** hybrid — load `providers.scm` skill ([ws-spec-provider-github](../ws-spec-provider-github/SKILL.md) / [ws-spec-provider-azure-devops](../ws-spec-provider-azure-devops/SKILL.md)) and call the shared intents in [`scm-provider-contract.md`](../ws-shared/scm-provider-contract.md). Never no-op silently. Reject `scm: "local"`.

## Invocation

### Standalone Mode

```
/ws-spec-provider-local <intent> [args...]
```

Examples: `fetch-to-spec path/to/feature.spec.md` · `validate-auth` · `fetch-to-spec feature`. Prints `specsPath` (spec of record) and `specPath` (workflow copy).

### Workflow Mode

Orch when `providers.active=local` or input is `*.spec.md`; also after `ws-spec-write` when a workflow needs a `{us-dir}/step-00-` copy (`--register`). Records `specSource: local`, skips Step 0 → Step 1 gate when input was already a local spec.

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
| Flat | `{specsDir}/{slug}.spec.md` or `{specsDir}/NNNN-{slug}.spec.md` (via `resolve_spec_path.cjs`) |
| Nested | `{specsDir}/{slug}/README.spec.md` or `{slug}/{slug}.spec.md` |

**Write order (mandatory):**

1. **Spec of record** — destination from `resolve_spec_path.cjs` when copying into `{specsDir}`; inputs that already live under `{specsDir}` (flat or nested, including `NNNN-` names) are normalized **in place**, so no duplicate flat twin is created.
2. **Workflow copy** — `{us-dir}/step-00-{slug}.spec.md`, the canonical artifact every downstream step reads.
3. **Attachments sidecar (when present)** — if `{specsDir}/{specStem}.assets/` exists beside the spec of record, recursively copy it to `{us-dir}/attachments/` (replace destination when source exists). Local provider does not download remote binaries.

Registering never leaves a workflow copy without a spec of record.

## Intent contract

| Intent | Behavior |
|--------|----------|
| `fetch-to-spec` | Normalize → write spec of record under `{specsDir}`, then workflow copy `step-00`; stamps `--source` (default `local`); skip Step 0 |
| `validate-auth` | `specsDir` exists/creatable; `config.json` writable when configuring |
| `create-pr` / `list-threads` / `sweep-prior-work` / `check-pr-status` / `resolve-thread` / `comment-issue` / `merge-pr` | **Delegate** to `providers.scm` |

### Provider resolution

1. Read `providers.active` / `providers.scm`.
2. Absent `providers`: enabled GitHub → github; else ADO → azure-devops; else local. Prefer GitHub if both.
3. Absent `scm`: if active is github|azure-devops → scm=active; if local → parse `project.repoUrl` host; else **STOP** for explicit `providers.scm`.

## Scripts (Done when)

```bash
node {skillsRoot}/ws-spec-provider-local/scripts/detect_specs_dir.cjs --validate   # validate-auth
node {skillsRoot}/ws-spec-provider-local/scripts/detect_specs_dir.cjs --detect [--ensure]
node {skillsRoot}/ws-spec-provider-local/scripts/detect_specs_dir.cjs --configure specs
node {skillsRoot}/ws-spec-provider-local/scripts/register_local_spec.cjs \
  --input path/to/feature.spec.md [--slug feature] [--source github] [--force]
```

Slug: frontmatter `slug:` else basename (strip `step-00-`); nested README twin → parent dir name. Always set `source:` (from `--source`) + `slug`/`title`. Overwrite only if identical or `--force` / confirm. Validate sections via [`ws-spec-format`](../ws-spec-format/SKILL.md).

Path overrides when config defaults are wrong: `--specs-dir`, `--plans-dir`, `--repo-root` (the project owning `ws-shared/config.json` — needed when the skill runs from a global install).

## Entry patterns

| Input | Action |
|-------|--------|
| `*.spec.md` outside `{specsDir}` | Copy → path from `resolve_spec_path.cjs`, then `{us-dir}/step-00` |
| `*.spec.md` under `{specsDir}` (flat or nested) | Normalize in place, then `{us-dir}/step-00` |
| Slug under `specsDir` | Resolve file → same as above |
| Already canonical `step-00` | Re-normalize; also ensures the `{specsDir}` spec of record exists; skip Step 0 |

Standalone prints `specsPath` + `specPath`. Workflow records `specSource` from `--source`, skips Step 0 → Step 1 gate. en-us; portable via `config.json` only.
