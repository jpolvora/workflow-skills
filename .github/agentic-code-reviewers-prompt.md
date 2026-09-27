# Specific Recommendations: workflow-skills (Agent Skills Hub)

Review focus: Node.js skill package / agent harness — skill markdown, installer/CLI, GitHub Actions, shell scripts. Prioritize findings that break harness integrity, install/update contracts, or portable skill authorship.

## 1. Agent skills and harness integrity

**Review priorities — high signal (always report):**
1. Broken skill routing / phantom paths / duplicate `name:`
2. Numeric `NN-*` skill folders or invocation aliases
3. Skill list / hub / site catalog drift after add/remove/rename
4. `bin/skill-dependencies.json` missing dispatched skills
5. Installer/update regressions that wipe `config.json` or block non-interactive install
6. Harness gates skipped: `check-harness` or `check-workflows` not green
7. Secrets or tokens committed in examples/workflows
8. Spec-to-PR FSM step continuity breaks (wrong skill folder names, retired step refs)

* **Skill structure:** `SKILL.md` frontmatter must keep a unique `name:`. Folder id must equal frontmatter `name:`. Pipeline folders use `ws-*`; **forbidden:** numeric `NN-*` prefixes (`00-write-spec`, …). Flag any new or revived `NN-*` folder, path, or install id.
* **Routing & paths:** Paths referenced from hubs (root `AGENTS.md`, `.ws/AGENTS.md`, `{skillsRoot}/ws-shared/runtime/autoload.md`) must match real folders under `.agents/skills/`. Do not paste entire skill bodies into hubs — link to the canonical skill.
* **Portability:** Skills under `.agents/skills/` must stay project-agnostic. Flag hardcoded org/repo names, absolute machine paths, or consumer-specific commands. Parameterize via `config.json` / `STACK.md` / `tools.md`.
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

## 4. Minimum score threshold (`score_min: 5`)

* Create review threads ONLY for findings with severity score **>= 5** (1–10 scale). Filter out low-severity suggestions, style preferences, or minor nits scoring below 5. Skip pure prose style nits and formatting-only markdown churn without behavioral impact.
