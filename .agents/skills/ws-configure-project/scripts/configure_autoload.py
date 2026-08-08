#!/usr/bin/env python3
"""
Configure / validate shared autoload.md Always-applied paths and optional root AGENTS.md.

Usage:
  python configure_autoload.py --write-autoload [--repo-root DIR] [--global-skills-root DIR]
  python configure_autoload.py --write-root-agents [--repo-root DIR] [--global-skills-root DIR]
  python configure_autoload.py --check [--repo-root DIR] [--global-skills-root DIR] [--json]
  python configure_autoload.py --emit-paths [--repo-root DIR] [--global-skills-root DIR] [--json]

Never writes absolute filesystem paths into markdown. Prefer project-local
`.agents/skills/...` when SKILL.md exists there; else `{globalSkillsRoot}/...`.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path


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

DEFAULT_ALWAYS_APPLIED: list[tuple[str, str]] = [
    ("ws-senior-developer", "Every prompt — delivery gate / Code review proof"),
    ("ws-self-learning", "Every mutating task — MEMORY consult + trap write"),
    ("ws-changelog", "Every task completion — append-only history"),
    ("ws-fable-method", "Every prompt — structured investigate/act/verify when non-trivial"),
    ("ws-tdah", "Every prompt — action-first shape + judgment"),
]

ABS_PATH_RE = re.compile(
    r"(?:^[A-Za-z]:\\|/Users/|/home/|\\\\)",
)
SKILL_ROW_RE = re.compile(
    r"^\|\s*`(?P<id>ws-[a-z0-9-]+)`\s*\|\s*(?P<path>[^|]+)\|\s*(?P<trigger>[^|]+)\|\s*$",
    re.MULTILINE,
)


def default_repo_root() -> Path:
    # scripts/ -> ws-configure-project -> skills -> .agents -> repo
    return Path(__file__).resolve().parents[4]


def resolve_global_skills_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    env = os.environ.get("WORKFLOW_SKILLS_GLOBAL_DIR", "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return (Path.home() / ".agents" / "skills").resolve()


def emit_skill_path(
    repo_root: Path,
    skill_id: str,
    *,
    skills_root_rel: str = ".agents/skills",
    global_skills_root: Path | None = None,
) -> tuple[str, bool]:
    """Return (portable path form, missing). Never absolute."""
    local_skill = repo_root / skills_root_rel / skill_id / "SKILL.md"
    if local_skill.is_file():
        return f".agents/skills/{skill_id}/SKILL.md", False

    groot = global_skills_root or resolve_global_skills_root(None)
    global_skill = groot / skill_id / "SKILL.md"
    if global_skill.is_file():
        return f"{{globalSkillsRoot}}/{skill_id}/SKILL.md", False

    return f"{{skillsRoot}}/{skill_id}/SKILL.md", True


def build_always_applied_table(
    repo_root: Path,
    *,
    global_skills_root: Path | None = None,
) -> tuple[str, list[dict]]:
    rows: list[str] = [
        "| Skill | Path | Trigger |",
        "|-------|------|---------|",
    ]
    meta: list[dict] = []
    for skill_id, trigger in DEFAULT_ALWAYS_APPLIED:
        path_form, missing = emit_skill_path(
            repo_root, skill_id, global_skills_root=global_skills_root
        )
        rows.append(f"| `{skill_id}` | `{path_form}` | {trigger} |")
        meta.append({"skill": skill_id, "path": path_form, "missing": missing})
    return "\n".join(rows) + "\n", meta


def ensure_autoload_md(
    repo_root: Path,
    *,
    global_skills_root: Path | None = None,
    dry_run: bool = False,
) -> dict:
    shared = repo_root / ".agents" / "skills" / "ws-shared"
    autoload_path = shared / "autoload.md"
    if not autoload_path.is_file():
        raise SystemExit(f"ERROR: missing {autoload_path} (install hub / copy template)")

    text = autoload_path.read_text(encoding="utf-8")
    table, meta = build_always_applied_table(
        repo_root, global_skills_root=global_skills_root
    )

    # Replace Always-applied markdown table (first table after heading).
    pattern = re.compile(
        r"(## Always-applied skills\n.*?\n)"
        r"(\| Skill \| Path \| Trigger \|\n\|[-| ]+\|\n(?:\|.*\|\n)+)",
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        raise SystemExit("ERROR: could not find Always-applied skills table in autoload.md")

    new_text = text[: match.start(2)] + table + text[match.end(2) :]
    if "ws-configure-project" in new_text and "when that section is implemented" in new_text:
        new_text = new_text.replace(
            "Customize the Always-applied table per project when needed (or via `ws-configure-project` when that section is implemented).",
            "Customize the Always-applied table per project when needed (or via `ws-configure-project --section autoload`).",
        )

    written = False
    if new_text != text and not dry_run:
        autoload_path.write_text(new_text, encoding="utf-8")
        written = True

    return {
        "autoloadPath": str(autoload_path.as_posix()),
        "written": written,
        "changed": new_text != text,
        "skills": meta,
    }


ROOT_AGENTS_TEMPLATE = """# AGENTS.md — Consumer root override

