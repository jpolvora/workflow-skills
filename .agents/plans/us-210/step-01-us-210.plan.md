# Implementation Plan — us-210

**Slug:** us-210  
**Workflow:** lite · autoMode · fullMode  
**Branch:** feature/us-210 → main

## Goal

Ship Extra skill `ws-preview` (`pipeline-review`) — external cursor-reviewer dry-run with portable stack/branch from config, always `--dry-run`, no PR thread publish.

## Tasks

### 1. Skill body

Create `.agents/skills/ws-preview/SKILL.md`:
- frontmatter `name: ws-preview`, `disable-model-invocation: true`
- invocation_names: ws-preview, pipeline-review, cursor-reviewer-dry-run, exec-code-review
- Loaded banner, Done when on each step, en-us
- Complement line vs ws-code-review

### 2. Runner script

`ws-preview/scripts/run_dry_run.sh`:
- Resolve `stack.id` / `preview.stack` and `project.baseBranch` from config (flags override)
- Download cursor-reviewer `release` run.sh; `--dry-run --verbose`; default `--include-uncommitted`
- No MarchanteERP literals

### 3. ws-code-review complement

One-line pointer to ws-preview in ws-code-review SKILL.md.

### 4. Package + hubs

- `bin/skill-dependencies.json` + `ws-shared/skill-dependencies.json` Extra: add ws-preview
- Root `AGENTS.md` + `ws-shared/AGENTS.md`: Extra table + task router; catalog `extra = 3`
- `README.md`: Extra skill row

### 5. Tests + ship prep

- `test/test-install.js`: Extra package includes ws-preview; removable list for --include-new
- `npm run test`, `generate-integrity`, `verify-integrity`, `build-site:bump` → 0.3.21
- ws-check-harness 0 critical

## Verification

- AC1–AC6 from spec
- `npm run test` exit 0
- No live CURSOR_API_KEY required for tests

## Out of scope

agentic-code-reviewers dispatcher, orch Step 6 wiring, publishing threads, required preview.backend config
