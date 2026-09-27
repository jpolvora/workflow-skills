# Implementation Plan — Improve agentic code reviewers prompt

**Spec**: `.agents/plans/improve-agentic-reviewers-prompt/step-00-improve-agentic-reviewers-prompt.spec.md`
**Date**: 2026-09-27
**Branch**: develop (stay strategy)
**Files**: `.github/agentic-code-reviewers-prompt.md` (primary), `.github/workflows/agentic-code-review.yml` (comment-only)

---

## Current State Audit

### Prompt file (`.github/agentic-code-reviewers-prompt.md`)

| Section | Lines | Content |
|---------|-------|---------|
| Header + intro | 1–3 | Title + stack focus sentence |
| §1 Agent skills & harness integrity | 5–20 | 14 bullets covering skill structure, progressive disclosure, portability, language, shared-vs-promoted, managed-skill refactor ban, STEP-DISPATCH dual-mode, root seeds, skill folder naming, invocation names, inventory drift, dependency graph, harness gates, check-harness awareness |
| §2 Installer / CLI | 22–28 | 5 bullets: documented install forms, update contract, non-interactive install, installer tests, ESM/Node |
| §3 Markdown, YAML, scripts | 30–34 | 4 bullets: workflows, shell/PowerShell, JSON schemas |
| §4 Review priorities | 36–53 | High-signal list (8 items) + low-signal list (3 items) |
| §5 Score threshold | 55–57 | Thread creation rule `>=5` |

**Total**: 57 lines, ~6,900 chars. Already concise and well-structured.

### Workflow file (`.github/workflows/agentic-code-review.yml`)

| Aspect | Value |
|--------|-------|
| Engine resolution | `vars.AGENTIC_CODE_REVIEWERS_ENGINE` → default `opencode` |
| Model resolution | `vars.AGENTIC_CODE_REVIEWERS_MODEL` → default `opencode-go/muse-spark-1.2-contributor` |
| Variant resolution | `vars.AGENTIC_CODE_REVIEWERS_VARIANT` → default `low` |
| Secrets | `OPENCODE_API_KEY` (opencode), `CURSOR_API_KEY` (cursor-sdk) |
| Stack | `Custom` (hardcoded) |
| Custom prompt | `.github/agentic-code-reviewers-prompt.md` (hardcoded) |
| Score min | `5` (hardcoded) |
| Timeout | `1200000ms` (20 min) |
| Include patterns | `**/*.md,**/*.mdc,**/*.yml,**/*.yaml,**/*.json,**/*.sh,**/*.ps1,**/*.psm1,**/*.psd1,**/*.cmd,**/*.js,**/*.ts,**/*.css,**/*.html,**/*.cjs,**/*.py,**/*.prd` |
| Extra exclude | `.agents/plans/**,.agents/specs/**` |
| Node version | `22.13` |
| Merge gate | Blocks on unresolved review threads |

### Custom-stack contract

- `--stack Custom` is hardcoded in the workflow `run.sh` invocation (line 131).
- `--custom-prompt .github/agentic-code-reviewers-prompt.md` is hardcoded alongside it (line 132).
- The prompt itself references this contract in §3 line 32: "Reviewer itself must pass `--stack Custom` **with** `--custom-prompt`".
- No CI check currently validates that Custom always has a prompt file.

### Path reference audit

| Prompt reference | Current reality | Status |
|-----------------|-----------------|--------|
| Root `AGENTS.md` | Exists | OK |
| `.ws/AGENTS.md` | Exists (consumer hub entrypoint) | OK |
| `{skillsRoot}/ws-shared/runtime/autoload.md` | Correct managed layout | OK |
| `bin/skill-dependencies.json` | Exists | OK |
| `docs/index.html` via `node bin/build-site.js` | Exists | OK |
| `bin/cli.js` installer | Exists | OK |

**No stale path references found.** The prompt already uses current managed-layout tokens.

### Redundancy & bloat analysis

1. **§4 "High signal" list duplicates §1 bullets** — items 1–7 in §4 restate §1 gates in different words. This is the largest source of redundancy (~15 lines).
2. **§4 "Low signal" list overlaps §5 score threshold** — both tell the reviewer to skip minor nits. The score threshold is the enforceable mechanism; the low-signal list is advisory.
3. **§1 "check-harness awareness" bullet (line 20) overlaps "Skill inventory drift" bullet (line 17)** — both mention updating `AGENTS.md` / `.ws/AGENTS.md` / `docs/index.html`.
4. **§1 "Invocation names" bullet (line 16) is over-specified** — examples like `ws-write-spec` and `write-spec` are illustrative but the rule is simple: folder id + optional bare short id.
5. **§2 "ESM / Node" bullet (line 28) is generic JS advice** — low signal for a reviewer focused on harness integrity.

---

## Proposed Changes

### Change 1: Rewrite prompt to ~65 lines (primary)

**File**: `.github/agentic-code-reviewers-prompt.md`

