# Implementation plan — Unique Node runtime for all workflow-skills helper scripts

Slug: `unique-skill-script-runtime` · Spec: `.agents/specs/0042-unique-skill-script-runtime.spec.md`
Branch: `feature/0042-unique-skill-script-runtime` → base `main`. Mode: automatic, sequential.

## 1. Goal

Node 22 becomes the only runtime for packaged skill helpers, `bin/`, and `npm run test`.
Delete all 30 tracked `.py` files, port behavior to `.cjs`, retarget recipes/docs/tests, gate
reintroduction via `ws-check-harness`.

## 2. Task batches (sequential)

### T1 — Delete duals (CJS already SoT)

Delete 8 files, keep sibling `.cjs` untouched:

- `ws-spec-to-pr/scripts/update_state.py`, `validate_state.py`
- `ws-spec-to-pr-lite/scripts/update_state.py`, `validate_state.py`
- `ws-spec-provider-local/scripts/register_local_spec.py`, `detect_specs_dir.py`
- `ws-self-learning/scripts/self_learning.py`
- `ws-shared/runtime/scripts/resolve_consumer_root.py`

Verify: `node …/update_state.cjs --help`, `validate_state.cjs`, `register_local_spec.cjs`,
`detect_specs_dir.cjs`, `self_learning.cjs --help`, `resolve_consumer_root.cjs` all still pass.
Check: `test-update-state-yaml.js`, provider-parity register tests stay green.

### T2 — Port provider + gate Python-only helpers (11 files → `.cjs`)

Keep CLI flags, `--json` shapes, exit codes. Intent names unchanged.

| Python source | Node target |
|---|---|
| `ws-spec-provider-github/scripts/github-issue-to-spec.py` | `github-issue-to-spec.cjs` |
| `ws-spec-provider-github/scripts/sweep_prior_work.py` | `sweep_prior_work.cjs` |
| `ws-spec-provider-github/scripts/comment_issue.py` | `comment_issue.cjs` |
| `ws-spec-provider-azure-devops/scripts/ado-workitem-to-spec.py` | `ado-workitem-to-spec.cjs` |
| `ws-spec-provider-azure-devops/scripts/sweep_prior_work.py` | `sweep_prior_work.cjs` |
| `ws-spec-provider-azure-devops/scripts/comment_issue.py` | `comment_issue.cjs` |
| `ws-spec-provider-azure-devops/scripts/fix_pr_azure_context.py` | `fix_pr_azure_context.cjs` |
| `ws-fix-pr/scripts/fix_pr_azure_context.py` | `fix_pr_azure_context.cjs` |
| `ws-spec-to-pr/scripts/github-issue-to-spec.py` (shim) | `github-issue-to-spec.cjs` (shim → canonical) |
| `ws-spec-to-pr/scripts/ado-workitem-to-spec.py` (shim) | `ado-workitem-to-spec.cjs` (shim → canonical) |
| `ws-spec-from-provider/scripts/list_open_issues.py` | `list_open_issues.cjs` |
| `ws-spec-from-provider/scripts/list_my_user_stories.py` | `list_my_user_stories.cjs` |

Shared-py imports (`utf8_stdio`, `http_retry`, `resolve_consumer_root`) resolve to existing
`ws-shared/runtime/scripts/*.cjs` (`http_retry.cjs`, `resolve_consumer_root.cjs`); stdio is UTF-8
by default in Node — no shim needed. Update `config.json.example` script keys (AC13).

### T3 — Port remaining unique helpers (8 files → `.cjs`)

| Python source | Node target |
|---|---|
| `ws-check-workflows/scripts/check_workflows.py` | `check_workflows.cjs` |
| `ws-configure-project/scripts/configure_autoload.py` | `configure_autoload.cjs` |
| `ws-testing/scripts/run_sabotage.py` | `run_sabotage.cjs` |
| `ws-spec-to-pr/scripts/check_memory_conflict.py` | `check_memory_conflict.cjs` |
| `ws-spec-to-pr/scripts/cleanup_workflow_git.py` | `cleanup_workflow_git.cjs` |
| `ws-pre-daily/scripts/collect_window.py` | `collect_window.cjs` |
| `ws-activity-report/scripts/bootstrap_start.py` | `bootstrap_start.cjs` |
| `ws-activity-report/scripts/infer_human_timing.py` | `infer_human_timing.cjs` |

Delete `ws-shared/runtime/scripts/utf8_stdio.py` + `http_retry.py` once zero importers remain.
Wire `package.json` `tests:harness-efficiency` to `node …/check_workflows.cjs` (AC14).

### T4 — Thin bash adapters only

