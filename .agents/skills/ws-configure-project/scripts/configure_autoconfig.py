#!/usr/bin/env python3
"""
Merge-write AutoConfig suggestions into project ws-shared/config.json.

Usage:
  python configure_autoconfig.py --apply --suggestions FILE.json
      [--force] [--repo-root DIR] [--dry-run] [--json]

Fills placeholders and missing keys from the suggestion map plus INTERVIEW.md
reasonable defaults. Does not clobber filled values unless --force.

Safety (always):
  - never writes providers.scm = local
  - never writes defaults.autoload = true
  - never writes secret/PAT values (patEnvVar env-var names are allowed)
  - never creates or overwrites repo-root AGENTS.md
  - never installs git hooks
  - never commits config.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
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

SHARED_CONFIG_REL = Path(".agents") / "skills" / "ws-shared" / "config.json"
SHARED_CONFIG_EXAMPLE_REL = Path(".agents") / "skills" / "ws-shared" / "config.json.example"
PLACEHOLDER_RE = re.compile(r"<[^<>]+>")
SECRET_KEY_RE = re.compile(
    r"^(pat|password|passwd|secret|token|apikey|api_key)$",
    re.IGNORECASE,
)
ALLOWED_SECRET_NAME_KEYS = {"patenvvar"}

# INTERVIEW.md / config.json.example reasonable defaults (dotted paths).
REASONABLE_DEFAULTS: dict[str, Any] = {
    "project.workingBranch": "develop",
    "project.gitRemote": "origin",
    "plans.dir": ".agents/plans",
    "plans.specsDir": ".agents/specs",
    "reviews.dir": ".agents/codereviews",
    "rules.stackFile": ".agents/skills/ws-shared/STACK.md",
    "rules.changelogFile": ".agents/skills/ws-shared/CHANGELOG.md",
    "defaults.autoload": False,
    "defaults.deliveryCommitArtifacts.includeRefinedPlan": True,
    "defaults.deliveryCommitArtifacts.includeDeliveryResult": False,
    "defaults.deliveryCommitArtifacts.includeSpec": False,
    "defaults.deliveryCommitArtifacts.includeCheckReport": False,
    "defaults.deliveryCommitArtifacts.includeCodeReview": False,
    "defaults.deliveryCommitArtifacts.includeTestingReport": False,
}


def default_repo_root() -> Path:
    return Path.cwd().resolve()


def load_json_file(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise SystemExit(f"ERROR: could not read or parse {path.as_posix()}: {exc}") from exc
    if not isinstance(data, dict):
        raise SystemExit(f"ERROR: {path.as_posix()} must be a JSON object")
    return data


def is_placeholder(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and PLACEHOLDER_RE.search(value):
        return True
    return False


def is_gap(value: Any, *, missing: bool) -> bool:
    if missing:
        return True
    if is_placeholder(value):
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def is_secret_key(key: str) -> bool:
    if key.lower() in ALLOWED_SECRET_NAME_KEYS:
        return False
    return bool(SECRET_KEY_RE.match(key))


def get_path(data: dict, dotted: str) -> tuple[Any, bool]:
    cur: Any = data
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None, True
        cur = cur[part]
    return cur, False


def set_path(data: dict, dotted: str, value: Any) -> None:
    parts = dotted.split(".")
    cur = data
    for part in parts[:-1]:
        nxt = cur.get(part)
        if not isinstance(nxt, dict):
            nxt = {}
            cur[part] = nxt
        cur = nxt
    cur[parts[-1]] = value


def coerce_scm(value: Any, active: Any) -> Any:
    if value != "local":
        return value
    if active in ("github", "azure-devops"):
        return active
    return "github"


def merge_suggestions(
    current: dict,
    incoming: dict,
    *,
    force: bool,
    path: str = "",
    written: list[str] | None = None,
    kept: list[str] | None = None,
    skipped: list[str] | None = None,
) -> None:
    written = written if written is not None else []
    kept = kept if kept is not None else []
    skipped = skipped if skipped is not None else []

    for key, ival in incoming.items():
        if not isinstance(key, str):
            continue
        if key.startswith("_comment"):
            continue
        dotted = f"{path}.{key}" if path else key
        if is_secret_key(key):
            skipped.append(dotted)
            continue
        if key == "autoload" and ival is True:
            skipped.append(dotted)
            continue
        if key == "scm":
            active = None
            if path == "providers" and isinstance(incoming.get("active"), str):
                active = incoming.get("active")
            elif isinstance(current.get("active"), str):
                active = current.get("active")
            ival = coerce_scm(ival, active)

        cur_missing = key not in current
        cur_val = current.get(key)

        if isinstance(ival, dict):
            if cur_missing or not isinstance(cur_val, dict):
                if force or is_gap(cur_val, missing=cur_missing):
                    current[key] = {}
                    cur_val = current[key]
                else:
                    kept.append(dotted)
                    continue
            merge_suggestions(
                cur_val,
                ival,
                force=force,
                path=dotted,
                written=written,
                kept=kept,
                skipped=skipped,
            )
            continue

        if force or is_gap(cur_val, missing=cur_missing):
            current[key] = ival
            written.append(dotted)
        else:
            kept.append(dotted)


def apply_reasonable_defaults(
    current: dict,
    *,
    force: bool,
    written: list[str],
    kept: list[str],
) -> None:
    for dotted, default in REASONABLE_DEFAULTS.items():
        cur_val, missing = get_path(current, dotted)
        if dotted == "defaults.autoload" and default is True:
            continue
        if force or is_gap(cur_val, missing=missing):
            if dotted == "defaults.autoload":
                set_path(current, dotted, False)
            else:
                set_path(current, dotted, default)
            if dotted not in written:
                written.append(dotted)
        elif dotted not in written and dotted not in kept:
            kept.append(dotted)


def safety_pass(current: dict, skipped: list[str]) -> None:
    providers = current.get("providers")
    if isinstance(providers, dict):
        scm = providers.get("scm")
        if scm == "local":
            providers["scm"] = coerce_scm("local", providers.get("active"))
            skipped.append("providers.scm:coerced-from-local")
    defaults = current.get("defaults")
    if isinstance(defaults, dict) and defaults.get("autoload") is True:
        # Never persist true from this helper. Leave only if we did not just
        # introduce it: AutoConfig must not enable autoload, so force false
        # when the value is true after apply. Existing true is a filled value
        # that merge_suggestions already kept (suggestions cannot set true).
        # If it is still true here, it was pre-existing; leave it.
        pass


def apply_autoconfig(
    repo_root: Path,
    suggestions: dict,
    *,
    force: bool = False,
    dry_run: bool = False,
) -> dict:
    config_path = repo_root / SHARED_CONFIG_REL
    example_path = repo_root / SHARED_CONFIG_EXAMPLE_REL
    created_from_example = False

    if not config_path.is_file():
        if not example_path.is_file():
            raise SystemExit(
                f"ERROR: missing {config_path.as_posix()} and example "
                f"{example_path.as_posix()} (install hub / copy template)"
            )
        if not dry_run:
            config_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(example_path, config_path)
        created_from_example = True

    if config_path.is_file():
        data = load_json_file(config_path)
    elif dry_run and example_path.is_file():
        data = load_json_file(example_path)
    else:
        raise SystemExit(f"ERROR: could not read or parse {config_path.as_posix()}")

    written: list[str] = []
    kept: list[str] = []
    skipped: list[str] = []
    merge_suggestions(
        data,
        suggestions,
        force=force,
        written=written,
        kept=kept,
        skipped=skipped,
    )
    apply_reasonable_defaults(data, force=force, written=written, kept=kept)
    safety_pass(data, skipped)

    # Final invariants
    providers = data.get("providers")
    if isinstance(providers, dict) and providers.get("scm") == "local":
        providers["scm"] = "github"
    defaults = data.get("defaults")
    if isinstance(defaults, dict) and defaults.get("autoload") is True and force:
        defaults["autoload"] = False
        written.append("defaults.autoload")

    wrote_file = False
    if not dry_run:
        config_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        wrote_file = True

    root_agents = repo_root / "AGENTS.md"
    return {
        "configPath": str(config_path.as_posix()),
        "written": wrote_file,
        "createdFromExample": created_from_example,
        "force": force,
        "dryRun": dry_run,
        "applied": written,
        "kept": kept,
        "skipped": skipped,
        "autoload": (
            defaults.get("autoload") if isinstance(defaults, dict) else False
        ),
        "scm": (
            providers.get("scm") if isinstance(providers, dict) else None
        ),
        "touchedRootAgents": False,
        "rootAgentsExists": root_agents.is_file(),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="AutoConfig merge-write for config.json")
    parser.add_argument("--apply", action="store_true", help="Merge suggestions into config.json")
    parser.add_argument("--suggestions", help="JSON object of detected suggestions")
    parser.add_argument("--force", action="store_true", help="Overwrite filled non-placeholder values")
    parser.add_argument("--repo-root", default=None, help="Consumer repo root (default: cwd)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    if not args.apply:
        parser.error("specify --apply")
    if not args.suggestions:
        parser.error("--suggestions FILE.json is required")

    repo_root = Path(args.repo_root).expanduser().resolve() if args.repo_root else default_repo_root()
    suggestions = load_json_file(Path(args.suggestions))
    out = apply_autoconfig(
        repo_root,
        suggestions,
        force=args.force,
        dry_run=args.dry_run,
    )

    if args.json:
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print(
            f"autoconfig written={out['written']} scm={out['scm']} "
            f"autoload={out['autoload']} applied={len(out['applied'])} "
            f"kept={len(out['kept'])} skipped={len(out['skipped'])}"
        )
        print(f"config: {out['configPath']}")
        print("never commit config.json (gitignored)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
