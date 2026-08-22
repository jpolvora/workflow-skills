### [2026-08-22] Azure resolve-thread dry-run needs no remote
- **Layer**: `Harness`
- **Module**: `fix_pr_azure_context.py / test-provider-parity.js`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-azure-devops-provider/scripts/fix_pr_azure_context.py, test/test-provider-parity.js`
- **Scenario / Context**: `resolve-thread --dry-run` still called `detect_repository`. GitHub Actions remotes often omit a `.git` suffix, so the helper SystemExits while local Windows remotes pass. CI failed `Azure resolve-thread --dry-run works without --model` after local `npm test` was green.
- **DO NOT**: Call `detect_repository` (or require an ADO `_git` remote) on `--dry-run` resolve-thread.
- **INSTEAD DO**: Skip remote detection when `dry_run` is set; parse a repo name from any `url=` remote; run the dry-run spawn with `python3` on non-Windows.
