# Step 6 — Code review (configurable-hub-root, self-review of committed diff vs base)

Scope: `git diff 60198927...HEAD` (78 files, +1006/-297), reviewed after G2
commit 9091c70a. Base `main`, head `feature/configurable-hub-root`.

- No Critical findings. Default-hub behavior is byte-identical by construction
  (resolver returns `.ws` when `sharedDir` is absent; full `npm run test`
  green pre- and post-bump).
- No Warning findings. ESM/CJS interop is guarded (`createRequire` +
  missing-resolver fallback); fail-closed exits carry `HUB_*` codes and a
  `pathTokens.sharedDir` fix pointer; `--check` reports critical instead of
  crashing; log lines use the real config path (`configDisplay`) where the hub
  display would mislead.
- Surgical: every hunk traces to AC1–AC8; 55 SKILL.md version-only bumps are
  the repo-standard `build-site:bump` output; unrelated working-tree entries
  (3 deleted classify files, batch state file) were left unstaged/untouched.
- Fix round: none required → no review-fix commit. G2 9091c70a stands.
