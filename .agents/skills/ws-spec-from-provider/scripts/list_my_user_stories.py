#!/usr/bin/env python3
"""List open Azure DevOps User Stories assigned to the PAT identity (JSON stdout).

  python list_my_user_stories.py [--repo-root PATH] [--limit N]

Reads issueTrackers.azureDevOps from ws-shared/config.json.
WIQL: User Story, not Closed/Removed/Done, Assigned To = @Me.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
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


CLOSED_STATES = ("Closed", "Removed", "Done")


def resolve_pat(pat_env_var: str) -> str:
    for key in (pat_env_var, "ADO_PAT", "AZURE_DEVOPS_PAT"):
        if not key:
            continue
        value = os.environ.get(key, "").strip()
        if value:
            return value
    raise SystemExit(
        f"Missing PAT. Set env var {pat_env_var or 'ADO_PAT'} (or AZURE_DEVOPS_PAT)."
    )


def auth_headers(pat: str) -> dict[str, str]:
    token = base64.b64encode(f":{pat}".encode("ascii")).decode("ascii")
    return {
        "Authorization": f"Basic {token}",
        "Accept": "application/json; api-version=7.1",
        "Content-Type": "application/json",
    }


def load_ado_tracker(repo_root: Path) -> dict:
    cfg_path = resolve_config_path(repo_root)
    if not cfg_path.is_file():
        raise SystemExit(f"Missing config: {cfg_path}")
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise SystemExit(f"Invalid config JSON: {exc}") from exc
    ado = (cfg.get("issueTrackers") or {}).get("azureDevOps") or {}
    org = (ado.get("org") or "").strip()
    project = (ado.get("project") or "").strip()
    if not org or not project:
        raise SystemExit(
            "issueTrackers.azureDevOps.org and .project are required in config.json"
        )
    return {
        "org": org,
        "project": project,
        "apiBase": (ado.get("apiBase") or "https://dev.azure.com").rstrip("/"),
        "patEnvVar": (ado.get("patEnvVar") or "ADO_PAT").strip() or "ADO_PAT",
    }


def build_wiql(project: str) -> str:
    state_clause = " AND ".join(
        f"[System.State] <> '{state}'" for state in CLOSED_STATES
    )
    return (
        "SELECT [System.Id], [System.Title], [System.State] "
        "FROM WorkItems "
        f"WHERE [System.TeamProject] = '{project.replace(chr(39), chr(39)+chr(39))}' "
        "AND [System.WorkItemType] = 'User Story' "
        f"AND {state_clause} "
        "AND [System.AssignedTo] = @Me "
        "ORDER BY [System.ChangedDate] DESC"
    )


def wiql_query(org: str, project: str, api_base: str, pat: str, wiql: str) -> list[int]:
    base = api_base.rstrip("/")
    url = (
        f"{base}/{urllib.parse.quote(org)}/{urllib.parse.quote(project)}"
        f"/_apis/wit/wiql?api-version=7.1"
    )
    body = json.dumps({"query": wiql}).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, method="POST", headers=auth_headers(pat)
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Azure DevOps WIQL HTTP {exc.code}: {detail}") from exc

    ids: list[int] = []
    for row in payload.get("workItems") or []:
        wid = row.get("id")
        if wid is not None:
            ids.append(int(wid))
    return ids


def fetch_work_items_batch(
    org: str, project: str, api_base: str, pat: str, ids: list[int]
) -> list[dict]:
    if not ids:
        return []
    base = api_base.rstrip("/")
    # WIT batch get supports up to 200 ids per call
    out: list[dict] = []
    for i in range(0, len(ids), 200):
        chunk = ids[i : i + 200]
        id_csv = ",".join(str(x) for x in chunk)
        url = (
            f"{base}/{urllib.parse.quote(org)}/{urllib.parse.quote(project)}"
            f"/_apis/wit/workitems?ids={id_csv}"
            f"&fields=System.Id,System.Title,System.State"
            f"&api-version=7.1"
        )
        request = urllib.request.Request(url, method="GET", headers=auth_headers(pat))
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise SystemExit(f"Azure DevOps workitems HTTP {exc.code}: {detail}") from exc
        out.extend(payload.get("value") or [])
    return out


def work_item_url(api_base: str, org: str, project: str, work_item_id: int) -> str:
    # Prefer board UI URL shape used by consumers
    host = api_base.rstrip("/")
    if "dev.azure.com" in host:
        return f"{host}/{org}/{urllib.parse.quote(project)}/_workitems/edit/{work_item_id}"
    return f"{host}/{org}/{urllib.parse.quote(project)}/_workitems/edit/{work_item_id}"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="List open ADO User Stories assigned to @Me as JSON"
    )
    parser.add_argument("--repo-root", help="Project root owning ws-shared/config.json")
    parser.add_argument("--limit", type=int, default=0, help="Max stories (0 = all)")
    parser.add_argument("--org", default="", help="Override issueTrackers.azureDevOps.org")
    parser.add_argument(
        "--project", default="", help="Override issueTrackers.azureDevOps.project"
    )
    parser.add_argument(
        "--api-base", default="", help="Override issueTrackers.azureDevOps.apiBase"
    )
    parser.add_argument(
        "--pat-env", default="", help="Override issueTrackers.azureDevOps.patEnvVar"
    )
    args = parser.parse_args()

    repo_root = resolve_repo_root(args.repo_root, script_file=__file__)
    tracker = load_ado_tracker(repo_root)
    org = args.org.strip() or tracker["org"]
    project = args.project.strip() or tracker["project"]
    api_base = args.api_base.strip() or tracker["apiBase"]
    pat_env = args.pat_env.strip() or tracker["patEnvVar"]
    pat = resolve_pat(pat_env)

    ids = wiql_query(org, project, api_base, pat, build_wiql(project))
    if args.limit and args.limit > 0:
        ids = ids[: args.limit]

    items = fetch_work_items_batch(org, project, api_base, pat, ids)
    by_id = {int(w.get("id")): w for w in items if w.get("id") is not None}

    out = []
    for wid in ids:
        wi = by_id.get(wid) or {}
        fields = wi.get("fields") or {}
        out.append(
            {
                "id": wid,
                "title": (fields.get("System.Title") or "").strip(),
                "url": work_item_url(api_base, org, project, wid),
                "state": (fields.get("System.State") or "").strip(),
            }
        )

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
