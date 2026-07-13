---
us: "spec-provider-skills"
reportDate: 2026-07-13
sourcePlans: ["step-02-spec-provider-skills.plan.refined.md"]
githubSource: none
---

# Implementation Report — spec-provider-skills

**Generated on:** 2026-07-13
**Reference Plan:** step-02-spec-provider-skills.plan.refined.md
**Exec plan:** step-03-spec-provider-skills.plan.exec.md
**Baseline:** `5546973c91a26a879bbffe9e0095a3fe32b15d80` (develop)
**Verification method:** static code/docs audit + shim `--help` smoke + `npm run tests -- --local` (pass)

## Quick Score

| Metric | Weight | Score (0–10) | Notes |
|--------|--------|--------------|-------|
| Completeness | 40% | **9.5** | All three providers, config, shims, orch/08/09/11/00 wiring, AGENTS, tests, site present |
| Correctness & Style | 35% | **9.0** | Delegation + dual-mode + en-us ADO helper; progressive disclosure held |
| Tests | 25% | **9.5** | `npm run tests -- --local` passed (canonicity, install, update `--include-new`, shims) |

**Weighted average:** **9.3** → **APPROVE** (≥ 7)

Live remote `fetch-to-spec` against a real GitHub issue / ADO work item was **not** executed (skills-hub verification is document + script + install canonicity). That does not fail ACs given agent-contract delivery.

## Result by Feature (Plan & ACs)

| Feature | Situation | Detail / Evidence |
|---------|-----------|-------------------|
| AC1 — Three provider skills + dual-mode + scripts | **Implemented** | `.agents/skills/github-provider/SKILL.md` (frontmatter L1–6; Standalone L19 / Workflow L36; `scripts/` with converter + thread scripts). `.agents/skills/azure-devops-provider/SKILL.md` (L1–6, L19/L37; `scripts/ado-workitem-to-spec.py`, `fix_pr_azure_context.py`). `.agents/skills/local-spec-provider/SKILL.md` (L1–10, L23/L37; `scripts/detect_specs_dir.py`, `register_local_spec.py`). |
| AC2 — GitHub entry via provider; orch no raw `gh` recipes | **Implemented** | Orchestrator dispatch table + resolution algorithm in `spec-to-pr/SKILL.md` (~L362–402); grep finds **no** `gh issue view` / `az boards` / `gh pr create` recipe bodies in orchestrator. Recipes live in `github-provider/SKILL.md` (`fetch-to-spec` ~L102–112). Shim `spec-to-pr/scripts/github-issue-to-spec.py` forwards to canonical provider script (`--help` OK). |
| AC3 — ADO entry via azure-devops-provider | **Implemented** | `azure-devops-provider/SKILL.md` documents `ADO {id}`, `{org}/{project}#{id}`, PAT/env (~L66–105, L99+). Canonical `ado-workitem-to-spec.py` under provider `scripts/`; shim at old path (`--help` OK). Orchestrator routes ADO forms to provider (~L363, L383). |
| AC4 — Local provider + specsDir detect/register | **Implemented** | `local-spec-provider` documents `plans.specsDir` default `specs`, flat + nested layouts, `source: local` (~L57–72, L80). Scripts: `detect_specs_dir.py` (`--detect`/`--ensure`/`--validate`), `register_local_spec.py`. `00-write-spec/SKILL.md` optional mirror delegates to local-spec-provider (~L76–84). |
| AC5 — ship-pr / fix-pr / goal-fix-pr use `providers.scm` | **Implemented** | `11-ship-pr/SKILL.md` Phases 4–6 resolve scm → `create-pr` / checks / `merge-pr` (~L80–99); explicitly forbids embedding raw `gh`/`az` happy paths. `08-fix-pr/SKILL.md` list/resolve via scm (~L47–98); README platform table points at provider canonical paths. `09-goal-fix-pr/SKILL.md` thread count via scm `list-threads` (~L44–60); forbids hardcoded `gh pr view … jq`. |
| AC6 — Standalone invoke (fetch + auth + PR intent) | **Implemented** | Each provider has Standalone Mode examples: GH/ADO `fetch-to-spec`, `validate-auth`, `create-pr`; local `fetch-to-spec` + local `validate-auth`; local PR intents **delegate** to `providers.scm` (no silent no-op). |
| AC7 — config schema + example `providers` + `specsDir` | **Implemented** | `config.schema.json` `providers.active` enum `github\|azure-devops\|local`, `providers.scm` enum `github\|azure-devops` (L28–43); `plans.specsDir` default `"specs"` (L85–88); description documents omit-providers → `issueTrackers` inference. `config.json.example` includes `providers` + legacy comment (L71–75) and canonical `*Script` paths (L83, L92). |
| AC8 — AGENTS routes + local tests + site catalog | **Implemented** | Root `AGENTS.md`: pipeline table L44–46, Layer 2 L120–122, Task Router L175–177. `docs/index.html` lists all three providers. `npm run tests -- --local` **passed** (2026-07-13): canonicity (providers + shims), install of 25 skills including providers, `update --include-new` reinstall. README/`tools.md`/`faq.md` document `--include-new`. |
| AC9 — Converter scripts reachable (move + shim) | **Implemented** | Canonical logic under provider `scripts/` (GH converter ~183 LOC; ADO converter ~303 LOC; not duplicated in shims). Thin shims: `spec-to-pr/scripts/github-issue-to-spec.py`, `ado-workitem-to-spec.py`; `08-fix-pr/scripts/fetch_threads.cjs`, `resolve_thread.cjs`, `fix_pr_azure_context.py`. All shim `--help` / argparse entrypoints succeed. `test-install.js` asserts both shim and canonical paths. |
| Plan Step 1 — Provider scaffolds | **Implemented** | T1–T3 deliverables present (dual-mode, intents, frontmatter convention). |
| Plan Step 2 — Move scripts + en-us ADO | **Implemented** | Migration map complete. `fix_pr_azure_context.py` prefers `issueTrackers.azureDevOps` + env PAT; legacy path fallback; no Portuguese user-facing strings found via accented/PT keyword scan. |
| Plan Step 3 — Config + inference | **Implemented** | Schema + example as AC7; script path fields point at provider paths. |
| Plan Step 4 — Orchestrator + ARTIFACTS + FAQ + 00 mirror | **Implemented** | Spec Protocol dispatch; ARTIFACTS entry Action → provider `fetch-to-spec` (L46–48); FAQ provider section + `--include-new`; 00 mirror hook. |
| Plan Step 5 — 11 / 08 / 09 scm wiring | **Implemented** | As AC5. |
| Plan Step 6 — Hub / tests / site | **Implemented** | AGENTS + test-install + build-site catalog + consumer docs. |

