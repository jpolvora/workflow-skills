#!/usr/bin/env python3
"""List open GitHub issues for the configured consumer repo (JSON stdout).

  python list_open_issues.py [--repo-root PATH] [--limit N] [--owner ORG] [--repo NAME]

Reads issueTrackers.github from ws-shared/config.json. Requires `gh` on PATH.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

_SHARED_SCRIPTS = Path(__file__).resolve().parents[2] / "ws-shared" / "scripts"
if str(_SHARED_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SHARED_SCRIPTS))
from resolve_consumer_root import resolve_repo_root, resolve_config_path  # noqa: E402


def ensure_utf8_stdio() -> None:
    os.environ["PYTHONIOENCODING"] = "utf-8"
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if not callable(reconfigure):
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            try:
                reconfigure(errors="replace")
            except Exception:
                pass


ensure_utf8_stdio()


def load_github_tracker(repo_root: Path) -> tuple[str, str]:
    cfg_path = resolve_config_path(repo_root)
    if not cfg_path.is_file():
        raise SystemExit(f"Missing config: {cfg_path}")
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise SystemExit(f"Invalid config JSON: {exc}") from exc
    gh = (cfg.get("issueTrackers") or {}).get("github") or {}
    owner = (gh.get("owner") or "").strip()
    repo = (gh.get("repo") or "").strip()
    if not owner or not repo:
        raise SystemExit(
            "issueTrackers.github.owner and .repo are required in config.json"
        )
    return owner, repo


def main() -> int:
    parser = argparse.ArgumentParser(description="List open GitHub issues as JSON")
    parser.add_argument("--repo-root", help="Project root owning ws-shared/config.json")
    parser.add_argument("--owner", default="", help="Override issueTrackers.github.owner")
    parser.add_argument("--repo", default="", help="Override issueTrackers.github.repo")
    parser.add_argument("--limit", type=int, default=0, help="Max issues (0 = all)")
    args = parser.parse_args()

    repo_root = resolve_repo_root(args.repo_root, script_file=__file__)
    owner, repo = load_github_tracker(repo_root)
    if args.owner.strip():
        owner = args.owner.strip()
    if args.repo.strip():
        repo = args.repo.strip()

    cmd = [
        "gh",
        "issue",
        "list",
        "--repo",
        f"{owner}/{repo}",
        "--state",
        "open",
        "--json",
        "number,title,url,state,labels,assignees",
    ]
    if args.limit and args.limit > 0:
        cmd.extend(["--limit", str(args.limit)])
    else:
        cmd.extend(["--limit", "1000"])

    try:
        completed = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        print("Error: `gh` not found on PATH", file=sys.stderr)
        return 1

    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        print(f"Error: gh issue list failed: {err}", file=sys.stderr)
        return completed.returncode or 1

    try:
        issues = json.loads(completed.stdout or "[]")
    except json.JSONDecodeError as exc:
        print(f"Error: invalid gh JSON — {exc}", file=sys.stderr)
        return 1

    out = []
    for item in issues if isinstance(issues, list) else []:
        number = item.get("number")
        if number is None:
            continue
        out.append(
            {
                "id": int(number),
                "title": (item.get("title") or "").strip(),
                "url": (item.get("url") or "").strip(),
                "state": (item.get("state") or "").strip(),
            }
        )

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