- `ws-secrets-leak-review/scripts/secrets_scanner.sh` → `secrets_scanner.cjs` (keep `pre-commit.sh` /
  `install-hook.sh` as thin `exec node` entries).
- `ws-ship-pr/scripts/detect-base-branch.sh` → `detect-base-branch.cjs`.
- `ws-ship-pr/scripts/verify.sh` → `verify.cjs`.
- `install-skills.sh`: strip `PYTHONUTF8`/`PYTHONIOENCODING` exports (AC21), keep curl shim.
- Hooks under `.agents/hooks/`, `.cursor/hooks/` are host adapters — out of scope.

### T5 — Rules and docs

- Root `AGENTS.md`: add `Skill script runtime (mandatory)` section (AC2); fix session-contract
  `self_learning` / `register_local_spec` recipes to `.cjs` (AC20).
- `SKILL_AUTHORING.md`: new numbered section after §9 (AC3) + replace `python validate_json.py`
  example with `node validate_json.cjs`.
- `ws-write-a-skill/SKILL.md`: Draft + Audit Checklist → `node`/`bash` only (AC4).
- `ws-shared/runtime/tools.md` § Script launchers: drop `*.py` row (AC5).
- `ws-shared/runtime/CROSS-PLATFORM.md`: drop Python UTF-8 rules (AC6).
- `ws-shared/runtime/AGENTS.md`: Node-only resolvers, `node --check` (AC7).
- `README.md` + `FEATURES.md`: Node-required policy (AC8); engines Node ≥22 (AC16).
- `bin/generate-skill-evals.js` recipes + `bin/cli.js` help examples → `.cjs` (AC18).
- `STACK.md.example` + dogfood `STACK.md` → `node`/`bash` (AC19).
- Skill/hub recipes (AC23): orchestrators, providers, local-provider, self-learning,
  configure-project, check-workflows, testing, activity-report, pre-daily, fix-pr README →
  `node …/*.cjs`.
- `CATALOG.md`/site: no Python-needed copy (AC26); `package.json` `engines >=22` (AC16).

### T6 — Tests, harness gate, integrity

- Retarget: `test-node-helper-ports.js`, `test-package-runtime-exclusions.js`,
  `test-hybrid-consumer-root.js`, `test-autoload-configure.js`, `test-update-state-yaml.js`,
  `test-quality-gates.js`, `test-ws-pre-daily.js`, `test-cleanup-workflow-git.js`,
  `test-infer-human-timing.js`, `test-provider-parity.js`, `test-runtime-portability.js`,
  `test-ws-cleanup.js`, plus any other `python`-spawning test; assert no `spawnSync python`.
- `ws-check-harness` `PHASES.md` + mechanical check: **critical** on any `.py` under
  `.agents/skills/` or `bin/` + covering test (AC17).
- AC15: focused test proving suite passes with Python absent from PATH (or assertion that no
  test spawns `python`/`python3` + doc note).
- `npm run generate-integrity`, `npm run verify-integrity`, `ws-check-harness` 0 criticals (AC24).
- No new npm runtime deps (AC25).

## 3. Files touched (estimate)

~20 new `.cjs`, ~30 deleted `.py`, 3 shell ports, ~25 doc/config/test edits, integrity regen.

## 4. Verify (Step 5 gate, min 9)

`npm run test` green; `git ls-files -- '.agents/skills/**/*.py' 'bin/**/*.py'` empty;
`npm run verify-integrity` 0; `ws-check-harness` 0 criticals; every AC mapped to evidence.

## 5. Risks

- Parity drift in ports (esp. `check_workflows`, `fix_pr_azure_context`, `check_memory_conflict`):
  mitigate with fixture-based CLI diff tests before deleting `.py`.
- Test-suite size: run focused tests per batch, full `npm run test` at Step 7.
- `__pycache__/` residue: untracked, leave alone (AC9 only covers tracked paths).

## 6. Stack & Security Invariants Verification Plan

- Stack (`node-skills-package`): new code is Node stdlib + in-repo `.cjs` only; `node --check`
  on every new helper; no `dependencies` added to `package.json`; `.cjs` (not `.mjs`) under
  skill `scripts/` for `require()` compat with root `"type": "module"`.
- weakened `resolve_consumer_root` / `workflow_state` reuse, never reimplement root resolution.
- No secrets: ports carry no tokens; Azure PAT stays env-var (`ADO_PAT`); temp files use
  `fs.mkdtemp`; no new network endpoints beyond existing `gh`/`az` CLIs and retry helper.
- Verify: `test-package-runtime-exclusions.js` + new harness-gate test + `npm run verify-integrity`.
