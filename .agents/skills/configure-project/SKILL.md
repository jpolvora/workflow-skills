---
name: configure-project
description: >
  Interview and detect project settings to fill or update `.agents/skills/shared/config.json`
  with suggested values. Use when config.json is missing or incomplete, after install when the
  user wants to configure, before spec-to-pr bootstrap, or when the user asks to set up /
  reconfigure workflow config, providers, stack, or verification commands.
---

# configure-project

Fill or refresh consumer `config.json` via detect → suggest → user-gate. Portable: no host-product names; paths use `{plansDir}` tokens after write.

**Config path:** `.agents/skills/shared/config.json` (gitignored). Template: [`shared/config.json.example`](../shared/config.json.example). Schema: [`shared/config.schema.json`](../shared/config.schema.json).

**Callers:** standalone anytime; [`shared/setup.md`](../shared/setup.md) bootstrap step 1; post-install when user opts in.

## Invocation

```
/configure-project [--section <name>] [--detect-only] [--force]
```

| Flag | Effect |
|------|--------|
| `--section` | Only interview that top-level key (`project`, `stack`, `providers`, `verification`, `plans`, `reviews`, `rules`, `domain`, `defaults`) |
| `--detect-only` | Print detections + suggestions; do not write |
| `--force` | Re-interview even when required fields look filled |

## Steps

1. **Ensure file** — If `config.json` missing: `cp` from `config.json.example`. If example missing, STOP (hub not installed).
   - Done when: `config.json` exists on disk (or detect-only with example readable).

2. **Detect** — Scan the consumer repo for stack, SCM, and commands. Apply heuristics in [`INTERVIEW.md`](INTERVIEW.md) § Detection. Build a suggestion map (path → value) without writing yet.
   - Done when: suggestion map covers at least `project`, `providers`/`issueTrackers`, `verification`, and `plans.dir` (defaults OK).

3. **Gap list** — Compare current `config.json` to required keys in INTERVIEW.md § Required. Mark each: filled / placeholder (`<…>` or empty) / missing.
   - Done when: gap list exists; `--force` treats filled as re-ask candidates.

4. **Interview** — For each gap (or `--section` only): user-gate with ≥2 options, **recommended = detected suggestion** first; include **Keep current** / **Skip**. Write accepted values into `config.json` after each section (or batch if user prefers). Never commit `config.json`.
   - Done when: all required gaps resolved or explicitly skipped; optional sections offered once then skippable.

5. **Stack companion** — If `rules.stackFile` target missing, offer: **Generate stack.md** (setup 1b heuristics) / **Skip**.
   - Done when: stack file exists or user skipped.

6. **Validate & handoff** — Confirm JSON parses; required fields non-placeholder; print summary table (`key` → `value`). Tell caller: resume setup / run `/spec-to-pr` or `/spec-to-pr-lite`.
   - Done when: summary shown; `--detect-only` ends after step 2 with no write.

## Rules

- Prefer detect + suggest over blank prompts.
- Do not invent org/repo secrets; leave PAT/env keys as env-var names only.
- `providers.scm` never `local`; hybrid `active=local` + `scm=github|azure-devops` allowed.
- Artifact defaults: `plans.dir` → `.agents/plans`, `reviews.dir` → `.agents/codereviews` unless user picks otherwise.
- Language: en-us.
