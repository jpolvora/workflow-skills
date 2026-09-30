# Workflow monitor report

Generated: 2026-09-30T15:01:33.559Z
Workflows: 1 (0 active)

## Findings

- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-275-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-272-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "skill-family-naming-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "provider-fetch-visual-attachments-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "hermes-spec-to-pr-enhancements-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "ws-doctor-json-esm-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-250-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-243-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-236-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-235-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-217-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-211-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "us-209-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "spec-prefix-ordering-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "spec-dor-tdd-refinement-hardening-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "harness-spec-benchmark-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "fix-pr-batch-plan-exec-state" but no matching plan state was found on disk.
- **INFO** `vault-unreconciled-workflow`: Memory vault records active workflow "deepseek-harness-improvements-state" but no matching plan state was found on disk.

## Memory Vault

- Backend: spec-memo-vault
- Active workflows in vault: us-275-state, us-272-state, skill-family-naming-state, provider-fetch-visual-attachments-state, hermes-spec-to-pr-enhancements-state, ws-doctor-json-esm-state, us-250-state, us-243-state, us-236-state, us-235-state, us-217-state, us-211-state, us-209-state, spec-prefix-ordering-state, spec-dor-tdd-refinement-hardening-state, harness-spec-benchmark-state, fix-pr-batch-plan-exec-state, deepseek-harness-improvements-state

## Workflows

### ms-20260930T043638Z (Multi-spec Batch)

- Status: completed
- Pipeline: ws-spec-multi
- Base branch: main
- Queue progress: 7 shipped / 7 total (0 pending, 0 failed, 0 skipped)
- Active spec: none
- State: `.agents/plans/ms-20260930T043638Z/ms-20260930T043638Z.state.md`

Queue items:
- [x] dispatch-prompt-audit-trail (shipped) (PR 465)
- [x] fresh-worker-verifier-step (shipped) (PR 466)
- [x] per-task-test-adequacy-review (shipped) (PR 467)
- [x] spec-closure-strengthening (shipped) (PR 468)
- [x] benchmark-publish-fixed-models (shipped) (PR 470)
- [x] per-step-context-budgets (shipped) (PR 471)
- [x] explicit-knowledge-chain (shipped) (PR 472)

## Transcript scan

- Roots: workspaceStorage, logs, logs, logs, logs, logs, logs, logs, logs, logs, logs, 01a0f082-f185-7b01-aadd-f54958a035a2, 01a0f01c-7fe9-7d73-b37f-de1f5a4d1451, 01a0f015-e5a4-7cb0-b7b6-3dfba1ca4b51, 01a0ee9a-3355-7a82-ad9e-ab7daccd6fca, 01a0eead-8b14-7811-8263-1bff68783bdd, 01a0edc3-6c83-7661-9d8d-85f47ecde793, 01a0edbd-771b-7b70-8249-bc548a7d7351, 01a0ed1e-bdfd-7800-8ac6-ca3b590158c9, 01a0e514-8474-78b3-9f39-6c1678d484c0, 01a0e494-f1ab-7a63-9053-41cac1be173a, 01a0e2f4-dca0-78d1-b6a8-223263dc0513, 01a0e105-b528-7ed2-ba56-9e741f96e69e, 01a0dff8-0d0d-7630-ba83-33721ecf3fcc, 01a0dff2-ff56-7461-9cbd-49877524f919, 01a0deb4-8e34-7d13-a7e5-b9fbba069326, 01a0de38-6973-7dd1-94da-bcbd5d74d08a, 01a0ddfd-1f64-7313-865a-c52549088cdd, 01a0ddac-829c-71c1-a87a-661cb6fa5707, 01a0daeb-ed85-7960-8b2c-e52c4444a668, 01a0d8e7-f46c-7622-a715-01668de8ff1f, 01a0da3f-c71a-7040-bb42-a18cd612d3d3, 01a0d818-f547-7960-97ef-77d530d72acd, 01a0d818-d0cb-7882-9aac-7e2f9d1a0f31, 01a0d48d-eeaa-77c1-8b7c-2bd9c4d69126, 01a0d345-85ae-7010-b975-978d4ba86c9c, 01a0caa3-ee04-7b91-a007-9f9cdbbb7564, 01a0d48b-00a5-7392-9e56-c2554fdda3ef, 01a0d115-c739-7bf0-a7ee-531124f7fb67, 01a0ca94-c2be-7e21-bf36-51b52533a5e8, 01a0c9f6-3614-77c0-b644-fc9f2d26cc55, 01a0c818-1e1b-7a42-9d8f-51c86343599f, 01a0c6e7-85f2-7441-b868-6b28ba0e754a, 01a0c4f5-e7f5-7961-b7e9-f4d23f37f61c, 01a0c43a-7f50-7640-8d03-a4e2e1b80fa1, 01a0c424-0d18-7c61-a69d-41e27b167af5, 01a0c40c-f321-79d1-bc73-58b6d4600878, 01a0c242-07ac-7bd1-8505-1c20710cfc2f, 01a0c1e9-7c16-7b00-a7ae-c8971afed5c3, 01a0c134-2e2f-7f32-87e6-e3e6fcda5302, 01a0c120-28aa-7500-88ce-7a7ee4e07de8, 01a0bf9f-ef9f-7842-8f6c-c6778043ec6e, 01a0bf7d-c4a7-7a71-ab8b-aa5af4d2d134, 01a0ba72-0dac-77c1-a33f-56649e9f1c1f, 01a0bd2a-e424-7b00-a7d9-ed6f0d9cc630, 01a0bc1f-f8e6-77e1-80a6-b4faf39608de, 01a0bc15-1998-7830-a5d5-5d3fb2bb8b11, 01a0bc1c-f8d8-7a10-ab9f-91a89d0be99b, 01a0bbfc-1fca-78f1-948e-96ae770daddb, 01a0bbe3-0f85-7a02-ab89-de11c4e7f6ee, 01a0bbf3-3d60-78c0-8af0-bd49d1c5b5f8
- Files scanned: 1 (262144 bytes, 509ms, host-store reads: 1, capped)

## Upstream filing guardrail

Reports may contain consumer-local paths. Before filing an upstream issue, remove repository names, paths, hostnames, tracker ids, transcripts, secrets, and customer data; describe only the generic failure class and reproducible contract.

