---
id: 56
slug: us-56
title: "Installer: github:@latest exits 128; interactive overwrite blocks non-interactive install"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/56"
specDate: 2026-07-16
---

# Specification — Installer: github:@latest exits 128; interactive overwrite blocks non-interactive install

**State:** open

## Description

## Summary

Installing/updating from a consumer repo (`matrix`) exposed two installer problems:

1. **Critical:** documented `npx github:jpolvora/workflow-skills@latest` fails with **exit 128** and almost no output.
2. **High:** interactive full install cannot be automated (per-skill overwrite prompts; `console.clear()`; no `--yes` / non-interactive install flags).

Workaround that succeeded on an existing consumer:

```bash
npx --yes github:jpolvora/workflow-skills update --include-new
```

## Environment

- OS: Windows 10 (Git Bash + CMD)
- Node: v22.22.2 (nvm4w)
- npm: 10.9.7
- Consumer: existing `.agents/skills/` tree (reinstall / update path)

## Bug 1 — `@latest` on `github:` → exit 128

### Repro

```bash
npx --yes github:jpolvora/workflow-skills@latest --version
# → exit 128, empty stdout

npx --yes github:jpolvora/workflow-skills --version
# → prints version, exit 0
```

### Root cause

npm misparses `github:jpolvora/workflow-skills@latest`. Observed underlying git call:

```text
git --no-replace-objects ls-remote ssh://git@github.com/null/latest.git
→ Permission denied (publickey) / fatal: repository does not exist
→ npm error code 128
```

So `@latest` is **not** “bypass npx cache / fetch tip of main”. It breaks the `github:` specifier (resolves toward `null/latest`).

### Docs that teach the broken form

`bin/cli.js` `printHelp()` currently documents:

```text
npx github:jpolvora/workflow-skills@latest       Always fetch the latest from GitHub (bypass npx cache)
```

Same guidance may appear in README / catalog site. Those should be corrected.

### Suggested fix

- Remove `@latest` from all `github:` examples.
- Document real cache-bust options, e.g.:

```bash
npx --yes github:jpolvora/workflow-skills
# or clear npx cache, then rerun without @latest
```

- Optional: publish `workflow-skills` on npm so `npx workflow-skills@latest` is a valid path.
- Add a short **Troubleshooting** table (exit 128 ↔ drop `@latest`).

## Bug 2 — Interactive install unusable for agents / pipes

### Repro

```bash
printf 'f\ny\n' | npx --yes github:jpolvora/workflow-skills
```

Selecting Full (`f`) then install (`y`) still prompts **Overwrite? (y/n)** for **every** existing skill. Piped stdin ends before overwrite loop finishes; install aborts incomplete.

Also: `console.clear()` in `runInteractive` fights non-TTY / logged installs.

### Suggested fix

1. **Non-interactive flags** (preferred):

```bash
npx github:jpolvora/workflow-skills install --full --yes
npx github:jpolvora/workflow-skills install --package workflows --yes
npx github:jpolvora/workflow-skills install --skills spec-to-pr,08-fix-pr --yes
```

`--yes` = overwrite skill dirs, always preserve `config.json` (same contract as `update`).

2. **Overwrite UX:** one confirmation for N existing skills, or default overwrite+preserve-config; if `!process.stdin.isTTY`, require `--yes` or exit with a clear error (no silent hang).

3. **TTY guard:**

```js
if (process.stdout.isTTY) console.clear();
```

4. Keep `update` / `update --include-new` as the reinstall path; align `install --yes` copy logic with update (no per-skill prompt).

## Nice-to-haves (lower priority)

- README troubleshooting for SSH/`publickey` when npm falls back to `ssh://git@…`.
- Avoid accidental execution of `bin/build-site.js` when tooling globs `bin/*` (site builder expects repo-root `AGENTS.md`; not the consumer install entrypoint).

## Proposed PR order

1. Fix help/README/site: remove `@latest` from `github:` examples + troubleshooting note.
2. Add `install --full|--package|--skills --yes` (or equivalent).
3. One-shot overwrite + `isTTY` for `console.clear()`.
4. Optional npm publish so `@latest` works on the registry package name.

## Acceptance Criteria

- AC1: `npx --yes github:jpolvora/workflow-skills --version` documented as the canonical form; no `@latest` on `github:` examples.
- AC2: Running the old `@latest` form either fails with an explicit CLI/docs warning, or is no longer recommended anywhere in-repo.
- AC3: Agent/CI can install or refresh full package non-interactively without per-skill overwrite prompts.
- AC4: `config.json` remains preserved on overwrite/update.
- AC5: `update --include-new` remains supported and documented as the existing-consumer refresh path.

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
