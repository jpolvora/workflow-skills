---
id: 210
slug: us-210
title: "feat: add ws-preview (pipeline-review) skill"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/210"
labels: [enhancement]
specDate: 2026-08-15
---

# Specification — feat: add ws-preview (pipeline-review) skill

**State:** open
**Labels:** enhancement

## Description

## Proposal

Add an optional, user-invoked Extra skill **`ws-preview`** (`pipeline-review`) that runs an **external / CI-shaped code review dry-run** on the current branch (optionally including uncommitted changes) **without publishing PR threads**.

This is **not** [`ws-code-review`](.agents/skills/ws-code-review/SKILL.md) (in-agent pre-push / orch Step 6). `ws-preview` wraps a **pipeline reviewer** so consumers can simulate what CI would post.

**Consumer seed:** MarchanteERP currently keeps a local product skill `cursor-reviewer-dry-run` that clones [`jpolvora/cursor-reviewer`](https://github.com/jpolvora/cursor-reviewer) via public `run.sh`. That body is the example implementation for v1 (default backend = cursor-reviewer dry-run).

**Follow-up (out of the first PR, tracked here as intent):** a later skill (or backends under `ws-preview`) will dispatch **agentic-code-reviewers** *or* cursor dry-run. Do not block v1 on that dispatcher. Ship `ws-preview` as the stable user-facing id so consumers can migrate off local `cursor-reviewer-dry-run`.

## Intended behavior

- **User-invoked only** (`disable-model-invocation: true`). Triggers: `/ws-preview`, `/pipeline-review` (keep `cursor-reviewer-dry-run` / `exec-code-review` as aliases while migrating).
- Always pass `--dry-run` to the backend. Never publish threads.
- Default: include uncommitted changes. Omit only when the user asks for committed-only.
- Long-running: Shell `block_until_ms` ≥ 600000 (clone + `npm ci` + LLM).
- Stop after the summary. Fixes only if the user asks.
- `exit 0` with findings is a successful dry-run, not a clean review.
- If `CURSOR_API_KEY` (or the configured backend key) is unset: stop; print `yes`/`empty` only — do not echo secrets.

## Portability (do not copy consumer hardcoding)

The seed skill hardcodes `--stack abp/angular`, `--target-branch refs/heads/master`, and pt-BR reporting. Upstream `ws-preview` must read from `{sharedDir}/config.json` (or documented flags):

| Concern | Consumer seed | Upstream |
|---------|---------------|----------|
| Stack | `--stack abp/angular` | `stack.id` / a dedicated `preview.stack` (or flag) |
| Target branch | `refs/heads/master` | `project.baseBranch` (or flag) |
| Report language | pt-BR | consumer/session language; skill body **en-us** |
| Backend | cursor-reviewer `run.sh` only | v1: cursor-reviewer; later: pluggable (agentic-code-reviewers, etc.) |

## Example skill body (consumer seed)

Use as the **v1 recipe**, then generalize flags/stack/branch as in the table above. Do not keep MarchanteERP-only literals in the shipped skill.

```markdown
---
name: cursor-reviewer-dry-run
description: Local cursor-reviewer dry-run that simulates the CI pipeline review, including uncommitted changes, without publishing PR threads.
disable-model-invocation: true
version: 1.0
invocation_names:
  - cursor-reviewer-dry-run
  - exec-code-review
  - pipeline-review
---

# cursor-reviewer-dry-run

> When this skill is loaded, output "cursor-reviewer-dry-run loaded."

Simulate `azure-pipelines-cursor-code-review.yml` on the current branch via the public `run.sh`. Not [`ws-code-review`](../ws-code-review/SKILL.md) (in-agent pré-push / orch Step 6).

**Flags:** always `--dry-run --verbose --include-uncommitted --stack abp/angular --target-branch refs/heads/master`. Add `--model <id>` or another `--target-branch` only when the user asked. Omit `--include-uncommitted` only when the user asks for committed-only.

## Steps

1. **Prereqs** — From repo root:
   ```bash
   echo "CURSOR_API_KEY set: ${CURSOR_API_KEY:+yes}"
   node -v
   git rev-parse --verify origin/master || git rev-parse --verify master
   ```
   - Done when: key prints `yes`, Node is ≥ 22.13, and `origin/master` or `master` (or the chosen target) exists.
   - If the key is unset: stop and tell the user to export `CURSOR_API_KEY`. Print `yes`/`empty` only.

2. **Run** — From repo root, Shell `block_until_ms` ≥ 600000 (clone + `npm ci` + LLM). Keep `--dry-run` on every invocation.
   ```bash
   curl -fsSL https://raw.githubusercontent.com/jpolvora/cursor-reviewer/main/run.sh | bash -s -- \
     --dry-run --verbose --include-uncommitted --stack abp/angular --target-branch refs/heads/master
   ```
   Append extra flags to that command when the user asked for them. Drop `--include-uncommitted` only for committed-only.
   - Done when: the process exits and stdout has the reviewer summary or a hard error. A timeout is a failed run.

3. **Report** — Summarize in pt-BR: finding counts and top issues. `exit 0` with findings is a successful run, not a clean review. Stop after the report (fixes only if the user asks).
   - Done when: the user has the summary (or the hard-error cause) and no PR threads were published.

## Runner

- Clones `cursor-reviewer` branch `release` into `.tmp-cursor-reviewer`, runs `npm ci --omit=dev`, deletes the folder after.
- Diff: `{target}...HEAD` plus the working tree (`--include-uncommitted`). `--dry-run` prints thread previews.
- Findings may appear with `exit 0`.
```

## Scope and integration

- Folder / frontmatter `name:`: `ws-preview`.
- Package: **Extra** (optional; not orch-required). Hub: Extra table + Task router (`pipeline review` / `preview CI review`).
- Register in `bin/skill-dependencies.json` Extra package; regenerate `bin/skill-integrity.json`.
- Explicit launchers per `tools.md` (`bash` / `curl` recipe as today, or a thin `node` wrapper if we stop piping `run.sh`).
- Document distinction vs `ws-code-review` in both skill bodies (one-line complement).
- Optional later: config key e.g. `preview.backend: cursor-reviewer | agentic-code-reviewers` — **do not require** it for v1.

## Out of scope (follow-up)

- New skill that calls **agentic-code-reviewers** (or a second cursor-reviewer wrapper). `ws-preview` stays the user-facing id; backends can be composed later.
- Wiring `ws-preview` into `ws-spec-to-pr` Step 6 (keep Step 6 = `ws-code-review` unless a later issue asks otherwise).
- Publishing PR threads (always dry-run).

## Acceptance Criteria

- AC1: Installable `.agents/skills/ws-preview/SKILL.md` (`name: ws-preview`, user-invoked, loaded banner, `Done when` on each step).
- AC2: Invocation names include `ws-preview` and `pipeline-review`.
- AC3: v1 recipe matches the seed (cursor-reviewer `run.sh`, `--dry-run`, no thread publish) with **config/flag** stack + `baseBranch` (no ABP/master hardcoding).
- AC4: Extra package + hub Extra/Task router + `skill-dependencies.json` + integrity manifest.
- AC5: Complement line vs `ws-code-review`; skill body en-us.
- AC6: `ws-check-harness` clean for the new Extra skill (present on disk ⇒ listed in Extra; missing ⇒ intentional omission).

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
