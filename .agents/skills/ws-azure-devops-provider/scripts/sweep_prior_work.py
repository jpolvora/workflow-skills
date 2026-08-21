#!/usr/bin/env python3
"""
Prior-work sweep for Azure DevOps: search PRs and recent commits.

Usage:
  python sweep_prior_work.py --keywords auth login [--issue 1234] [--files path/a]
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


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

HUB_REL = Path(".agents") / "skills" / "ws-shared" / "config.json"


def resolve_repo_root(override: str | None = None) -> Path:
    if override:
        return Path(override).expanduser().resolve()
    cwd = Path.cwd().resolve()
    if (cwd / HUB_REL).is_file():
        return cwd
    return Path(__file__).resolve().parents[4]


def load_ado_config(repo_root: Path) -> dict[str, Any]:
    cfg_path = repo_root / HUB_REL
    if not cfg_path.is_file():
        return {}
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return (cfg.get("issueTrackers") or {}).get("azureDevOps") or {}


def resolve_pat(pat_env_var: str) -> str:
    for key in (pat_env_var, "ADO_PAT", "AZURE_DEVOPS_PAT"):
        if not key:
            continue
        value = os.environ.get(key, "").strip()
        if value:
            return value
    return ""


def validate_auth(ado: dict[str, Any]) -> tuple[bool, str]:
    org = (ado.get("org") or "").strip()
    project = (ado.get("project") or "").strip()
    pat_env = (ado.get("patEnvVar") or "ADO_PAT").strip()
    pat = resolve_pat(pat_env)
    if not org or not project:
        return False, "Missing issueTrackers.azureDevOps org/project in config.json"
    if not pat:
        return False, f"Missing PAT: set {pat_env} or ADO_PAT (validate-auth)"
    return True, ""


def api_get(url: str, pat: str) -> Any:
    req = urllib.request.Request(url)
    token = base64.b64encode(f":{pat}".encode("utf-8")).decode("ascii")
    req.add_header("Authorization", f"Basic {token}")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_prs(ado: dict[str, Any], pat: str, search_text: str) -> list[dict[str, Any]]:
    org = ado["org"]
    project = ado["project"]
    api_base = (ado.get("apiBase") or "https://dev.azure.com").rstrip("/")
    q = urllib.parse.quote(search_text)
    url = (
        f"{api_base}/{org}/{project}/_apis/git/pullrequests"
        f"?searchCriteria.status=all&$top=20&api-version=7.1"
    )
    try:
        data = api_get(url, pat)
    except (urllib.error.URLError, json.JSONDecodeError, KeyError):
        return []
    rows = []
    for pr in data.get("value") or []:
        title = (pr.get("title") or "")
        desc = (pr.get("description") or "")
        if search_text.lower() not in f"{title} {desc}".lower() and not search_text.isdigit():
            continue
        rows.append(
            {
                "pullRequestId": pr.get("pullRequestId"),
                "title": title,
                "status": pr.get("status"),
                "sourceRefName": pr.get("sourceRefName"),
                "searchText": search_text,
            }
        )
    return rows


def git_log(repo_root: Path, files: list[str]) -> list[dict[str, str]]:
    if not files:
        return []
    rel_files = []
    for f in files:
        p = Path(f)
        try:
            rel_files.append(p.resolve().relative_to(repo_root.resolve()).as_posix())
        except ValueError:
            rel_files.append(str(f).replace("\\", "/"))
    proc = subprocess.run(
        ["git", "log", "--oneline", "-20", "--", *rel_files],
        cwd=repo_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        return []
    commits = []
    for line in (proc.stdout or "").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(" ", 1)
        commits.append({"sha": parts[0], "subject": parts[1] if len(parts) > 1 else "", "files": rel_files})
    return commits


def main() -> int:
    parser = argparse.ArgumentParser(description="Sweep prior work on Azure DevOps")
    parser.add_argument("--issue", type=int, default=None)
    parser.add_argument("--keywords", nargs="+", default=[])
    parser.add_argument("--files", nargs="*", default=[])
    parser.add_argument("--repo-root", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    repo_root = resolve_repo_root(args.repo_root)
    ado = load_ado_config(repo_root)
    ok, msg = validate_auth(ado)
    if not ok:
        print(msg, file=sys.stderr)
        print("Fix: configure issueTrackers.azureDevOps and set ADO_PAT (validate-auth)", file=sys.stderr)
        return 1

    pat_env = (ado.get("patEnvVar") or "ADO_PAT").strip()
    pat = resolve_pat(pat_env)
    prs: list[dict[str, Any]] = []
    seen: set[int | None] = set()
    if args.issue is not None:
        for row in search_prs(ado, pat, str(args.issue)):
            pid = row.get("pullRequestId")
            if pid not in seen:
                seen.add(pid)
                prs.append(row)
    kw = " ".join(args.keywords).strip()
    if kw:
        for row in search_prs(ado, pat, kw):
            pid = row.get("pullRequestId")
            if pid not in seen:
                seen.add(pid)
                prs.append(row)

    payload = {
        "status": "ok",
        "provider": "azure-devops",
        "issue": args.issue,
        "keywords": args.keywords,
        "pullRequests": prs,
        "commits": git_log(repo_root, args.files),
        "repoRoot": ".",
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
