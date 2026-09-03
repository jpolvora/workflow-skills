#!/usr/bin/env python3
"""
Fetch or convert an Azure DevOps work item into the spec of record under {specsDir}.

Fetch (live API):
  set ADO_PAT=...
  python ado-workitem-to-spec.py \\
    --org contoso --project MyProject --id 2416 \\
    --snapshot {plansDir}/us-2416/step-00-us-2416.issue.json

Convert (offline JSON from WIT API):
  python ado-workitem-to-spec.py \\
    --input workitem.json \\
    --org contoso --project MyProject

Output defaults via `resolve_spec_path.cjs --slug {unprefixedSlug}`.
`--skip-assets` skips the shared visual ingest helper (fixture/tests only).
"""
from __future__ import annotations

import argparse
import base64
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

_SHARED_SCRIPTS = Path(__file__).resolve().parents[2] / "ws-shared" / "scripts"
if str(_SHARED_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SHARED_SCRIPTS))
from resolve_consumer_root import resolve_repo_root, resolve_config_path  # noqa: E402
from utf8_stdio import ensure_utf8_stdio  # noqa: E402
from http_retry import urlopen_retry  # noqa: E402

ensure_utf8_stdio()

DEFAULT_SPECS_DIR = ".agents/specs"
WIT_COMMENTS_API_VERSION = "7.1-preview.4"
_MD_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def resolve_specs_dir(repo_root: Path, override: str | None = None) -> Path:
    rel = (override or "").strip()
    if not rel:
        cfg: dict = {}
        cfg_path = resolve_config_path(repo_root)
        if cfg_path.is_file():
            try:
                cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                cfg = {}
        rel = ((cfg.get("plans") or {}).get("specsDir") or "").strip() or DEFAULT_SPECS_DIR
    path = Path(rel)
    return path.resolve() if path.is_absolute() else (repo_root / path).resolve()


