---
id: 211
slug: us-211
title: "Hybrid/global install: scripts still resolve consumer ws-shared from __file__, not $PWD"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/211"
labels: [bug]
specDate: 2026-08-15
---

# Specification — Hybrid/global install: scripts still resolve consumer ws-shared from __file__, not $PWD

**State:** open
**Labels:** bug

## Description

## Summary

The documented hybrid contract is correct: skill **bodies** may load from `{globalSkillsRoot}` while **consumer data** always comes from `$PWD/.agents/skills/ws-shared` (local config/MEMORY/STACK override any global hub copy).

That contract is **not applied uniformly in helper scripts**. Several still derive the consumer repo from `__file__` (`parents[4]` or sibling `ws-shared`). On a global-only / hybrid install this silently targets `$HOME/.agents/skills/ws-shared` instead of the project that the agent is working in.

Found while configuring a consumer that keeps only `ws-shared` (+ product skills) locally and runs `ws-*` from `~/.agents/skills` (v0.3.18).

## Contract (already documented)

- `ws-shared/AGENTS.md`: *Agents may load `ws-*` skill bodies from the global skills root while reading **project** `$PWD/.agents/skills/ws-shared/config.json`. **Local (project) config always overrides global hub config.***
- `config-resolution.md`: global execution targets `$PWD`; entry gate is `$PWD/.agents/skills/ws-shared/config.json`.
- `tools.md`: `{sharedDir}` → `.agents/skills/ws-shared` (project); `{skillsRoot}` → `.agents/skills` (project); `{globalSkillsRoot}` is separate.
- Good examples already in tree:
  - `ws-local-spec-provider/scripts/register_local_spec.py` `resolve_repo_root()` (`--repo-root` → CWD hub probe → `parents[4]`)
  - same helper in `github-issue-to-spec.py` / `ado-workitem-to-spec.py`
  - `configure_autoload.py` defaults `--repo-root` to cwd
  - `update_state.py` probes `Path.cwd() / .agents/skills/ws-shared/config.json`
  - secrets-leak-review pre-commit **runtime shim** (local then global)

## Broken / incomplete resolvers

### 1. `ws-self-learning/scripts/self_learning.py` (worst: silent wrong target)

```python
SKILL_DIR = Path(__file__).resolve().parent.parent
SHARED_DIR = SKILL_DIR.parent / "ws-shared"
repo_agents_shared = SKILL_DIR.parent.parent.parent / ".agents" / "skills" / "ws-shared"
if repo_agents_shared.exists():
    SHARED_DIR = repo_agents_shared
```

From `$HOME/.agents/skills/ws-self-learning/scripts/self_learning.py`, `repo_agents_shared` is `$HOME/.agents/skills/ws-shared`, which **exists** (global hub). `--compile` then writes **global** `MEMORY.md`, not `$PWD/.agents/skills/ws-shared/MEMORY.md`. No cwd probe, no `--repo-root`.

SKILL.md still tells agents: `python {skillsRoot}/ws-self-learning/scripts/self_learning.py --compile` with `{skillsRoot}` = project `.agents/skills` — that path **does not exist** in a global-only consumer.

### 2. `validate_state.py` (standard + lite)

```python
REPO_ROOT = Path(__file__).resolve().parents[4]
```

Local layout: `repo/.agents/skills/ws-spec-to-pr/scripts` → 4 up is repo root.  
Global layout: `$HOME/.agents/skills/ws-spec-to-pr/scripts` → 4 up is `$HOME`. Then `load_plans_dir()` looks for `$HOME/.agents/skills/ws-shared/config.json`.

Sibling `update_state.py` already probes cwd; validate does not.

### 3. `ws-local-spec-provider/scripts/detect_specs_dir.py`

Hard `REPO_ROOT = Path(__file__).resolve().parents[4]` — no cwd probe (unlike `register_local_spec.py` in the same skill).

### 4. `ws-classify-complexity/scripts/classify.cjs`

`findRepoRoot(process.cwd())` is used for the **spec path**, but `loadConfig()` reads:

```js
const SKILLS_ROOT = path.resolve(SCRIPT_DIR, '..', '..'); // skill install root
const SHARED_DIR = path.join(SKILLS_ROOT, 'ws-shared');
```

On global install that is `$HOME/.agents/skills/ws-shared/config.json` (or example), **not** the consumer `dagThresholds`. Lite vs standard can be classified against the wrong thresholds.

## Secondary: `{skillsRoot}` recipes vs hybrid

`tools.md` `{skillsRoot}` is the **project** `.agents/skills`, not “where this SKILL.md was loaded from”. Autoload path emission already does local-first then `{globalSkillsRoot}/ws-<id>/SKILL.md` (`configure_autoload.py` `emit_skill_path`). Script recipes in SKILL.md (`python {skillsRoot}/ws-foo/scripts/...`) have no equivalent expand rule, so agents either fail FileNotFound or invent a global path.

Markdown `../ws-shared/` links from a globally installed SKILL.md also resolve to the **global** hub on disk. Runtime must keep using `$PWD/{sharedDir}` (already stated); worth restating next to a shared resolver so agents do not follow the relative link for config/MEMORY.

## Proposed direction (not prescribing a large redesign)

1. **One shared consumer-root helper** (Python + a tiny JS twin), used by every script that reads/writes `{sharedDir}`:
   - `--repo-root` if set
   - else `cwd` if `$PWD/.agents/skills/ws-shared/config.json` (or example) exists
   - never treat a global-hub `ws-shared` sibling of `__file__` as the consumer project
2. Port `self_learning.py`, both `validate_state.py`, `detect_specs_dir.py`, `classify.cjs` `loadConfig()` onto that helper.
3. **`tools.md` skill-script expand rule:** `{skillsRoot}/ws-<id>/...` if present, else `{globalSkillsRoot}/ws-<id>/...`. Same as autoload `emit_skill_path`.
4. Tests: fixture with skills only under a fake global root + consumer cwd that has `ws-shared/config.json`; assert MEMORY compile, classify thresholds, and validate_state `plans.dir` hit the **consumer** hub.

## Reproduction (consumer hybrid)

1. Install `ws-*` with `--global` only.
2. Keep consumer `{sharedDir}/config.json` + `MEMORY.md` under the project; do **not** copy `ws-self-learning` into the project.
3. From the consumer repo: `python $HOME/.agents/skills/ws-self-learning/scripts/self_learning.py --compile`
4. Observe compile target is `$HOME/.agents/skills/ws-shared/MEMORY.md` (or `$HOME/.agents/plans` for validate_state), not the project hub.

## Out of scope / already OK

- Agent-facing `$PWD` entry checks in SKILL.md (those are right).
- Local skill package override when `.agents/skills/ws-<id>/SKILL.md` exists.
- `configure_autoload.py` Always-applied path emission.
- Secrets-leak-review runtime shim.

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
