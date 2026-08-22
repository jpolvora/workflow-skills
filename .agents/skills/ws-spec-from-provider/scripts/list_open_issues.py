#!/usr/bin/env python3
"""List open GitHub issues for the configured consumer repo (JSON stdout).

  python list_open_issues.py [--repo-root PATH] [--limit N] [--owner ORG] [--repo NAME]

Reads issueTrackers.github from ws-shared/config.json. Requires `gh` on PATH.
Uncapped runs use `gh api --paginate` so results are not silently truncated at 1000.
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


def run_gh(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        print("Error: `gh` not found on PATH", file=sys.stderr)
        raise SystemExit(1)


def parse_paginated_issues(raw: str) -> list[dict]:
    """Parse `gh api --paginate` stdout (single array, concatenated arrays, or NDJSON)."""
    text = (raw or "").strip()
    if not text:
        return []

    issues: list = []
    if text.startswith("["):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                issues = parsed
        except json.JSONDecodeError:
            fixed = text.replace("][", "],[")
            try:
                pages = json.loads(f"[{fixed}]")
                issues = [item for page in pages for item in page]
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Error: invalid gh api JSON — {exc}") from exc
    else:
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                page = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"Error: invalid gh api JSON — {exc}") from exc
            if isinstance(page, list):
                issues.extend(page)
            elif isinstance(page, dict):
                issues.append(page)

    return [
        item
        for item in issues
        if isinstance(item, dict)
        and "pull_request" not in item
        and item.get("number") is not None
    ]


def list_via_api(owner: str, repo: str) -> list[dict]:
    completed = run_gh(
        [
            "gh",
            "api",
            "--paginate",
            f"repos/{owner}/{repo}/issues?state=open&per_page=100",
        ]
    )
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        print(f"Error: gh api issues failed: {err}", file=sys.stderr)
        raise SystemExit(completed.returncode or 1)
    return parse_paginated_issues(completed.stdout or "")


def list_via_issue_list(owner: str, repo: str, limit: int) -> list[dict]:
    completed = run_gh(
        [
            "gh",
            "issue",
            "list",
            "--repo",
            f"{owner}/{repo}",
            "--state",
            "open",
            "--json",
            "number,title,url,state,labels,assignees",
            "--limit",
            str(limit),
        ]
    )
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        print(f"Error: gh issue list failed: {err}", file=sys.stderr)
        raise SystemExit(completed.returncode or 1)
    try:
        issues = json.loads(completed.stdout or "[]")
    except json.JSONDecodeError as exc:
        print(f"Error: invalid gh JSON — {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    if not isinstance(issues, list):
        return []
    return [item for item in issues if isinstance(item, dict) and item.get("number") is not None]


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

    if args.limit and args.limit > 0:
        collected = list_via_issue_list(owner, repo, args.limit)
    else:
        collected = list_via_api(owner, repo)

    out = []
    for item in collected:
        number = item.get("number")
        if number is None:
            continue
        out.append(
            {
                "id": int(number),
                "title": (item.get("title") or "").strip(),
                "url": (item.get("url") or item.get("html_url") or "").strip(),
                "state": (item.get("state") or "").strip(),
            }
        )

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