def resolve_default_output(repo_root: Path, slug: str) -> Path:
    organizer = Path(__file__).resolve().parents[2] / "ws-spec-organizer" / "scripts" / "resolve_spec_path.cjs"
    if organizer.is_file():
        proc = subprocess.run(
            ["node", str(organizer), "--slug", slug, "--repo-root", str(repo_root)],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0:
            rel = proc.stdout.strip()
            return (repo_root / rel).resolve()
    return resolve_specs_dir(repo_root) / f"{slug}.spec.md"


_AC_HEADING = re.compile(
    r"^(?:#{1,6}\s*)?(crit[eé]rios?\s+de\s+aceite|acceptance\s+criteria|ac[s]?)\b\.?$",
    re.IGNORECASE,
)


def _img_tag_to_markdown(tag: str) -> str:
    src = re.search(r'src=["\']([^"\']+)["\']', tag, re.IGNORECASE)
    if not src:
        return ""
    alt = re.search(r'alt=["\']([^"\']*)["\']', tag, re.IGNORECASE)
    alt_text = alt.group(1) if alt else ""
    return f"![{alt_text}]({src.group(1)})"


def clean_html(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(
        r"<img\b[^>]*>",
        lambda m: _img_tag_to_markdown(m.group(0)),
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"</(p|div|h[1-6]|li|tr)\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(p|div|h[1-6]|li|tr)(\s[^>]*)?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def split_body(body: str) -> tuple[str, list[str]]:
    body = (body or "").replace("\r\n", "\n").strip()
    if not body:
        return "", []

    lines = body.split("\n")
    ac_start = None
    for idx, line in enumerate(lines):
        if _AC_HEADING.match(line.strip()):
            ac_start = idx
            break

    if ac_start is None:
        return body, []

    description = "\n".join(lines[:ac_start]).strip()
    ac_items: list[str] = []
    for line in lines[ac_start + 1 :]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            break
        item = re.sub(r"^[-*+]\s+|^\d+[.)]\s+|^\[[ xX]\]\s+", "", stripped).strip()
        item = re.sub(r"^-?\s*\[[ xX]\]\s*", "", item).strip()
        if item:
            ac_items.append(item)
    return description, ac_items


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


def fetch_work_item(org: str, project: str, work_item_id: int, pat: str, api_base: str) -> dict:
    base = api_base.rstrip("/")
    project_q = urllib.parse.quote(project)
    url = (
        f"{base}/{urllib.parse.quote(org)}/{project_q}"
        f"/_apis/wit/workitems/{work_item_id}?$expand=all&api-version=7.1"
    )
    request = urllib.request.Request(url, method="GET", headers=auth_headers(pat))
    try:
        with urlopen_retry(request, timeout=90) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Azure DevOps HTTP {exc.code}: {detail}") from exc
    return json.loads(raw.decode("utf-8"))


def fetch_comments(org: str, project: str, work_item_id: int, pat: str, api_base: str) -> list[dict]:
    base = api_base.rstrip("/")
    url = (
        f"{base}/{urllib.parse.quote(org)}/{urllib.parse.quote(project)}"
        f"/_apis/wit/workItems/{work_item_id}/comments?api-version={WIT_COMMENTS_API_VERSION}"
    )
    request = urllib.request.Request(url, method="GET", headers=auth_headers(pat))
    try:
        with urlopen_retry(request, timeout=90) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError:
        return []
    comments = payload.get("comments") or payload.get("value") or []
    return comments if isinstance(comments, list) else []


def load_work_item(raw: str) -> dict:
    data = json.loads(raw)
    if isinstance(data, list):
        data = data[0] if data else {}
    if not isinstance(data, dict):
        raise ValueError("Work item JSON must be an object")
    return data


def work_item_slug(work_item: dict) -> str:
    fields = work_item.get("fields") or {}
    number = work_item.get("id") or fields.get("System.Id")
    return f"us-{number}" if number else "spec"


def _add_url(urls: list[dict], seen: set[str], url: str, origin: str, alt: str = "", filename: str = "") -> None:
    cleaned = (url or "").strip().strip("<>").strip()
    if not cleaned or cleaned in seen:
        return
    seen.add(cleaned)
    urls.append(
        {
            "url": cleaned,
            "origin": origin,
            "alt": alt or "",
            "filename": filename or Path(cleaned).name,
            "caption": alt or filename or Path(cleaned).name,
        }
    )


def extract_urls_from_html(html_value: str, origin: str, urls: list[dict], seen: set[str]) -> None:
    if not html_value:
        return
    for match in re.finditer(r"<img\b[^>]*>", html_value, flags=re.IGNORECASE):
        tag = match.group(0)
        src = re.search(r'src=["\']([^"\']+)["\']', tag, re.IGNORECASE)
        alt = re.search(r'alt=["\']([^"\']*)["\']', tag, re.IGNORECASE)
        if src:
            _add_url(urls, seen, src.group(1), origin, alt=alt.group(1) if alt else "")
    cleaned = clean_html(html_value)
    for match in _MD_IMAGE_RE.finditer(cleaned):
        _add_url(urls, seen, match.group(2), origin, alt=match.group(1))


def extract_urls_from_text(text: str, origin: str, urls: list[dict], seen: set[str]) -> None:
    if not text:
        return
    for match in _MD_IMAGE_RE.finditer(text):
        _add_url(urls, seen, match.group(2), origin, alt=match.group(1))


def collect_visual_urls(work_item: dict, comments: list[dict] | None = None) -> list[dict]:
    urls: list[dict] = []
    seen: set[str] = set()
    fields = work_item.get("fields") or {}
    description_html = fields.get("System.Description") or fields.get("Microsoft.VSTS.TCM.ReproSteps") or ""
    ac_html = fields.get("Microsoft.VSTS.Common.AcceptanceCriteria") or ""
    extract_urls_from_html(description_html, "body", urls, seen)
    extract_urls_from_html(ac_html, "body", urls, seen)
    for relation in work_item.get("relations") or []:
        if (relation.get("rel") or "").endswith("AttachedFile"):
            _add_url(urls, seen, relation.get("url") or "", "relation", filename=relation.get("attributes", {}).get("name", ""))
    for comment in comments or []:
        text = comment.get("text") or comment.get("body") or ""
        extract_urls_from_html(text, "comment", urls, seen)
        extract_urls_from_text(text, "comment", urls, seen)
    return urls


def build_spec_md(work_item: dict, org: str | None, project: str | None) -> str:
    fields = work_item.get("fields") or {}
    number = work_item.get("id") or fields.get("System.Id")
    slug = work_item_slug(work_item)
    title = (fields.get("System.Title") or (f"US {number}" if number else "Specification")).strip()
    state = (fields.get("System.State") or "").strip()
    work_item_type = (fields.get("System.WorkItemType") or "").strip()
    assigned = fields.get("System.AssignedTo") or {}
    assignee = assigned.get("displayName") or assigned.get("uniqueName") or ""
    tags_raw = fields.get("System.Tags") or ""
    tags = [t.strip() for t in tags_raw.split(";") if t.strip()] if isinstance(tags_raw, str) else []

    description_html = fields.get("System.Description") or fields.get("Microsoft.VSTS.TCM.ReproSteps") or ""
    description_text = clean_html(description_html)
    ac_html = fields.get("Microsoft.VSTS.Common.AcceptanceCriteria") or ""
    ac_text = clean_html(ac_html)

    description, ac_from_desc = split_body(description_text)
    ac_items: list[str] = []
    if ac_text:
        _, ac_from_field = split_body(
            ac_text if _AC_HEADING.search(ac_text) else f"## Acceptance Criteria\n{ac_text}"
        )
        if ac_from_field:
            ac_items = ac_from_field
        else:
            for line in ac_text.split("\n"):
                item = re.sub(r"^[-*+]\s+|^\d+[.)]\s+|^\[[ xX]\]\s+", "", line.strip()).strip()
                if item:
                    ac_items.append(item)
    if not ac_items:
        ac_items = ac_from_desc
        if not ac_from_desc:
            description = description_text

    if org and project and number:
        url = (
            f"https://dev.azure.com/{urllib.parse.quote(org)}/"
            f"{urllib.parse.quote(project)}/_workitems/edit/{number}"
        )
    else:
        url = work_item.get("url") or work_item.get("_links", {}).get("html", {}).get("href") or ""

    fm = [
        "---",
        f"id: {number if number else 'null'}",
        f"slug: {slug}",
        f'title: "{title.replace(chr(34), chr(39))}"',
        "source: azure-devops",
    ]
    if state:
        fm.append(f"issueState: {state}")
    if work_item_type:
        fm.append(f'workItemType: "{work_item_type}"')
    if url:
        fm.append(f'issueUrl: "{url}"')
    if tags:
        fm.append(f"labels: [{', '.join(tags)}]")
    fm.append(f"specDate: {date.today().isoformat()}")
    fm.append("---")
    fm.append("")

    body: list[str] = [f"# Specification — {title}", ""]
    meta = []
    if work_item_type:
        meta.append(f"**Type:** {work_item_type}")
    if state:
        meta.append(f"**State:** {state}")
    if assignee:
        meta.append(f"**Assignee:** {assignee}")
    if tags:
        meta.append(f"**Tags:** {', '.join(tags)}")
    if meta:
        body.extend(meta)
        body.append("")

    body.append("## Description")
    body.append("")
    body.append(description or "_No description in the work item._")
    body.append("")

    body.append("## Acceptance Criteria")
    body.append("")
    if ac_items:
        for idx, ac in enumerate(ac_items, 1):
            body.append(f"- AC{idx}: {ac}")
    else:
        body.append(
            "_No explicit acceptance criteria in the work item — extract/validate during refinement._"
        )
    body.append("")

    body.append("## Original Issue Context")
    body.append("")
    body.append(description_text or "_No description in the work item._")
    if ac_text:
        body.append("")
        body.append(ac_text)
    body.append("")

    body.append("## Notes")
    body.append("")
    body.append("_Automatically generated from Azure DevOps work item JSON._")
    body.append("")

    return "\n".join(fm + body)


def invoke_ingest_helper(
    spec_path: Path,
    urls: list[dict],
    skip_assets: bool,
    api_base: str,
    auth_env: str,
    repo_root: Path | None = None,
) -> int:
    if skip_assets or not urls:
        return 0
    helper = Path(__file__).resolve().parents[2] / "ws-shared" / "scripts" / "ingest_visual_attachments.cjs"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(urls, handle)
        urls_path = handle.name
    try:
        cmd = [
            "node",
            str(helper),
            "--spec-path",
            str(spec_path),
            "--urls-json",
            urls_path,
            "--provider",
            "azure-devops",
            "--api-base",
            api_base,
            "--auth-env",
            auth_env,
        ]
        if repo_root is not None:
            cmd.extend(["--repo-root", str(repo_root)])
        if skip_assets:
            cmd.append("--skip-assets")
        proc = subprocess.run(cmd, check=False)
        return proc.returncode
    finally:
        try:
            os.unlink(urls_path)
        except OSError:
            pass


def main() -> int:
    ensure_utf8_stdio()

    parser = argparse.ArgumentParser(
        description="Fetch/convert Azure DevOps work item JSON into canonical *.spec.md"
    )
    parser.add_argument("--input", help="Path to WIT JSON file, or '-' for stdin (offline mode)")
    parser.add_argument(
        "--output",
        help="Output path for *.spec.md (default: resolve_spec_path.cjs --slug {unprefixedSlug})",
    )
    parser.add_argument("--specs-dir", help="Override plans.specsDir for the default output path")
    parser.add_argument(
        "--repo-root",
        help="Project root owning ws-shared/config.json (default: CWD when it has a hub)",
    )
    parser.add_argument("--snapshot", help="Optional path to write raw issue/work-item JSON")
    parser.add_argument("--id", type=int, help="Work item id (live fetch mode)")
    parser.add_argument("--org", default="", help="Azure DevOps organization")
    parser.add_argument("--project", default="", help="Azure DevOps project")
    parser.add_argument(
        "--api-base",
        default="https://dev.azure.com",
        help="API base URL (default https://dev.azure.com)",
    )
    parser.add_argument(
        "--pat-env",
        default="ADO_PAT",
        help="Env var name holding the PAT (default ADO_PAT; also tries AZURE_DEVOPS_PAT)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing spec of record when content differs",
    )
    parser.add_argument(
        "--skip-assets",
        action="store_true",
        help="Skip visual attachment ingest (fixture/tests only)",
    )
    args = parser.parse_args()

    comments: list[dict] = []

    if args.input:
        if args.input == "-":
            raw = sys.stdin.read()
        else:
            input_path = Path(args.input)
            if not input_path.is_file():
                print(f"Error: input file not found: {input_path}", file=sys.stderr)
                return 1
            raw = input_path.read_text(encoding="utf-8")
        try:
            work_item = load_work_item(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"Error: invalid JSON — {exc}", file=sys.stderr)
            return 1
        comments = work_item.get("comments") or []
    elif args.id is not None:
        if not args.org or not args.project:
            print("Error: --org and --project are required for live fetch", file=sys.stderr)
            return 1
        pat = resolve_pat(args.pat_env)
        work_item = fetch_work_item(args.org, args.project, args.id, pat, args.api_base)
        comments = fetch_comments(args.org, args.project, args.id, pat, args.api_base)
        if args.snapshot:
            snap = Path(args.snapshot)
            snap.parent.mkdir(parents=True, exist_ok=True)
            snap.write_text(json.dumps(work_item, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"Snapshot written to: {snap}")
    else:
        print("Error: provide --input (offline) or --id with --org/--project (live)", file=sys.stderr)
        return 1

    if args.snapshot and args.input:
        snap = Path(args.snapshot)
        snap.parent.mkdir(parents=True, exist_ok=True)
        snap.write_text(json.dumps(work_item, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Snapshot written to: {snap}")

    visual_urls = collect_visual_urls(work_item, comments)
    spec_md = build_spec_md(work_item, args.org or None, args.project or None)

    repo_root = resolve_repo_root(args.repo_root, script_file=__file__)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = resolve_default_output(repo_root, work_item_slug(work_item))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and not args.force:
        existing = output_path.read_text(encoding="utf-8").replace("\r\n", "\n")
        if existing != spec_md.replace("\r\n", "\n"):
            print(
                f"ERROR: spec of record exists and differs: {output_path}\n"
                "Preserve your edits or pass --force to overwrite.",
                file=sys.stderr,
            )
            return 1
    output_path.write_text(spec_md, encoding="utf-8")

    ingest_rc = invoke_ingest_helper(
        output_path,
        visual_urls,
        args.skip_assets,
        args.api_base,
        args.pat_env,
        repo_root,
    )
    if ingest_rc != 0:
        print(f"Warning: visual ingest helper exited {ingest_rc}", file=sys.stderr)

    print(f"Spec written to: {output_path}")
    print("Next: register into the workflow copy via ws-spec-provider-local")
    print(f"  register_local_spec.py --input {output_path} --source azure-devops")
    return 0


if __name__ == "__main__":
    sys.exit(main())