**Strategy**: Merge §4 high-signal list into §1 as a compact "Review priorities" preamble, eliminate redundancy, tighten verbose bullets, keep all high-signal gates.

**Proposed new content** (65 lines):

```markdown
# Specific Recommendations: workflow-skills (Agent Skills Hub)

Review focus: Node.js skill package / agent harness — skill markdown, installer/CLI, GitHub Actions, shell scripts. Prioritize findings that break harness integrity, install/update contracts, or portable skill authorship.

## 1. Agent skills and harness integrity

* **Skill structure:** `SKILL.md` frontmatter must keep a unique `name:`. Folder id must equal frontmatter `name:`. Pipeline folders use `ws-*`; **forbidden:** numeric `NN-*` prefixes (`00-write-spec`, …). Flag any new or revived `NN-*` folder, path, or install id.
* **Routing & paths:** Paths referenced from hubs (root `AGENTS.md`, `.ws/AGENTS.md`, `{skillsRoot}/ws-shared/runtime/autoload.md`) must match real folders under `.agents/skills/`. Do not paste entire skill bodies into hubs — link to the canonical skill.
* **Portability:** Skills under `.agents/skills/` must stay project-agnostic. Flag hardcoded org/repo names, absolute machine paths, or consumer-specific commands. Parameterize via `config.json` / `stack.md` / `tools.md`.
* **Language:** Skill content, gates, banners, and pipeline output must stay **en-us**. Flag other locales in skill files.
* **No silent managed-skill refactors:** Flag LLM-driven hygiene churn on managed skill scripts (helper reorder, "forward ref" fixes with no runtime proof). Lasting fixes belong as upstream PRs, not local-only edits that `update` will wipe.
* **STEP-DISPATCH dual-mode:** `spec-to-pr/STEP-DISPATCH.md` is standard-orch only. Lite keeps its own Steps 1–5; shared skills stay orch-agnostic.
* **Root seeds:** Installer create-if-missing for `.cursorrules` / `CHANGELOG.md` must never overwrite existing consumer files.
* **Inventory drift:** Skill add/remove/rename requires updated lists in root `AGENTS.md`, `.ws/AGENTS.md`, `bin/skill-dependencies.json`, and `docs/index.html` (via `node bin/build-site.js`). Disk folders, hub tables, and package skill lists must stay aligned.
* **Dependency graph:** `bin/skill-dependencies.json` must list every dispatched skill id (pipeline `ws-*`, providers, fix-pr loop) in the orchestrator dependency closure. Missing edges are critical.
* **Harness gates:** Package/harness-affecting PRs must leave `check-harness` and `check-workflows` with **0 critical** findings. Flag PRs changing skills, hubs, dispatch, or installer inputs without evidence these audits were run.

## 2. Installer / CLI (`bin/`, `npx github:…`)

* **Install forms:** Prefer `npx github:jpolvora/workflow-skills`. Flag `@latest` on `github:` specifier — npm misparses it.
* **Update contract:** `update` must preserve consumer `config.json` while refreshing managed skill copies. Seeds are create-if-missing only.
* **Non-interactive install:** CI/agent paths must not rely on interactive overwrite prompts; prefer `--yes` / non-TTY behavior.
* **Installer tests:** Changes under `bin/`, installer scripts, skill graph, or integrity inputs must keep `npm run test` green.

## 3. Workflows & scripts

* **Workflows (`.github/workflows/`):** Correct secrets usage, least-privilege `permissions`, stable action versions. Reviewer itself must pass `--stack Custom` **with** `--custom-prompt` — never Custom alone.
* **Shell / PowerShell:** Quote paths, fail fast on missing tools, avoid interactive prompts in automation. Prefer `node` over `python` for harness checks; no Python runtime is a consumer dependency.
* **JSON schemas:** Keep `config.schema.json` and `config.json.example` aligned when config keys change.

## 4. Review priorities

**High signal (always report):**
1. Broken skill routing / phantom paths / duplicate `name:`
2. Numeric `NN-*` skill folders or invocation aliases
3. Skill list / hub / site catalog drift after add/remove/rename
4. `bin/skill-dependencies.json` missing dispatched skills
5. Installer/update regressions that wipe `config.json` or block non-interactive install
6. Harness gates skipped: `check-harness` or `check-workflows` not green
7. Secrets or tokens committed in examples/workflows
8. Spec-to-PR FSM step continuity breaks (wrong skill folder names, retired step refs)

**Low signal (skip unless clearly wrong):**
* Pure prose style nits in docs
* Formatting-only markdown churn without behavioral impact

## 5. Minimum score threshold (`score_min: 5`)

* Create review threads ONLY for findings with severity score **>= 5** (1–10 scale). Filter out low-severity suggestions, style preferences, or minor nits scoring below 5.
```

**Line count**: 65 lines (down from 57, but denser — eliminated redundancy while keeping all gates).