**Audience: agents.** Thin pointer only. Full consumer hub: [`.agents/skills/ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).

## Autoload (Always-applied)

Load **every** skill listed in [`.agents/skills/ws-shared/autoload.md`](.agents/skills/ws-shared/autoload.md) § Always-applied skills on every prompt (unless the user opted out for that skill).

When both this file and `.agents/skills/ws-shared/AGENTS.md` load, **this root file wins** for autoload membership of those skills (intentional consumer root override over shared-hub on-demand defaults).

### Resolved paths

{table}

## Specs progressive disclosure

When the user mentions specs / plans / Spec-to-PR / `index.PRD` without naming a skill, load `autoload.md` § Specs vocabulary and § Specs skill router, then load **only** the matching skill.

## Precedence (highest first)

1. Explicit user instructions (current turn)
2. This root `AGENTS.md` (autoload membership via `autoload.md`)
3. `.agents/skills/ws-shared/AGENTS.md` (consumer hub)
4. Design / spec / architecture constraints
"""


def write_root_agents(
    repo_root: Path,
    *,
    global_skills_root: Path | None = None,
    dry_run: bool = False,
) -> dict:
    table_lines = [
        "| Skill | Path |",
        "|-------|------|",
    ]
    meta: list[dict] = []
    for skill_id, _trigger in DEFAULT_ALWAYS_APPLIED:
        path_form, missing = emit_skill_path(
            repo_root, skill_id, global_skills_root=global_skills_root
        )
        table_lines.append(f"| `{skill_id}` | `{path_form}` |")
        meta.append({"skill": skill_id, "path": path_form, "missing": missing})

    body = ROOT_AGENTS_TEMPLATE.format(table="\n".join(table_lines))
    if contains_absolute_path(body):
        raise SystemExit("ERROR: refused to write root AGENTS.md with absolute paths")

    dest = repo_root / "AGENTS.md"
    written = False
    if not dry_run:
        dest.write_text(body, encoding="utf-8", newline="\n")
        written = True

    return {
        "rootAgentsPath": "AGENTS.md",
        "written": written,
        "skills": meta,
    }


def contains_absolute_path(text: str) -> bool:
    """Detect author-machine absolute paths in markdown (Windows drive or /Users|/home)."""
    for line in text.splitlines():
        if re.search(r"[A-Za-z]:\\", line):
            return True
        if re.search(r"(?:^|[\s`\"'(])/Users/", line):
            return True
        if re.search(r"(?:^|[\s`\"'(])/home/", line):
            return True
        if ABS_PATH_RE.search(line) and ("SKILL.md" in line or "agents" in line.lower()):
            return True
    return False


def parse_always_applied_rows(text: str) -> list[dict]:
    rows: list[dict] = []
    in_section = False
    for line in text.splitlines():
        if line.startswith("## Always-applied"):
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if not in_section:
            continue
        m = SKILL_ROW_RE.match(line)
        if not m:
            continue
        skill_id = m.group("id")
        path_raw = m.group("path").strip().strip("`").strip()
        rows.append({"skill": skill_id, "path": path_raw})
    return rows


def path_form_ok(path_form: str) -> bool:
    if contains_absolute_path(f"`{path_form}`"):
        return False
    if path_form.startswith("{skillsRoot}/") or path_form.startswith("{globalSkillsRoot}/"):
        return True
    if path_form.startswith(".agents/skills/"):
        return True
    return False


def skill_resolves(
    repo_root: Path,
    skill_id: str,
    *,
    global_skills_root: Path | None = None,
) -> bool:
    path_form, missing = emit_skill_path(
        repo_root, skill_id, global_skills_root=global_skills_root
    )
    return not missing or path_form.startswith("{")


