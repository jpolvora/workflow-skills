## Code Review

**Branch:** `develop`
**Baseline:** `5546973c91a26a879bbffe9e0095a3fe32b15d80`
**Tip:** `db5154459bb877771c623591a186a37ef5882bd2`
**Stack:** Node 22 / agent skills hub (`STACK.md`) — no classic `src/`/`web/`
**Files:** 36 (feat commit scope)
**Mode:** Step 9 · [AUTO][FULL] · composer-2

### Critical

_(none)_

### Warning

- **`.agents/skills/github-provider/scripts/resolve_thread.cjs:28`**: WARNING — default resolution comment is Portuguese (Score: 7/10)
  Analysis:
  1. Evidence: `buildResolutionBody` uses `'Issue corrigida na iteração atual.'` when note is empty; script is the **canonical** path after the move from `08-fix-pr/scripts/`.
  2. Failure: `resolve-thread` without an explicit note posts a PT-BR body to GitHub review threads for every consumer.
  3. Missing protection: no en-us lint/test; MEMORY anti-regression trap (Portuguese in pipeline deps) not enforced on this string; ADO sibling was cleaned to English in the same feat, GitHub default was not.
  4. Discards: not a docs-only string — it is user-visible remote mutation text.
  Sibling occurrences: none other under `github-provider/scripts/` (ADO path already English).
  Suggestion: replace default with e.g. `Issue fixed in the current iteration.`

- **`.agents/skills/00-write-spec/SKILL.md:78-81` + `local-spec-provider/scripts/register_local_spec.py:203-213`**: WARNING — documented `--mirror` happy path fails when normalize mutates frontmatter (Score: 7/10)
  Analysis:
  1. Evidence: `00-write-spec` tells agents to run `register_local_spec.py --input "{us-dir}/step-00-{slug}.spec.md" --mirror` **without** `--force`. `write_if_allowed` exits 1 when destination exists and differs.
  2. Failure: proven — frontmatter missing `id: null` / unquoted `title` → normalize rewrites → `ERROR: destination exists and differs` (exit 1); mirror never written. Template-identical Case A succeeds (`unchanged`).
  3. Missing protection: no `--mirror-only` / skip-rewrite-when-src-is-canonical; skill recipe omits `--force`.
  4. Discards: not a temp-path slug mismatch — failure is on the exact canonical path agents use after draft.
  Sibling occurrences: any caller of `register_local_spec.py --mirror` on an existing canonical file without `--force`.
  Suggestion: either (a) document `--force` in the mirror recipe, or (b) when `--mirror` and input resolves to the canonical dest, skip dest rewrite / treat normalize-only-for-mirror as allow-overwrite for that path.

### Suggestion

- **`.agents/skills/github-provider/scripts/github-issue-to-spec.py:11`**: SUGGESTION — project-specific docstring example `jpolvora/matrix` (Score: 6/10)
  Analysis: carried into the canonical provider script; violates MEMORY portability trap (hardcoded consumer project). Replace with `{owner}/{repo}` placeholder. Pre-existing in baseline, but now the canonical surface for all consumers.

- **`test/test-install.js` (provider canonicity block)**: SUGGESTION — canonicity asserts SKILL.md + converter shims/canonical py files, but not local-spec scripts or 08→provider thread shims, and does not execute shim forward smoke (Score: 6/10)
  Analysis: AC1/AC9 partially covered (existence). Missing: `local-spec-provider/scripts/{detect_specs_dir,register_local_spec}.py`, `08-fix-pr/scripts/{fetch_threads,resolve_thread}.cjs` + `fix_pr_azure_context.py` shim presence, and a cheap `--help` / usage spawn through shims to prove parents[2] resolution after install.

---

**Positive (not findings):** provider dual-mode + intents; `providers` schema/example; orchestrator / ship / fix-pr / goal-fix-pr scm delegation; thin shims forward correctly (manual smoke); `validate_state.py` `REPO_ROOT` parents[3]→[4] correctly points at repo root (was `.agents`); ADO script Portuguese→English + config.json-first auth.

**Apply fixes?** Step 9 analysis only — Step 10 applies surgical fixes.
