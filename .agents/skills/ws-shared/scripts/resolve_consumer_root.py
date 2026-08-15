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
from pathlib import Path

HUB_REL = Path(".agents") / "skills" / "ws-shared"
HUB_CONFIG = HUB_REL / "config.json"
HUB_CONFIG_EXAMPLE = HUB_REL / "config.json.example"


def resolve_global_skills_root() -> Path:
    env = os.environ.get("WORKFLOW_SKILLS_GLOBAL_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".agents" / "skills").resolve()


def consumer_hub_exists(repo_root: Path) -> bool:
    root = repo_root.resolve()
    return (root / HUB_CONFIG).is_file() or (root / HUB_CONFIG_EXAMPLE).is_file()


def shared_dir(repo_root: Path) -> Path:
    return repo_root.resolve() / HUB_REL


def _script_in_global_skills(script_path: Path) -> bool:
    try:
        script_path.resolve().relative_to(resolve_global_skills_root())
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

    if script_file:
        script_path = Path(script_file).resolve()
        if not _script_in_global_skills(script_path):
            candidate = script_path.parents[4]
            if consumer_hub_exists(candidate):
                return candidate

    return cwd
