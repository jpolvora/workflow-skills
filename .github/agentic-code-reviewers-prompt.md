# Specific Recommendations: workflow-skills (Agent Skills Hub)

Focus review on this repository’s real stack: Cursor/agent skill markdown, Node.js installer/CLI, GitHub Actions, and shell/PowerShell scripts. Prefer findings that break harness integrity, install/update contracts, or portable skill authorship.

## 1. Agent skills and harness integrity

* **Skill structure:** `SKILL.md` frontmatter must keep a unique `name:`. Paths referenced from hubs (`AGENTS.md`, `.agents/AGENTS.md`) must match real folders under `.agents/skills/`.
* **Progressive disclosure:** Do not paste entire skill bodies into hubs or sibling skills. Prefer links to the canonical skill.
* **Portability:** Skills under `.agents/skills/` must stay project-agnostic. Flag hardcoded org/repo names, absolute machine paths, or consumer-specific build/test commands inside skill bodies. Parameterize via `config.json` / `stack.md` / `tools.md`.
* **Language:** Skill content, gates, banners, and pipeline output must stay **en-us**. Flag Portuguese (or other locales) in skill files.
* **Shared vs promoted skills:** Treat `shared/` hub files (`config*`, `tools.md`, `stack.md`, `setup.md`, `gates.md`) as config/docs; do not invent skill folders there unless the change intentionally adds them.
* **STEP-DISPATCH dual-mode:** `spec-to-pr/STEP-DISPATCH.md` is standard-orch only (0–13). Lite must keep its own Steps 1–5; shared skills stay orch-agnostic via `gates.md`.
* **Root seeds:** Installer create-if-missing for `.cursorrules` / `CHANGELOG.md` must never overwrite existing consumer files.
* **check-harness awareness:** Changes that add/rename/remove skills or routing tables should note the need to update root `AGENTS.md`, `.agents/AGENTS.md`, and regenerate `docs/index.html` via `node bin/build-site.js` when applicable.

## 2. Installer / CLI (`bin/`, `npx github:…`)

* **Documented install forms:** Prefer `npx github:jpolvora/workflow-skills` (or `npx --yes github:…`). Flag `@latest` on the `github:` specifier — npm misparses it and can exit 128.
* **Update contract:** `update` / `update --include-new` must preserve consumer `config.json` while refreshing managed skill copies. Root `.cursorrules` / `CHANGELOG.md` seeds are create-if-missing only.
* **Non-interactive install:** CI/agent paths must not rely on per-skill interactive overwrite prompts; prefer `--yes` / non-TTY-safe behavior.
* **ESM / Node:** Match existing ESM patterns; handle Promise rejections; avoid fragile path joins across Windows/Unix.

## 3. Markdown, YAML, and scripts in scope

* **Workflows (`.github/workflows/`):** Correct secrets usage, least-privilege `permissions`, and stable action versions. Reviewer itself must pass `--stack Custom` **with** `--custom-prompt` (or `AGENTIC_CODE_REVIEWERS_CUSTOM_PROMPT`) — never Custom alone.
* **Shell / PowerShell:** Quote paths, fail fast on missing tools, avoid interactive prompts in automation scripts.
* **JSON schemas / examples:** Keep `config.schema.json` and `config.json.example` aligned when config keys change.

## 4. Review priorities for this repo

High signal:

1. Broken skill routing / phantom paths / duplicate `name:`
2. Installer/update regressions that wipe `config.json` or block non-interactive install
3. Secrets or tokens committed in examples/workflows
4. Spec-to-PR FSM step continuity breaks (wrong skill folder names, retired step refs)

Low signal (usually skip unless clearly wrong):

* Pure prose style nits in docs
* Formatting-only markdown churn without behavioral impact
