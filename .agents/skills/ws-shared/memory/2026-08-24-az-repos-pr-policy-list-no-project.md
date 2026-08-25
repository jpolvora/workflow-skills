### [2026-08-24] az repos pr policy list rejects --project
- **Layer**: `Harness`
- **Module**: `ws-azure-devops-provider / check-pr-status`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-azure-devops-provider/INTENTS.md`
- **Scenario / Context**: Azure CLI `az repos pr policy list` treats PR ids as organization-unique. Passing `--project` fails with `unrecognized arguments: --project`.
- **DO NOT**: Copy `--project` from `az repos pr create` onto `az repos pr policy list`.
- **INSTEAD DO**: Call `az repos pr policy list --id {PR_ID} --organization "https://dev.azure.com/{org}"` only. Use `--project` on create/list-PRs/`az repos policy list`, not on PR policy evaluations.
