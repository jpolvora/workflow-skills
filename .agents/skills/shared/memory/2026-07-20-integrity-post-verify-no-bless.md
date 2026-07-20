### [2026-07-20] Integrity — never bless failed post-verify with actual digests
- **Layer**: `Installer / Integrity`
- **Module**: `bin/cli.js · postVerifyAndWriteLocal`
- **Severity**: `High`
- **Trap Avoided**: Writing `skill-integrity-local.json` from **actual** digests on consumer post-verify failure (then exiting ≠0) made later `integrity` audit pass against a known-bad tree, defeating AC5/AC6.
- **Solution**: Write the local record only when verify OK or `--force-integrity`. On fail without force, leave the prior record (or none) so audit stays honest. Cover with Phase 11: unmanaged extra file → update post-verify fail → local JSON bytes unchanged.
