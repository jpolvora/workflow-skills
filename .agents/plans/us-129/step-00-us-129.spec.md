---
id: 129
slug: us-129
title: "Sync shared/skill-dependencies.json with bin: register ws-multi-spec for consumer update"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/129"
specDate: 2026-07-25
---

# Specification — Sync shared/skill-dependencies.json with bin: register ws-multi-spec for consumer update

**State:** open

## Description

## Summary

Consumer harness audit on [jpolvora/cursor-server](https://github.com/jpolvora/cursor-server) (`/check-harness`, 2026-07-25) found that **`ws-multi-spec` is missing from the shipped hub copy** of the install graph. Local consumer patches get overwritten on `npx github:jpolvora/workflow-skills update`.

## Evidence (upstream `main` @ packageVersion `0.0.84`)

| File | `ws-multi-spec` in `packages.workflows.skills` | `dependencies["ws-multi-spec"]` |
|------|-----------------------------------------------|----------------------------------|
| `bin/skill-dependencies.json` | present | `["spec-to-pr","spec-to-pr-lite","caveman","gabarito","karpathy-guidelines"]` |
| `.agents/skills/shared/skill-dependencies.json` | **missing** | **missing** |

Skill folder `.agents/skills/ws-multi-spec/` and hub task-router row (“Batch spec delivery”) already exist. Disk inventory and root/packaged `AGENTS.md` routing are fine; **install graph drift** is the update hazard.

Related consumer noise (not present on upstream disk, but shows up after partial local installs):

- `installed-skills.json` listed phantom `ws-long-runner` (no skill folder). No upstream `ws-long-runner` path found — ensure rename/docs never reintroduce that id.

## Why this matters

`update` overwrites managed hub files under `.agents/skills/shared/` (except consumer-owned data). Consumers who only patch `shared/skill-dependencies.json` lose `ws-multi-spec` registration on the next update, so selective install / dependency closure / uninstall cascade stay wrong.

## Proposed fix

1. Align `.agents/skills/shared/skill-dependencies.json` with `bin/skill-dependencies.json` for `ws-multi-spec`:
   - Add to `packages.workflows.skills` (near other orchestrators).
   - Add `dependencies["ws-multi-spec"]` matching bin (at least `spec-to-pr`, `spec-to-pr-lite`; include Layer-0 autoload deps if that is the bin contract).
2. Confirm installer/`update` copies the synced shared file (or generates shared from `bin/` so drift cannot recur).
3. Run integrity regenerate / verify (`npm run generate-integrity` + `verify-integrity`) if digests cover these files.
4. Optional: add a CI or `check-harness`/`check-workflows` assertion that `bin` ↔ `shared` skill-dependencies stay in sync for package skill ids.

## Acceptance

- [ ] Fresh `install --full` / `update` leaves `ws-multi-spec` in consumer `shared/skill-dependencies.json` workflows + dependencies.
- [ ] `bin/skill-dependencies.json` and `shared/skill-dependencies.json` agree on `ws-multi-spec` (and no `ws-long-runner`).
- [ ] Integrity check green if applicable.

## Context

Found via `/check-harness` on cursor-server; consumer applied a temporary local fix. Lasting fix belongs here so consumers do not re-patch after every update.

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
