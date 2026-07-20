### [2026-07-20] Integrity — npm never packs .gitignore; skip runs/
- **Layer**: `Installer / Packaging`
- **Module**: `bin/install-rules.js · bin/skill-integrity-lib.js · shared/hub.gitignore`
- **Severity**: `High`
- **Trap Avoided**: (1) `HUB_WHITELIST` included `shared/.gitignore`, and the generator hashed it from the working tree, but `npm pack` always omits files named `.gitignore` — packed installs then failed source integrity (`hub/.gitignore missing`). (2) Local `*/runs/**` artifacts (e.g. `09-fix-pr/runs/`) were hashed from disk but not present in the tarball → same pre-copy fail.
- **Solution**: Ship packable `shared/hub.gitignore`; map to consumer `.gitignore` via `HUB_DEST_ALIASES` on install; hash key stays `hub.gitignore` (consumer verify resolves `.gitignore` bytes under that key). Skip directory name `runs` in `SKIP_INSTALL_FILES` / `shouldSkipInstallEntry` so copy and integrity stay pack-aligned. Always `npm run generate-integrity` after skill/hub changes; Phase 0b runs `--check`.
