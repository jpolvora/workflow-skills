#!/usr/bin/env python3
"""Resolve consumer project root for hybrid/global skill installs.

Precedence:
  1. explicit --repo-root / override argument
  2. cwd when $PWD/.agents/skills/ws-shared/config.json (or .example) exists
  3. parents[4] from script_file when script is NOT under global skills root
  4. cwd (last resort)

Never treat a global-hub ws-shared sibling of __file__ as the consumer project.
"""
from __future__ import annotations

import os
import json
from pathlib import Path

HUB_REL = Path(".agents") / "skills" / "ws-shared"
HUB_CONFIG = HUB_REL / "config.json"
HUB_CONFIG_EXAMPLE = HUB_REL / "templates" / "config.json.example"
HUB_RUNTIME = HUB_REL / "runtime"
HUB_TEMPLATES = HUB_REL / "templates"

# Local-first precedence matrix shared by entrypoints and ws-monitor.
# A consumer-local candidate wins whenever it exists; global fallback only
# when the local candidate is absent, with the selected source observable.
PRECEDENCE_MATRIX = [
    {"rank": 1, "dimension": "config", "local": "{sharedDir}/config.json", "global": "{globalSkillsRoot}/ws-shared/config.json"},
    {"rank": 2, "dimension": "skill-bodies", "local": "{skillsRoot}/ws-<id>/SKILL.md", "global": "{globalSkillsRoot}/ws-<id>/SKILL.md"},
    {"rank": 3, "dimension": "shared-runtime", "local": "{sharedDir}/runtime/*", "global": "{globalSkillsRoot}/ws-shared/runtime/*"},
    {"rank": 4, "dimension": "harness", "local": "{sharedDir}/AGENTS.md", "global": "{globalSkillsRoot}/ws-shared/AGENTS.md"},
    {"rank": 5, "dimension": "specs", "local": "{specsDir} (plans.specsDir)", "global": "default .agents/specs"},
    {"rank": 6, "dimension": "plans-state", "local": "{plansDir} + telemetry + worktree paths", "global": "default .agents/plans"},
    {"rank": 7, "dimension": "fallback", "local": "local candidate present wins", "global": "global only when local absent; source observable"},
]


def describe_precedence_matrix() -> list[dict]:
    return [dict(row) for row in PRECEDENCE_MATRIX]


