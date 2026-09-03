#!/usr/bin/env python3
"""
Converts JSON from `gh issue view {n} --json ...` into the spec of record under {specsDir}.

Usage:
  gh issue view 1234 --json number,title,body,state,labels,assignees,comments,url \
    > {plansDir}/us-1234/step-00-us-1234.issue.json
  python github-issue-to-spec.py \
    --input {plansDir}/us-1234/step-00-us-1234.issue.json \
    --repo {owner}/{repo}

Output defaults via `resolve_spec_path.cjs --slug {unprefixedSlug}`.
Promote to workflow copy with ws-spec-provider-local register_local_spec.

`--output` overrides the destination. `--input` also accepts `-` for stdin.
`--skip-assets` skips the shared visual ingest helper (fixture/tests only).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

_SHARED_SCRIPTS = Path(__file__).resolve().parents[2] / "ws-shared" / "scripts"
if str(_SHARED_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SHARED_SCRIPTS))
from resolve_consumer_root import resolve_repo_root, resolve_config_path  # noqa: E402


def ensure_utf8_stdio() -> None:
    """Force UTF-8 on stdio so Windows locale (cp1252) does not break on Unicode (e.g. →)."""
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


DEFAULT_SPECS_DIR = ".agents/specs"
_MD_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
_HTML_IMG_RE = re.compile(
    r'<img[^>]+src=["\']([^"\']+)["\'][^>]*?(?:alt=["\']([^"\']*)["\'])?[^>]*>',
    re.IGNORECASE,
)
_GH_USER_ATTACH_RE = re.compile(
    r"https?://github\.com/user-attachments/[^\s)>\]]+",
    re.IGNORECASE,
)


def resolve_specs_dir(repo_root: Path, override: str | None = None) -> Path:
    """Absolute specsDir from --specs-dir, else plans.specsDir, else the portable default."""
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


def load_issue(raw: str) -> dict:
    data = json.loads(raw)
    if isinstance(data, list):  # `gh issue list --json` returns an array
        data = data[0] if data else {}
    return data or {}


_AC_HEADING = re.compile(
    r"^#{1,6}\s*(crit[eé]rios?\s+de\s+aceite|acceptance\s+criteria|ac[s]?)\b",
    re.IGNORECASE,
)


def split_body(body: str) -> tuple[str, list[str]]:
    """Return (description, acceptance-criteria items)."""
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
    for line in lines[ac_start + 1:]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):  # next section ends the AC block
            break
        item = re.sub(r"^[-*+]\s+|^\d+[.)]\s+|^\[[ xX]\]\s+", "", stripped).strip()
        item = re.sub(r"^-?\s*\[[ xX]\]\s*", "", item).strip()
        if item:
            ac_items.append(item)
    return description, ac_items


def issue_slug(issue: dict) -> str:
    number = issue.get("number")
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


def extract_urls_from_text(text: str, origin: str, urls: list[dict], seen: set[str]) -> None:
    if not text:
        return
    for match in _MD_IMAGE_RE.finditer(text):
        _add_url(urls, seen, match.group(2), origin, alt=match.group(1))
    for match in _HTML_IMG_RE.finditer(text):
        _add_url(urls, seen, match.group(1), origin, alt=match.group(2) or "")
    for match in _GH_USER_ATTACH_RE.finditer(text):
        _add_url(urls, seen, match.group(0), origin)


def collect_visual_urls(issue: dict) -> list[dict]:
    urls: list[dict] = []
    seen: set[str] = set()
    body = issue.get("body") or ""
    extract_urls_from_text(body, "body", urls, seen)
    for comment in issue.get("comments") or []:
        extract_urls_from_text((comment.get("body") or ""), "comment", urls, seen)
    return urls


def build_spec_md(issue: dict, repo: str | None) -> str:
    number = issue.get("number")
    slug = issue_slug(issue)
    title = (issue.get("title") or (f"US {number}" if number else "Specification")).strip()
    state = (issue.get("state") or "").lower()
    url = issue.get("url") or (
        f"https://github.com/{repo}/issues/{number}" if repo and number else ""
    )
    labels = [l.get("name") for l in (issue.get("labels") or []) if l.get("name")]
    assignees = [a.get("login") for a in (issue.get("assignees") or []) if a.get("login")]

    description, ac_items = split_body(issue.get("body") or "")
    raw_body = (issue.get("body") or "").strip()

    fm = [
        "---",
        f"id: {number if number else 'null'}",
        f"slug: {slug}",
        f'title: "{title.replace(chr(34), chr(39))}"',
        "source: github",
    ]
    if state:
        fm.append(f"issueState: {state}")
    if url:
        fm.append(f'issueUrl: "{url}"')
    if labels:
        fm.append(f"labels: [{', '.join(labels)}]")
    fm.append(f"specDate: {date.today().isoformat()}")
    fm.append("---")
    fm.append("")

    body_lines: list[str] = [f"# Specification — {title}", ""]
    meta = []
    if state:
        meta.append(f"**State:** {state}")
    if assignees:
        meta.append(f"**Assignees:** {', '.join(assignees)}")
    if labels:
        meta.append(f"**Labels:** {', '.join(labels)}")
    if meta:
        body_lines.extend(meta)
        body_lines.append("")

    body_lines.append("## Description")
    body_lines.append("")
    body_lines.append(description or "_No description in the issue._")
    body_lines.append("")

    body_lines.append("## Acceptance Criteria")
    body_lines.append("")
    if ac_items:
        for idx, ac in enumerate(ac_items, 1):
            body_lines.append(f"- AC{idx}: {ac}")
    else:
        body_lines.append("_No explicit acceptance criteria in the issue — extract/validate during refinement._")
    body_lines.append("")

    body_lines.append("## Original Issue Context")
    body_lines.append("")
    body_lines.append(raw_body or "_No description in the issue._")
    body_lines.append("")
    comments = issue.get("comments") or []
    if comments:
        body_lines.append("### Comments")
        body_lines.append("")
        for c in comments:
            author = (c.get("author") or {}).get("login") or "?"
            text = (c.get("body") or "").strip()
            if text:
                body_lines.append(f"- **{author}:** {text}")
        body_lines.append("")

    body_lines.append("## Notes")
    body_lines.append("")
    body_lines.append("_Automatically generated from gh issue view JSON (GitHub)._")
    body_lines.append("")

    return "\n".join(fm + body_lines)


def invoke_ingest_helper(spec_path: Path, urls: list[dict], skip_assets: bool, repo_root: Path | None = None) -> int:
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
            "github",
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

    parser = argparse.ArgumentParser(description="Converts JSON from gh issue view into canonical *.spec.md")
    parser.add_argument("--input", required=True, help="Path to JSON file (gh issue view --json ...) or '-' for stdin")
    parser.add_argument(
        "--output",
        help="Output path for *.spec.md (default: resolve_spec_path.cjs --slug {unprefixedSlug})",
    )
    parser.add_argument("--specs-dir", help="Override plans.specsDir for the default output path")
    parser.add_argument(
        "--repo-root",
        help="Project root owning ws-shared/config.json (default: CWD when it has a hub)",
    )
    parser.add_argument("--repo", default="", help="owner/repo (for issueUrl when missing in JSON)")
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

    if args.input == "-":
        raw = sys.stdin.read()
    else:
        input_path = Path(args.input)
        if not input_path.is_file():
            print(f"Error: input file not found: {input_path}", file=sys.stderr)
            return 1
        raw = input_path.read_text(encoding="utf-8")

    try:
        issue = load_issue(raw)
    except json.JSONDecodeError as exc:
        print(f"Error: invalid JSON — {exc}", file=sys.stderr)
        return 1

    spec_md = build_spec_md(issue, args.repo or None)
    visual_urls = collect_visual_urls(issue)

    repo_root = resolve_repo_root(args.repo_root, script_file=__file__)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = resolve_default_output(repo_root, issue_slug(issue))

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

    ingest_rc = invoke_ingest_helper(output_path, visual_urls, args.skip_assets, repo_root)
    if ingest_rc != 0:
        print(f"Warning: visual ingest helper exited {ingest_rc}", file=sys.stderr)

    print(f"Spec written to: {output_path}")
    print("Next: register into the workflow copy via ws-spec-provider-local")
    print(f"  register_local_spec.py --input {output_path} --source github")
    return 0


if __name__ == "__main__":
    sys.exit(main())
