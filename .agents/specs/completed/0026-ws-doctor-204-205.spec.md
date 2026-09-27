---
id: null
slug: ws-doctor-204-205
title: "Fix ws-doctor GitHub issues #204 and #205"
source: local
specDate: 2026-08-13
---

# Specification — Fix ws-doctor GitHub issues #204 and #205

## Description

Consolidate the two open GitHub issues in `jpolvora/workflow-skills` into one local implementation spec. Both are `ws-doctor` findings: one real documentation gap, one false-positive path resolution.

Sources:

- [Issue #204](https://github.com/jpolvora/workflow-skills/issues/204) — `register_local_spec.py` cited in provider Canonical scripts tables without an explicit `python` launcher
- [Issue #205](https://github.com/jpolvora/workflow-skills/issues/205) — `docs/` markdown links inside skill folders resolved against project root, producing false-positive Missing references / Path errors

### Issue #204 — missing `python` launcher on `register_local_spec.py`

`ws-doctor` Tool / script diagnostics flags managed-script invocations that look like commands (path plus args) without `python` / `node` / `bash`. Two Canonical scripts rows match that rule:

- `.agents/skills/ws-azure-devops-provider/SKILL.md` — `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source azure-devops`
- `.agents/skills/ws-github-provider/SKILL.md` — `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github`

[`tools.md` § Script launchers](.agents/skills/ws-shared/tools.md) requires an explicit launcher. The script exists; this is a documentation gap, not a broken path. Bare path citations without args (for example `github-issue-to-spec.py` with no argv) stay valid path citations and are out of scope.

### Issue #205 — `docs/` prefix false positive in `resolveCitedPath`

In `.agents/skills/ws-doctor/scripts/doctor.js`, `resolveCitedPath()` treats `candidate.startsWith('docs/')` as project-root relative (same bucket as `.agents/`, `bin/`, `specs/`, `test/`). That is correct for hub/top-level files. It is wrong for skill-folder companions:

- `.agents/skills/ws-spec-to-pr/README.md` → `docs/faq.md` exists at `.agents/skills/ws-spec-to-pr/docs/faq.md`
- `.agents/skills/ws-check-harness/PHASES.md` → `docs/specs/`, `docs/testing/`, `docs/faq.md` are skill-relative companions

The `docs/` special-case currently wins before the file-relative branch, so doctor reports Missing references / Path errors for files that exist.

Fix: when the citing file lives under a skill folder (`{skillsRoot}/ws-*/`), resolve plain relative `docs/...` links against the citing file directory. Keep project-root `docs/` resolution for hub and other top-level files.

## Acceptance Criteria

- AC1: In `.agents/skills/ws-github-provider/SKILL.md` Canonical scripts, the Spec of record → workflow copy row invokes `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github`.
- AC2: In `.agents/skills/ws-azure-devops-provider/SKILL.md` Canonical scripts, the Spec of record → workflow copy row invokes `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source azure-devops`.
- AC3: `node .agents/skills/ws-doctor/scripts/doctor.js --skill ws-github-provider` and `--skill ws-azure-devops-provider` do not list those `register_local_spec.py --source` rows under Missing launchers.
- AC4: `resolveCitedPath` for a skill-folder markdown file (for example `.agents/skills/ws-spec-to-pr/README.md` citing `docs/faq.md`) resolves to `{skillsRoot}/ws-spec-to-pr/docs/faq.md` (file-relative), not `{projectRoot}/docs/faq.md`.
- AC5: `resolveCitedPath` for a hub or repo-root file citing `docs/...` still resolves against project root (existing special-case preserved outside skill folders).
- AC6: `node .agents/skills/ws-doctor/scripts/doctor.js --skill ws-spec-to-pr` does not report `docs/faq.md` as a Missing reference or Path error when `.agents/skills/ws-spec-to-pr/docs/faq.md` exists.
- AC7: `node .agents/skills/ws-doctor/scripts/doctor.js --skill ws-check-harness` does not report skill-relative `docs/specs/`, `docs/testing/`, or `docs/faq.md` as Missing references or Path errors when those companions exist under `ws-check-harness/`.
- AC8: `test/test-ws-doctor.js` (or an equivalent existing doctor test file) covers the skill-folder `docs/` file-relative case and the hub/top-level project-root `docs/` case; `npm run test` includes that file and exits 0.

## Child Tasks

### Task #204 — Prefix `register_local_spec.py` Canonical scripts rows with `python`

- **Status:** Open
- **Description:** Edit the two provider SKILL.md Canonical scripts tables only. Do not change `register_local_spec.py` or other Canonical scripts rows that are bare path citations without args.

### Task #205 — File-relative `docs/` resolution inside skill folders

- **Status:** Open
- **Description:** Adjust `resolveCitedPath` in `ws-doctor/scripts/doctor.js` so `docs/` prefix is project-root only when the citing file is not under a skill folder. Add regression coverage in `test/test-ws-doctor.js`.

## Notes

- Tracker origin is GitHub issues #204 and #205; this file is a **local** spec (`source: local`, `id: null`) per `/write-spec`. Downstream workflow copies still go through `ws-local-spec-provider` register, not this skill.
- Out of scope: auto-fix mode in `ws-doctor`; rewriting other Canonical scripts rows that are path citations without args; `ws-check-harness` phases; changing `tools.md` launcher policy.
- Related: existing completed spec `.agents/specs/ws-doctor.spec.md` (v1 doctor skill). This spec is a follow-up bugfix, not a replacement.
- After skill content lands, regenerate integrity (`npm run generate-integrity` && `npm run verify-integrity`) in the same ship commit.
- Close GitHub #204 and #205 when the implementing PR merges.