def resolve_global_skills_root() -> Path:
    env = os.environ.get("WORKFLOW_SKILLS_GLOBAL_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".agents" / "skills").resolve()


def known_global_skills_roots() -> list[Path]:
    home = Path.home()
    roots = [
        resolve_global_skills_root(),
        home / ".agents" / "skills",
        home / ".claude" / "skills",
        home / ".codex" / "skills",
        home / ".gemini" / "config" / "skills",
    ]
    return list(dict.fromkeys(root.expanduser().resolve() for root in roots))


def is_global_skills_root(path: Path) -> bool:
    return path.resolve() in known_global_skills_roots()


def resolve_execution_global_skills_root(
    script_file: str | os.PathLike[str] | None = None,
) -> Path:
    if script_file:
        script_path = Path(script_file).resolve()
        for root in known_global_skills_roots():
            try:
                script_path.relative_to(root)
                return root
            except ValueError:
                continue
    return resolve_global_skills_root()


def consumer_hub_exists(repo_root: Path) -> bool:
    root = repo_root.resolve()
    return (root / HUB_CONFIG).is_file() or (root / HUB_CONFIG_EXAMPLE).is_file()


def shared_dir(repo_root: Path) -> Path:
    explicit = os.environ.get("WORKFLOW_SKILLS_SHARED_DIR")
    if explicit:
        return Path(explicit).expanduser().resolve()
    return repo_root.resolve() / HUB_REL


def _script_in_global_skills(script_path: Path) -> bool:
    return any(
        _is_relative_to(script_path.resolve(), root) for root in known_global_skills_roots()
    )


def _is_relative_to(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def resolve_repo_root(
    override: str | os.PathLike[str] | None = None,
    *,
    script_file: str | os.PathLike[str] | None = None,
) -> Path:
    if override:
        return Path(override).expanduser().resolve()

    cwd = Path.cwd().resolve()
    if consumer_hub_exists(cwd):
        return cwd
    if is_global_skills_root(cwd):
        raise ValueError(
            f"Current directory is a global skills root ({cwd}); "
            "pass --repo-root to target a consumer project"
        )

    if script_file:
        script_path = Path(script_file).resolve()
        if not _script_in_global_skills(script_path):
            candidate = script_path.parents[4]
            if consumer_hub_exists(candidate):
                return candidate

    return cwd


def resolve_config_path(
    repo_root: Path,
    global_skills_root: Path | None = None,
) -> Path:
    """Return the winning config, with project-local hub precedence."""
    root = repo_root.resolve()
    local_hub = shared_dir(root)
    global_hub = (global_skills_root or resolve_global_skills_root()) / "ws-shared"
    candidates = (
        local_hub / "config.json",
        local_hub / "templates" / "config.json.example",
        global_hub / "config.json",
        global_hub / "templates" / "config.json.example",
    )
    return next((candidate for candidate in candidates if candidate.is_file()), candidates[0])


def load_config(repo_root: Path, global_skills_root: Path | None = None) -> dict:
    config_path = resolve_config_path(repo_root, global_skills_root)
    local_config = (shared_dir(repo_root.resolve()) / "config.json")
    if local_config.is_file():
        # Never silently fall back from a present-but-unreadable local config.
        try:
            config = json.loads(local_config.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as error:
            raise ValueError(
                f"local config unreadable: {local_config}: {error}"
            ) from error
        return _normalize_config(config)
    if not config_path.is_file():
        return {"fable": {"auditVerdictsBlockShip": "refuted"}}
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"fable": {"auditVerdictsBlockShip": "refuted"}}
    return _normalize_config(config)


def _normalize_config(config: dict) -> dict:
    fable = dict(config.get("fable") or {})
    value = fable.get("auditVerdictsBlockShip")
    if value is None or value is True:
        fable["auditVerdictsBlockShip"] = "refuted"
    elif value is False or value in {"refuted", "caveats"}:
        fable["auditVerdictsBlockShip"] = value
    else:
        raise ValueError(
            'fable.auditVerdictsBlockShip must be false, "refuted", or "caveats"'
        )
    config["fable"] = fable
    return config


def resolve_skills_root(
    repo_root: Path,
    skill_id: str | None = None,
    global_skills_root: Path | None = None,
) -> Path:
    local_root = repo_root.resolve() / ".agents" / "skills"
    probe = local_root / skill_id if skill_id else local_root
    return local_root if probe.exists() else (global_skills_root or resolve_global_skills_root())


def to_repo_relative(
    repo_root: Path,
    value: str | os.PathLike[str],
    *,
    allow_outside: bool = False,
) -> str:
    absolute = Path(value).expanduser().resolve()
    try:
        return absolute.relative_to(repo_root.resolve()).as_posix() or "."
    except ValueError:
        if not allow_outside:
            raise ValueError(f"Path is outside repository: {value}") from None
        return absolute.name


def resolve_consumer_context(
    override: str | os.PathLike[str] | None = None,
    *,
    script_file: str | os.PathLike[str] | None = None,
    skill_id: str | None = None,
) -> dict:
    root = resolve_repo_root(override, script_file=script_file)
    global_skills_root = resolve_execution_global_skills_root(script_file)
    execution_scope = (
        "global"
        if script_file and _script_in_global_skills(Path(script_file))
        else "project-local"
    )
    local_hub = shared_dir(root)
    local_config = local_hub / "config.json"
    local_example = local_hub / "templates" / "config.json.example"
    if execution_scope == "global":
        config_path = resolve_config_path(root, global_skills_root)
    else:
        config_path = next(
            (candidate for candidate in (local_config, local_example) if candidate.is_file()),
            local_config,
        )
    local_runtime = shared_dir(root) / "runtime"
    local_templates = shared_dir(root) / "templates"
    if execution_scope == "global":
        runtime_source = (
            local_runtime
            if local_runtime.is_dir()
            else global_skills_root / "ws-shared" / "runtime"
        )
        template_source = (
            local_templates
            if local_templates.is_dir()
            else global_skills_root / "ws-shared" / "templates"
        )
    else:
        runtime_source = local_runtime
        template_source = local_templates
    try:
        config_path.relative_to(root)
        config_source = "project"
    except ValueError:
        config_source = "global"
    config_error = None
    try:
        config = load_config(root, global_skills_root)
    except ValueError as error:
        config = {"fable": {"auditVerdictsBlockShip": "refuted"}}
        config_error = str(error)
    return {
        "repo_root": root,
        "skills_root": resolve_skills_root(root, skill_id, global_skills_root),
        "shared_dir": shared_dir(root),
        "global_skills_root": global_skills_root,
        "config_path": config_path,
        "config_source": config_source,
        "execution_scope": execution_scope,
        "runtime_source": runtime_source,
        "template_source": template_source,
        "config": config,
        "config_error": config_error,
        "precedence_matrix": describe_precedence_matrix(),
    }


def resolve_resolved_context(
    override=None,
    *,
    script_file=None,
    skill_id=None,
    workflow_id=None,
    slug=None,
    branch=None,
    state_path=None,
    worktree_path=None,
) -> dict:
    context = resolve_consumer_context(override, script_file=script_file, skill_id=skill_id)
    root = context["repo_root"]
    config = context["config"] or {}
    plans = config.get("plans") or {}
    plans_dir = str(plans.get("dir") or ".agents/plans")
    specs_dir = str(plans.get("specsDir") or ".agents/specs")
    template = str(plans.get("worktreesDir") or ".agents/plans/{slug}/worktrees")
    resolved_worktree = Path(worktree_path).expanduser() if worktree_path else (root / template.replace("{slug}", str(slug or "unknown")))
    try:
        worktree_source = "project" if Path(resolved_worktree).exists() else "unresolved"
    except OSError:
        worktree_source = "unresolved"
    return {
        "repo_root": ".",
        "config_path": to_repo_relative(root, context["config_path"], allow_outside=True),
        "config_source": context["config_source"],
        "config_error": context.get("config_error"),
        "skills_source": "project" if _is_relative_to(Path(context["skills_root"]).resolve(), root.resolve()) else "global",
        "shared_source": "project" if _is_relative_to(Path(context["shared_dir"]).resolve(), root.resolve()) else "global",
        "specs_dir": specs_dir,
        "plans_dir": plans_dir,
        "worktree_path": to_repo_relative(root, resolved_worktree, allow_outside=True),
        "worktree_source": worktree_source,
        "workflow_id": workflow_id,
        "branch": branch,
        "state_path": to_repo_relative(root, state_path, allow_outside=True) if state_path else None,
        "execution_scope": context["execution_scope"],
        "precedence_matrix": describe_precedence_matrix(),
    }


def refresh_resolved_context(*args, **kwargs) -> dict:
    return resolve_resolved_context(*args, **kwargs)


def is_resolution_stale(cached: dict | None, current: dict | None) -> bool:
    if not cached or not current:
        return True
    keys = ("config_path", "config_source", "plans_dir", "specs_dir", "branch", "worktree_path", "workflow_id", "state_path")
    return any(str(cached.get(key) or "") != str(current.get(key) or "") for key in keys)