def check_autoload(
    repo_root: Path,
    *,
    global_skills_root: Path | None = None,
) -> dict:
    findings: list[dict] = []
    shared = repo_root / ".agents" / "skills" / "ws-shared"
    autoload_path = shared / "autoload.md"
    root_agents = repo_root / "AGENTS.md"

    if not autoload_path.is_file():
        return {
            "ok": True,
            "findings": [],
            "note": "autoload.md absent — skip Always-applied checks",
            "rootAgentsPresent": root_agents.is_file(),
        }

    text = autoload_path.read_text(encoding="utf-8")
    if contains_absolute_path(text):
        findings.append(
            {
                "severity": "critical",
                "file": ".agents/skills/ws-shared/autoload.md",
                "message": "Absolute filesystem path detected; use relative or declared tokens only",
                "fix": "Run ws-configure-project --section autoload / configure_autoload.py --write-autoload",
            }
        )

    for row in parse_always_applied_rows(text):
        if not path_form_ok(row["path"]):
            findings.append(
                {
                    "severity": "warning",
                    "file": ".agents/skills/ws-shared/autoload.md",
                    "message": f"Always-applied path for `{row['skill']}` is not portable: {row['path']}",
                    "fix": "Use `.agents/skills/...` or `{skillsRoot}` / `{globalSkillsRoot}` tokens",
                }
            )
        local = repo_root / ".agents" / "skills" / row["skill"] / "SKILL.md"
        groot = global_skills_root or resolve_global_skills_root(None)
        global_skill = groot / row["skill"] / "SKILL.md"
        if not local.is_file() and not global_skill.is_file():
            findings.append(
                {
                    "severity": "warning",
                    "file": ".agents/skills/ws-shared/autoload.md",
                    "message": f"Always-applied skill `{row['skill']}` missing under skillsRoot and globalSkillsRoot",
                    "fix": f"Install `{row['skill']}` or remove the Always-applied row",
                }
            )

    if root_agents.is_file():
        root_text = root_agents.read_text(encoding="utf-8")
        if contains_absolute_path(root_text):
            findings.append(
                {
                    "severity": "critical",
                    "file": "AGENTS.md",
                    "message": "Absolute filesystem path detected in root AGENTS.md",
                    "fix": "Regenerate via configure_autoload.py --write-root-agents",
                }
            )
        # Dual-hub override: referencing autoload.md is intentional — no finding.

    critical = sum(1 for f in findings if f["severity"] == "critical")
    return {
        "ok": critical == 0,
        "findings": findings,
        "rootAgentsPresent": root_agents.is_file(),
        "autoloadPresent": True,
        "dualHubOverrideOk": (
            (not root_agents.is_file())
            or ("autoload.md" in root_agents.read_text(encoding="utf-8"))
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=None, help="Consumer / package repo root")
    parser.add_argument(
        "--global-skills-root",
        default=None,
        help="Override {globalSkillsRoot} (default WORKFLOW_SKILLS_GLOBAL_DIR or ~/.agents/skills)",
    )
    parser.add_argument("--write-autoload", action="store_true")
    parser.add_argument("--write-root-agents", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--emit-paths", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else default_repo_root()
    groot = (
        Path(args.global_skills_root).expanduser().resolve()
        if args.global_skills_root
        else resolve_global_skills_root(None)
    )

    if not any(
        [args.write_autoload, args.write_root_agents, args.check, args.emit_paths]
    ):
        parser.error("Choose --write-autoload, --write-root-agents, --check, or --emit-paths")

    out: dict = {"repoRoot": str(repo_root.as_posix())}

    if args.emit_paths:
        _, meta = build_always_applied_table(repo_root, global_skills_root=groot)
        out["skills"] = meta

    if args.write_autoload:
        out["autoload"] = ensure_autoload_md(
            repo_root, global_skills_root=groot, dry_run=args.dry_run
        )

    if args.write_root_agents:
        out["rootAgents"] = write_root_agents(
            repo_root, global_skills_root=groot, dry_run=args.dry_run
        )

    if args.check:
        out["check"] = check_autoload(repo_root, global_skills_root=groot)

    if args.json:
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        if args.emit_paths:
            for row in out.get("skills", []):
                flag = " MISSING" if row["missing"] else ""
                print(f"{row['skill']}: {row['path']}{flag}")
        if "autoload" in out:
            a = out["autoload"]
            print(f"autoload: changed={a['changed']} written={a['written']}")
        if "rootAgents" in out:
            r = out["rootAgents"]
            print(f"root AGENTS.md: written={r['written']}")
        if "check" in out:
            c = out["check"]
            print(f"check ok={c['ok']} findings={len(c['findings'])}")
            for f in c["findings"]:
                print(f"  [{f['severity']}] {f['file']}: {f['message']}")

    if args.check and not out.get("check", {}).get("ok", True):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
