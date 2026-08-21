#!/usr/bin/env python3
"""
Regression sabotage helper: invert fix, expect test failure, restore bytes.

Usage:
  python run_sabotage.py --test "npm run test-x" --paths file.js --invert-patch invert.patch

Restore failure → git restore --source=HEAD -- <paths>; exit 1.
Restore success is proven against the pre-invert snapshot only (not HEAD-clean).
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def ensure_utf8_stdio() -> None:
    import os

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


def resolve_repo_root(override: str | None = None) -> Path:
    hub = Path(".agents") / "skills" / "ws-shared" / "config.json"
    if override:
        return Path(override).expanduser().resolve()
    cwd = Path.cwd().resolve()
    if (cwd / hub).is_file() or (cwd / ".git").is_dir():
        return cwd
    return Path(__file__).resolve().parents[4]


def apply_patch(repo_root: Path, patch_file: Path) -> None:
    proc = subprocess.run(
        ["git", "apply", "--ignore-whitespace", "--whitespace=nowarn", str(patch_file)],
        cwd=repo_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or "git apply failed")


def is_tracked(repo_root: Path, rel_path: str) -> bool:
    proc = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel_path],
        cwd=repo_root,
        capture_output=True,
    )
    return proc.returncode == 0


def git_restore(repo_root: Path, rel_paths: list[str]) -> bool:
    tracked = [rp for rp in rel_paths if is_tracked(repo_root, rp)]
    if not tracked:
        return True
    proc = subprocess.run(
        ["git", "restore", "--source=HEAD", "--", *rel_paths],
        cwd=repo_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return proc.returncode == 0


def snapshot_restored(abs_paths: list[Path], snapshots: dict[Path, str]) -> bool:
    for p in abs_paths:
        if p.read_text(encoding="utf-8") != snapshots[p]:
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Run regression sabotage (invert, test bites, restore)")
    parser.add_argument("--test", required=True, help="Test command (shell)")
    parser.add_argument("--paths", nargs="+", required=True, help="Product files to invert")
    parser.add_argument("--invert-patch", required=True, help="Caller-authored invert patch file")
    parser.add_argument("--repo-root", default=None)
    parser.add_argument("--simulate-restore-failure", action="store_true", help="Test hook only")
    args = parser.parse_args()

    repo_root = resolve_repo_root(args.repo_root)
    abs_paths = [(repo_root / p).resolve() for p in args.paths]
    rel_paths = []
    for p in abs_paths:
        try:
            rel_paths.append(p.relative_to(repo_root.resolve()).as_posix())
        except ValueError:
            rel_paths.append(str(p))

    snapshots: dict[Path, str] = {}
    for p in abs_paths:
        if not p.is_file():
            print(f"Missing path: {p}", file=sys.stderr)
            return 1
        snapshots[p] = p.read_text(encoding="utf-8")

    patch_file = Path(args.invert_patch).resolve()
    if not patch_file.is_file():
        print(f"Missing invert patch: {patch_file}", file=sys.stderr)
        return 1

    exit_code = 0
    try:
        apply_patch(repo_root, patch_file)
        proc = subprocess.run(
            args.test,
            shell=True,
            cwd=repo_root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode == 0:
            print("Sabotage failed: test passed with inverted code (expected non-zero)", file=sys.stderr)
            exit_code = 1
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    finally:
        for p, content in snapshots.items():
            p.write_text(content, encoding="utf-8")
        if args.simulate_restore_failure:
            abs_paths[0].write_text("CORRUPT", encoding="utf-8")
        restored = snapshot_restored(abs_paths, snapshots)
        tracked = [rp for rp in rel_paths if (repo_root / rp).exists() and is_tracked(repo_root, rp)]
        if not restored:
            git_restore(repo_root, tracked)
            for p, content in snapshots.items():
                p.write_text(content, encoding="utf-8")
            restored = snapshot_restored(abs_paths, snapshots)
        if not restored:
            if args.simulate_restore_failure:
                print("Restore failure: simulated abort", file=sys.stderr)
            else:
                print("Restore failure: byte mismatch after restore; aborted", file=sys.stderr)
            return 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
