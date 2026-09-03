---
name: ws-task-lifecycle
description: On-demand coordinator for prompt-driven product work — Intake, Implementation, Completion tracking without a Spec-to-PR plan tree.
version: 0.3.58
disable-model-invocation: true
invocation_names:
  - task-lifecycle
  - ws-task-lifecycle
---

# ws-task-lifecycle

> When this skill is loaded, output "ws-task-lifecycle loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Coordinator for **prompt-driven** implementation (direct user task). Not a second FSM. Do **not** invoke `ws-spec-to-pr` or `ws-spec-to-pr-lite` from this skill. Do **not** create `{plansDir}/{slug}/` or write `step-00-*.spec.md`.

**Default invoke:** slash / task-router (on-demand). Always-applied membership is opt-in via `defaults.autoloadTaskLifecycle` and `ws-configure-project --section autoload`. Shipped `{sharedDir}/autoload.md` Always-applied table does not list this skill.

**Specs family:** Role = prompt-task cowork. Drafts → [`ws-spec-write`](../ws-spec-write/SKILL.md). Index checkboxes → [`ws-spec-index`](../ws-spec-index/SKILL.md) conventions. Body drift → [`ws-spec-update`](../ws-spec-update/SKILL.md) (optional, not this bus). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

Expand `{specsDir}` from `plans.specsDir` and `{sharedDir}` from config before Reads. Never hardcode a specs directory path.

## Phase 1 — Intake

1. If `{specsDir}/index.PRD` exists, Read it.
   - Done when: the file was read, or a skip note records it is absent.
2. If repo-root `PLAN.md` exists, Read it.
   - Done when: the file was read, or a skip note records it is absent.
3. If the prompt is a product change and no matching `{specsDir}/{slug}.spec.md` exists, invoke `ws-spec-write`. Do not draft a full spec body in this file.
   - Done when: a slice spec exists under `{specsDir}`, or the prompt is not a product change.
4. When `{specsDir}/index.PRD` exists and the slug has no Feature map / Next-specs row, invoke [`ws-spec-index`](../ws-spec-index/SKILL.md) `track {slug}` (standalone Add path). Skip with a note when the row already exists or the index is absent.
   - Done when: the slug is on the board, already-tracked skip note, or index-absent skip note.
5. After the slice spec exists and **before** product-file edits, set the matching `index.PRD` checkbox from `[ ]` to `[~]` when that index exists.
   - Done when: the checkbox is `[~]`, or `index.PRD` is absent (skip note).

## Phase 2 — Implementation

1. Load [`ws-karpathy-guidelines`](../ws-karpathy-guidelines/SKILL.md) before the first product-file edit.
   - Done when: surgical-scope rules are in session.
2. Load [`ws-senior-developer`](../ws-senior-developer/SKILL.md) before claiming the task complete.
   - Done when: delivery-gate / Code review proof rules are in session.
3. If `verification.backendTest` is a non-empty string, run that alias. If it is empty, record a skip note and do not fail this phase for a missing test alias.
   - Done when: the alias exited, or a skip note exists.

## Phase 3 — Completion

Resolve `tracking.featuresMdEnabled` from `{sharedDir}/config.json`: omitted or `true` → the features file participates in the **default** walk; explicit `false` → skip the features file entirely.

**Features file auto-detection** (default walk step 1): when `tracking.featuresMdEnabled` is not `false`, resolve the features file path in this order — (a) repo-root `FEATURES.md` when it exists, (b) `{specsDir}/index.PRD` (default). When `featuresMdEnabled` is `false`, skip the features file step entirely. Mark the matching item `[x]` and append a Done-log line when the resolved file exists; skip with a note when it is absent. Do not create an empty features file.

Walk tracking files in this order (or `tracking.canonicalFiles` when that JSON array is non-empty):

1. Features file — auto-detected per above (repo-root `FEATURES.md` when it exists, else `{specsDir}/index.PRD`); only when `tracking.featuresMdEnabled` is not `false`.
2. `PLAN.md` — append a Done-log line when the file exists.
3. `PRODUCT.PRD` — append a Done-log line when the file exists.

If `tracking.canonicalFiles` is absent or `[]`, use that default list (with the features file step omitted when `featuresMdEnabled` is `false`). If it is a non-empty array of repo-relative paths, walk that array in listed order before changelog (explicit list is authoritative — include `FEATURES.md` or `index.PRD` yourself if wanted). If a listed path is exactly `index.PRD` (no directory) and repo-root `index.PRD` is missing, use `{specsDir}/index.PRD`.

Skip a path that is not on disk. Each skip produces one skip note that names the missing path. Skipping one file does not skip later steps that still apply. Do not create empty tracking files.

Then invoke [`ws-changelog`](../ws-changelog/SKILL.md), then [`ws-self-learning`](../ws-self-learning/SKILL.md).

- Done when: existing tracking files in the walk are updated (or skip-noted), changelog ran, and self-learning ran.

## Rules

- en-us; path tokens only; explicit `python` / `node` / `bash` launchers when running scripts.
- Never `git add -A`. Never mkdir a workflow plan tree for a prompt task.
- `ws-spec-update` remains optional body-drift repair, not this tracking bus.