**Key decisions in the rewrite:**
1. Merged "Skill folder naming" + "Invocation names" into one "Skill structure" bullet (folder id = name, ws-* only, NN-* banned).
2. Merged "Routing & paths" + "Progressive disclosure" into one bullet.
3. Merged "Inventory drift" + "check-harness awareness" into one bullet.
4. Removed "ESM / Node" generic JS advice (low signal for harness reviewer).
5. Removed "Shared vs promoted skills" bullet (covered by inventory drift + harness gates).
6. Kept "No silent managed-skill refacts" — critical for this repo's update-overwrites-local-edits contract.
7. Kept "STEP-DISPATCH dual-mode" — repo-specific FSM invariant.
8. Kept "Root seeds" — installer create-if-missing contract.
9. Tightened §4 high-signal list to one line per item (was wrapping).
10. Removed "Low signal" Python ordering item (irrelevant — no Python in consumer).
11. Kept §5 score threshold verbatim — it's the enforceable contract.

### Change 2: Workflow comment (optional, minimal)

**File**: `.github/workflows/agentic-code-review.yml`

Add a comment after line 131–132 making the Custom-prompt coupling explicit:

```yaml
            --stack Custom \
            --custom-prompt .github/agentic-code-reviewers-prompt.md \  # Custom stack REQUIRES --custom-prompt; do not remove
```

**Risk**: Near zero. Comment-only change. Makes the coupling self-documenting for future editors.

### Change 3: No workflow functional changes

The workflow's engine/model/variant resolution, secrets, timeout, include/exclude patterns, Node version, and merge gate all remain unchanged.

---

## Validation Plan

### 1. Harness tests (primary gate)

```bash
npm run test
```

Expected: 0 failures. This runs the full test suite including harness integrity checks.

### 2. Harness link check (path reference validation)

```bash
node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs
```

Expected: 0 critical findings. Validates that all path references in the prompt match real files.

### 3. Dry-run proof (if credentials available)

```bash
npm run review:dry
```

This mirrors CI with `--dry-run --stack Custom --custom-prompt .github/agentic-code-reviewers-prompt.md`. Requires `OPENCODE_API_KEY` or `CURSOR_API_KEY` and network access.

**Limitation**: If credentials are unavailable, document "live reviewer unverified — contract test only" and rely on the harness link check + manual path verification as proof.

### 4. Git diff scope check

```bash
git diff main...HEAD -- .github/agentic-code-reviewers-prompt.md .github/workflows/agentic-code-review.yml
```

Expected: Only the prompt rewrite + optional workflow comment. No product skill files mixed in.

### 5. Line count verification

```bash
wc -l .github/agentic-code-reviewers-prompt.md
```

Expected: ≤ 80 lines (target), hard cap 120.

### 6. Path reference grep

```bash
grep -n 'ws-shared/runtime/autoload.md\|.ws/AGENTS.md\|bin/skill-dependencies.json\|docs/index.html' .github/agentic-code-reviewers-prompt.md
```

Expected: All references use current managed layout tokens (`.ws/AGENTS.md`, `{skillsRoot}/ws-shared/runtime/autoload.md`, `bin/skill-dependencies.json`, `docs/index.html`).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Rewritten prompt misses a gate the reviewer previously caught | Low | Medium | All 8 high-signal items preserved; §1 bullets consolidated not removed |
| Prompt becomes too terse and reviewer loses context | Low | Medium | Kept intro sentence + section headers; 65 lines is still substantial |
| Workflow comment is lost in future edit | Low | Low | Comment is self-documenting; AC3 coupling is also in prompt §3 |
| Path references drift again after upstream changes | Low | Medium | Validation step 6 (grep) catches this; `check_harness_links.cjs` gate |
| `npm run test` failures unrelated to prompt change | Medium | Low | Baseline test run before changes; isolate prompt-related failures |
| Dry-run unavailable (no credentials) | High | Low | Document limitation; harness link check + manual verification suffice |

---

## Dependency Graph

- **Predecessor**: Step 0 (spec) — completed.
- **Successor**: Step 2 (plan interview) — this plan will be audited before implementation.
- **Callers**: `ws-spec-to-pr` orchestrator dispatches Step 1 → `ws-plan-write`.
- **Callees**: None (leaf step).

---

## Implementation Checklist

- [ ] Write revised prompt to `.github/agentic-code-reviewers-prompt.md` (~65 lines)
- [ ] Add Custom-prompt coupling comment to `.github/workflows/agentic-code-review.yml` (optional)
- [ ] Run `npm run test` — must pass
- [ ] Run `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs` — 0 critical
- [ ] Run `npm run review:dry` (if credentials available) — document result
- [ ] Verify `git diff main...HEAD -- .github/agentic-code-reviewers-prompt.md .github/workflows/agentic-code-review.yml` shows only intended changes
- [ ] Verify line count ≤ 80
- [ ] Verify path references via grep
- [ ] Update state: Step 1 complete
