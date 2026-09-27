# Workflow monitor report

Generated: 2026-09-27T06:33:24.092Z
Workflows: 1 (0 active)
Session id: 01a0e105-b528-7ed2-ba56-9e741f96e69e

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

### reduce-spec-to-pr-tokens-20260927T043013Z

- Status: completed
- Pipeline: standard
- Current step: 9
- Verification score: 10 / 9
- Baton: free (step 9, lease none)
- Mapped runner: single-host
- State: `.agents/plans/reduce-spec-to-pr-tokens/reduce-spec-to-pr-tokens-20260927T043013Z.state.json`
- Telemetry events: 19
- State transcripts: available (1 paths)
- Transcript: available via muse (user)
- Turn pause: none
- Stopwatch: not active

Expected artifacts:
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-00-reduce-spec-to-pr-tokens.spec.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-01-reduce-spec-to-pr-tokens.plan.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-02-reduce-spec-to-pr-tokens.plan-interview.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-02-reduce-spec-to-pr-tokens.plan.refined.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-03-reduce-spec-to-pr-tokens.plan.exec.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-05-reduce-spec-to-pr-tokens.plan.report.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-06-reduce-spec-to-pr-tokens.review.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-07-reduce-spec-to-pr-tokens.testing.report.md`
- [x] `.agents/plans/reduce-spec-to-pr-tokens/step-08-reduce-spec-to-pr-tokens.result.md`

## Transcript scan

- Roots: 01a0e105-b528-7ed2-ba56-9e741f96e69e, workspaceStorage, logs, logs, logs, logs, logs, logs, logs, logs, logs, logs, 01a0dff8-0d0d-7630-ba83-33721ecf3fcc, 01a0dff2-ff56-7461-9cbd-49877524f919, 01a0deb4-8e34-7d13-a7e5-b9fbba069326, 01a0de38-6973-7dd1-94da-bcbd5d74d08a, 01a0ddfd-1f64-7313-865a-c52549088cdd, 01a0ddac-829c-71c1-a87a-661cb6fa5707, 01a0daeb-ed85-7960-8b2c-e52c4444a668, 01a0d8e7-f46c-7622-a715-01668de8ff1f, 01a0da3f-c71a-7040-bb42-a18cd612d3d3, 01a0d818-f547-7960-97ef-77d530d72acd, 01a0d818-d0cb-7882-9aac-7e2f9d1a0f31, 01a0d48d-eeaa-77c1-8b7c-2bd9c4d69126, 01a0d345-85ae-7010-b975-978d4ba86c9c, 01a0caa3-ee04-7b91-a007-9f9cdbbb7564, 01a0d48b-00a5-7392-9e56-c2554fdda3ef, 01a0d115-c739-7bf0-a7ee-531124f7fb67, 01a0ca94-c2be-7e21-bf36-51b52533a5e8, 01a0c9f6-3614-77c0-b644-fc9f2d26cc55, 01a0c818-1e1b-7a42-9d8f-51c86343599f, 01a0c6e7-85f2-7441-b868-6b28ba0e754a, 01a0c4f5-e7f5-7961-b7e9-f4d23f37f61c, 01a0c43a-7f50-7640-8d03-a4e2e1b80fa1, 01a0c424-0d18-7c61-a69d-41e27b167af5, 01a0c40c-f321-79d1-bc73-58b6d4600878, 01a0c242-07ac-7bd1-8505-1c20710cfc2f, 01a0c1e9-7c16-7b00-a7ae-c8971afed5c3, 01a0c134-2e2f-7f32-87e6-e3e6fcda5302, 01a0c120-28aa-7500-88ce-7a7ee4e07de8, 01a0bf9f-ef9f-7842-8f6c-c6778043ec6e, 01a0bf7d-c4a7-7a71-ab8b-aa5af4d2d134, 01a0ba72-0dac-77c1-a33f-56649e9f1c1f, 01a0bd2a-e424-7b00-a7d9-ed6f0d9cc630, 01a0bc1f-f8e6-77e1-80a6-b4faf39608de, 01a0bc15-1998-7830-a5d5-5d3fb2bb8b11, 01a0bc1c-f8d8-7a10-ab9f-91a89d0be99b, 01a0bbfc-1fca-78f1-948e-96ae770daddb, 01a0bbe3-0f85-7a02-ab89-de11c4e7f6ee, 01a0bbf3-3d60-78c0-8af0-bd49d1c5b5f8, 01a0bbe3-3699-7401-87bd-ffc37b0a3302, 01a0bb7d-f316-78b2-ad20-9d3d0633913f, 01a0bbab-d19f-7d32-ad0c-dac00c6fff5b, 01a0bb78-6640-7f30-afc2-9b79f01a37fa, 01a0bb5c-17a4-7830-aaee-6770eb8c57dc, 01a0bb5b-9dea-73a3-b824-35e528bc4158, 01a0bb03-b77f-7591-a7bd-c1f6d93f9288, 01a0badb-253f-72b0-b938-4b0bd6b0dd4f, 01a0bad3-07bf-74d0-af59-62cef2d5e14c, 01a0b8d1-c3cd-7692-89ee-5c992e59ab26, 01a0b7f0-d640-7613-8fc9-203c5b928248
- Files scanned: 0 (0 bytes, 2480ms, host-store reads: 0, capped)

## Upstream filing guardrail

Reports may contain consumer-local paths. Before filing an upstream issue, remove repository names, paths, hostnames, tracker ids, transcripts, secrets, and customer data; describe only the generic failure class and reproducible contract.

