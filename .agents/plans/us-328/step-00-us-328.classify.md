# Complexity classification — us-328

- **Recommended pipeline:** standard
- **Final pipeline:** standard
- **Complexity class:** standard (override: user explicitly requested `/ws-spec-to-pr` full auto ship PR mode)
- **Exec mode:** sequential (`defaults.enableDag: false`)
- **runInterview:** true (standard planning chain intact; autoMode auto-accepts, never skips Steps 1–3)
- **Reason:** Upstream docs fix with mirror-sync generator involvement (`bin/cli.js` renderer), regression test, integrity regen, and PR convergence — warrants full review (Step 6) + testing (Step 7) + fix-PR (Step 9). Raw issue is a one-line prose fix, but delivery spans 2 hub files + test + manifest, so lite fast-path was declined per explicit user instruction.
- **Scores:** scope small, files 3–4, layers 2 (skills-sot + installer-cli) — within DAG thresholds, sequential execution.
