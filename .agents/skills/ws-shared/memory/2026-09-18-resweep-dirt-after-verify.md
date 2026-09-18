### [2026-09-18] re-sweep product dirt after verify before review
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr orch G2 / review preflight`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs`
- **Scenario / Context**: Step 4 recorded `files_touched`, but `test/package.json` was modified afterwards (test tgz re-pointed at the bumped version during verify). G2-code staged only the recorded set, leaving one workflow product file uncommitted — which the fail-closed Step 6 dirty preflight would have STOPped on. Caught by an orch `git status` sweep and committed as a supplement with AC linkage.
- **DO NOT**: Treat the step-4 `files_touched` list as frozen through verify; never enter Step 6 review with uncommitted workflow product files.
- **INSTEAD DO**: After verify and before review, re-sweep `git status` for product-path dirt; when the stage set missed workflow files, commit the supplement path-scoped with the same message family and link its sha to the AC rows before the preflight.
