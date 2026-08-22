### [2026-08-22] ADO comment_issue accepts org/project CLI overrides
- **Layer**: `Harness`
- **Module**: `ws-azure-devops-provider / comment_issue.py`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-azure-devops-provider/scripts/comment_issue.py, .agents/skills/ws-azure-devops-provider/INTENTS.md, test/test-provider-parity.js`
- **Scenario / Context**: Agents passed `--org`/`--project`/`--api-base`/`--pat-env` (same flags as `ado-workitem-to-spec.py`); argparse rejected them as unrecognized
- **DO NOT**: Require tracker host fields only from config.json when sibling ADO scripts take CLI overrides
- **INSTEAD DO**: Accept optional `--org` `--project` `--api-base` `--pat-env` that override `issueTrackers.azureDevOps`; keep config as the default
