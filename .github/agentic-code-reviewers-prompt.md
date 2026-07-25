# Specific Recommendations: workflow-skills (Agent Skills Hub)

Focus review on this repository’s real stack: Cursor/agent skill markdown, Node.js installer/CLI, GitHub Actions, and shell/PowerShell scripts. Prefer findings that break harness integrity, install/update contracts, or portable skill authorship.

## 1. Agent skills and harness integrity

* **Skill structure:** `SKILL.md` frontmatter must keep a unique `name:`. Paths referenced from hubs (`AGENTS.md`, `.agents/AGENTS.md`) must match real folders under `.agents/skills/`.
* **Progressive disclosure:** Do not paste entire skill bodies into hubs or sibling skills. Prefer links to the canonical skill.
* **Portability:** Skills under `.agents/skills/` must stay project-agnostic. Flag hardcoded org/repo names, absolute machine paths, or consumer-specific build/test commands inside skill bodies. Parameterize via `config.json` / `stack.md` / `tools.md`.
* **Language:** Skill content, gates, banners, and pipeline output must stay **en-us**. Flag Portuguese (or other locales) in skill files.
* **Shared vs promoted skills:** Treat `shared/` hub files (`config*`, `tools.md`, `stack.md`, `setup.md`, `gates.md`) as config/docs; do not invent skill folders there unless the change intentionally adds them.
* **No silent managed-skill refactors:** Flag LLM-driven hygiene churn on managed skill scripts (helper reorder, “forward ref” fixes with no runtime proof) when the change is not a verified bug. In consumer/CI context, lasting skill fixes must be suggested as **upstream** PRs to `jpolvora/workflow-skills`, not left as local-only edits that `update` will wipe.
* **STEP-DISPATCH dual-mode:** `spec-to-pr/STEP-DISPATCH.md` is standard-orch only (0–13). Lite must keep its own Steps 1–5; shared skills stay orch-agnostic via `gates.md`.
* **Root seeds:** Installer create-if-missing for `.cursorrules` / `CHANGELOG.md` must never overwrite existing consumer files.
* **Skill folder naming:** Folder id must equal frontmatter `name:`. Pipeline folders use `ws-*` (e.g. `ws-write-spec`). **Forbidden:** numeric `NN-*` prefixes (`00-write-spec`, `01-write-plan`, …). Flag any new or revived `NN-skillname` folder, path, or install id.
* **Invocation names:** Allowed forms are the folder id and optional bare short id — e.g. `ws-write-spec` and `write-spec`, or `check-harness` and `check-harness`. `invocation_names` / hub triggers may list `ws-skillname` and `skillname` only. Do **not** accept retired `NN-*` aliases as invocation or path ids.
* **Skill inventory drift:** When skills are added, removed, or renamed, require an updated skill list in root `AGENTS.md`, `.agents/AGENTS.md` (Workflows vs Extra scope), and site catalog (`docs/index.html` via `node bin/build-site.js` when applicable). Disk folders, hub tables, and package skill lists must stay aligned.
* **Dependency graph:** If skills are added/removed/renamed or orchestrator dispatch changes, `bin/skill-dependencies.json` must be updated. Every dispatched skill id (pipeline `ws-*`, providers, fix-pr loop) must appear in the orchestrator dependency closure (direct or transitive). Missing graph edges are critical.
* **Harness gates (must pass):** Package / harness-affecting PRs must leave **`check-harness`** and **`check-workflows`** with **0 critical** findings. Flag PRs that change skills, hubs, dispatch, or installer inputs without evidence these audits were run (or without noting the obligation).
* **check-harness awareness:** Changes that add/rename/remove skills or routing tables should note the need to update root `AGENTS.md`, `.agents/AGENTS.md`, and regenerate `docs/index.html` via `node bin/build-site.js` when applicable.

## 2. Installer / CLI (`bin/`, `npx github:…`)

* **Documented install forms:** Prefer `npx github:jpolvora/workflow-skills` (or `npx --yes github:…`). Flag `@latest` on the `github:` specifier — npm misparses it and can exit 128.
* **Update contract:** `update` / `update --include-new` must preserve consumer `config.json` while refreshing managed skill copies. Root `.cursorrules` / `CHANGELOG.md` seeds are create-if-missing only.
* **Non-interactive install:** CI/agent paths must not rely on per-skill interactive overwrite prompts; prefer `--yes` / non-TTY-safe behavior.
* **Installer tests:** Changes under `bin/`, installer scripts, skill graph, or integrity inputs must keep installer tests green (`npm run test` / package test suite including local install dry-run). Flag missing test updates when install/update/uninstall behavior changes.
* **ESM / Node:** Match existing ESM patterns; handle Promise rejections; avoid fragile path joins across Windows/Unix.

## 3. Markdown, YAML, and scripts in scope

* **Workflows (`.github/workflows/`):** Correct secrets usage, least-privilege `permissions`, and stable action versions. Reviewer itself must pass `--stack Custom` **with** `--custom-prompt` (or `AGENTIC_CODE_REVIEWERS_CUSTOM_PROMPT`) — never Custom alone.
* **Shell / PowerShell:** Quote paths, fail fast on missing tools, avoid interactive prompts in automation scripts. Prefer validating Python with `python -m py_compile` on repo files over fragile `python <<'PY'` heredocs (backslash/`\'` quoting often yields false `SyntaxError`). Do not treat throwaway temp scanners as product code.
* **JSON schemas / examples:** Keep `config.schema.json` and `config.json.example` aligned when config keys change.

## 4. Review priorities for this repo

High signal:

1. Broken skill routing / phantom paths / duplicate `name:`
2. Numeric `NN-*` skill folders or invocation aliases (`00-…`, `01-…`) instead of `ws-*` / bare `skillname`
3. Skill list / hub / site catalog drift after add/remove/rename
4. `bin/skill-dependencies.json` missing dispatched skills (dependency graph incomplete)
5. Installer/update regressions that wipe `config.json` or block non-interactive install; installer tests not run or failing
6. Harness gates skipped: `check-harness` or `check-workflows` not green (critical findings open)
7. Secrets or tokens committed in examples/workflows
8. Spec-to-PR FSM step continuity breaks (wrong skill folder names, retired step refs)

Low signal (usually skip unless clearly wrong):

* Pure prose style nits in docs
* Formatting-only markdown churn without behavioral impact
* Python same-module “call before `def`” ordering when the callee is defined later in the same file (not a runtime `NameError`)