*Situation values restricted to: **Implemented**, **Not implemented**, or **Implemented differently**.*

## Additional Features Beyond Original Plan

| Feature / Extra Behavior | Location in Code | Note |
|--------------------------|------------------|------|
| Install test asserts dual-mode / frontmatter smoke + example `providers` keys | `test/test-install.js` (~L113–192, L405–420) | Stronger than minimal AC8 assert |
| `update --include-new` exercised for a provider skill in suite | `test/test-install.js` Phase 2 | Matches D12 / FAQ guidance |
| Local scripts `--json` machine-readable output | `detect_specs_dir.py`, `register_local_spec.py` | Helpful for agent automation; not required by AC |

## Gaps and Next Steps

1. **No live remote smoke** — Optional before PR: dry-run `github-provider fetch-to-spec` against a known issue id and/or ADO id with PAT (manual/agent). Does not block AC approval for this hub.
2. **Packaging hygiene** — `npm pack` included `azure-devops-provider/scripts/__pycache__/*.pyc` (and a shim `__pycache__`). Prefer excluding `__pycache__` from the published tarball (`.npmignore` / pack files) in a follow-up; not an AC failure.
3. **Harness audit** — Per `AGENTS.md` post-skill-edit policy: offer `/check-harness` (Phases 0–5c) before merge; not auto-run in this verification step.
4. **`.agents/AGENTS.md`** — Informal stub index under `.agents/` (not the root hub `AGENTS.md`). Out of AC scope; ignore or reconcile separately if consumers expect a full mirror.

## Pre-PR checklist (from refined plan §7)

- [x] Three provider skills dual-mode + intents (AC1)
- [x] Converters moved; old paths via shims (AC9)
- [x] ADO helper en-us; prefers `issueTrackers.azureDevOps`
- [x] `providers` + `plans.specsDir` in schema/example (AC7)
- [x] Orchestrator delegates `fetch-to-spec` (AC2–AC4)
- [x] `11` / `08` / `09` delegate SCM (AC5)
- [x] Standalone sections (AC6)
- [x] `AGENTS.md` Layer 2 + Task Router (AC8)
- [x] `npm run tests -- --local` passes
- [x] Site catalog lists providers
- [ ] Harness audit offered to user (process)
- [ ] Live GH/ADO fetch smoke (optional)

## Verdict

**Pass / approve for Step 6.** All AC1–AC9 are **Implemented** with file evidence. Weighted Quick Score **9.3**. Safe to advance to Step 7+ (code review / integration) without re-implementation.
