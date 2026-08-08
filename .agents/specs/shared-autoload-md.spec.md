---
id: null
slug: shared-autoload-md
title: "Shared autoload.md and configure-project root AGENTS.md generation"
source: local
specDate: 2026-08-08
---

# Specification — Shared autoload.md and configure-project root AGENTS.md generation

## Description

Consumers need an easy, portable way to autoload a fixed set of engineering skills on every prompt without hand-maintaining dual-hub tables. Today, `ws-shared/AGENTS.md` keeps several skills on-demand (`ws-tdah`, `ws-senior-developer`, `ws-fable-method`), while optional root `AGENTS.md` overrides are documented but not generated.

### Solution

1. Ship and maintain `{sharedDir}/autoload.md` (default `.agents/skills/ws-shared/autoload.md`) as the **canonical list** of skills that are always applied when a project root `AGENTS.md` references that file.
2. Extend `ws-configure-project` so that, after config interview (or on an explicit section), it **generates or refreshes** a thin project-root `AGENTS.md` that:
   - Points agents at `{sharedDir}/AGENTS.md` for the consumer hub.
   - Instructs agents to load every skill listed in `{sharedDir}/autoload.md` as always-applied / every-prompt (or the trigger documented per row).
3. When writing skill paths into `autoload.md` and root `AGENTS.md`, `ws-configure-project` **detects install scope** (project-local `{skillsRoot}` vs global `{globalSkillsRoot}`) per skill and emits **harness-approved** path forms only (repo-root-relative `.agents/skills/...` when the skill exists project-locally; otherwise declared token form `{globalSkillsRoot}/ws-<id>/SKILL.md` or hybrid-resolution prose that expands via `tools.md` Path tokens). Never write absolute author-machine paths (`C:\...`, `/Users/...`).
4. Update `ws-check-harness` so consumer audits validate `autoload.md` entries (skill id exists under `{skillsRoot}` and/or `{globalSkillsRoot}`, path form is relative or declared token) and treat a root `AGENTS.md` that references `autoload.md` as the intentional consumer root override (not dual-hub drift).

### Default autoload set

| Skill | Role |
|-------|------|
| `ws-senior-developer` | Engineering delivery gate |
| `ws-self-learning` | MEMORY consult / trap write |
| `ws-changelog` | Task completion history |
| `ws-fable-method` | Structured problem-solving loop |
| `ws-tdah` | Action-first reply shape |

### Non-goals

- Do not require root `AGENTS.md` for consumers who skip this step; absence remains OK for harness consumer mode.
- Do not change installer behavior to silently overwrite an existing consumer root `AGENTS.md` without `ws-configure-project` / user-gate.
- Do not move the consumer hub SoT out of `{sharedDir}/AGENTS.md`; root file stays thin and delegates.
- Do not add `ws-karpathy-guidelines` to this default set unless already covered by the shared hub mandatory table (out of scope for this list).

## Acceptance Criteria

- AC1: Upstream ships a template `{sharedDir}/autoload.md` (and installer seeds it into the project hub when missing) that lists exactly the default set: `ws-senior-developer`, `ws-self-learning`, `ws-changelog`, `ws-fable-method`, `ws-tdah`, each with a portable path column and a trigger of always-applied / every prompt (or equivalent clear wording).
- AC2: `ws-configure-project` gains a step (or `--section autoload`) that creates or updates `{sharedDir}/autoload.md` with the default set when missing, and offers user-gate options: Generate/Refresh root `AGENTS.md` (**Recommended**), Keep current root `AGENTS.md`, Skip.
- AC3: When Generate/Refresh is accepted, `ws-configure-project` writes project-root `AGENTS.md` that (a) references `{sharedDir}/AGENTS.md` as the consumer hub, (b) instructs agents to load all skills listed in `{sharedDir}/autoload.md` as always-applied, and (c) includes a short precedence note that root autoload overrides shared-hub on-demand defaults for those skills.
- AC4: Path emission detects per-skill install location: if `SKILL.md` exists under project `{skillsRoot}/ws-<id>/`, use repo-root-relative `.agents/skills/ws-<id>/SKILL.md` (or `{skillsRoot}/...` in prose); else if only under `{globalSkillsRoot}`, use declared `{globalSkillsRoot}/ws-<id>/SKILL.md` (never absolute filesystem paths). Mixed hybrid installs may list project paths for local overrides and global tokens for the rest.
- AC5: Generated paths and Markdown links in `autoload.md` and root `AGENTS.md` pass `ws-check-harness` Phase 2 path validation (relative or declared tokens only; no absolute paths; linked/referenced `SKILL.md` files resolve under `{skillsRoot}` and/or `{globalSkillsRoot}`).
- AC6: `ws-check-harness` consumer mode does not flag dual-hub drift solely because root `AGENTS.md` autoloads skills that `ws-shared/AGENTS.md` documents as on-demand, when root explicitly references `autoload.md` (or documents the consumer root override). Missing root `AGENTS.md` remains OK.
- AC7: `ws-check-harness` reports a warning (not critical) when `autoload.md` lists a skill id whose `SKILL.md` is missing from both `{skillsRoot}` and `{globalSkillsRoot}`, with a suggested fix (install skill or remove row).
- AC8: Docs/hubs updated for the feature: `ws-configure-project/SKILL.md` (+ INTERVIEW if needed), `ws-shared/AGENTS.md` § Consumer root override (point at `autoload.md`), and upstream root / packaged indexes only as needed for configure-project behavior — en-us, harness-neutral, no host product names.
- AC9: Automated tests cover: (1) configure-project (or a helper script it documents) writes `autoload.md` + root `AGENTS.md` with project-local paths when skills are under `.agents/skills`; (2) writes `{globalSkillsRoot}` token paths when skills exist only globally; (3) does not invent absolute paths; (4) consumer tree without root `AGENTS.md` still passes harness consumer-mode expectations.

## Notes

- `{sharedDir}` = `.agents/skills/ws-shared` by default; expand per `ws-shared/tools.md` Path tokens.
- `autoload.md` is consumer-hub adjacent: treat as **consumer-owned** once written under the project hub (preserve on skill `update`, same class as STACK/MEMORY policy), while upstream keeps a seed/template for fresh configure/install.
- Opt-out phrases for `ws-tdah` / `ws-senior-developer` remain valid when those skills are autoloaded via root.
- Related prior work: dual-hub consumer root override; global vs project skill installation; remove consumer `.agents/AGENTS.md` requirement (this feature uses **repo-root** `AGENTS.md`, not packaged `.agents/AGENTS.md`).
- Downstream: register via `ws-local-spec-provider` before `ws-write-plan` / orch when a workflow run needs `{us-dir}/step-00-`.
