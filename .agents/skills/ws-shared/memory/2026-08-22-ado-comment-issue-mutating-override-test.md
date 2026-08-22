### [2026-08-22] ADO comment_issue dry-run does not prove CLI overrides
- **Layer**: `Harness`
- **Module**: `ws-azure-devops-provider / comment_issue.py`
- **Severity**: `High`
- **PathPattern**: `test/test-provider-parity.js, .agents/skills/ws-azure-devops-provider/scripts/comment_issue.py`
- **Scenario / Context**: `--dry-run` returns before `apply_cli_overrides`; a dry-run spawn still passed if the mutating merge was removed
- **DO NOT**: Treat argparse acceptance plus `--dry-run` as proof that `--org`/`--project` reach `validate_auth` / `post_comment`
- **INSTEAD DO**: Spawn the mutating path with PAT env cleared and assert `Missing PAT` (not missing org/project)
