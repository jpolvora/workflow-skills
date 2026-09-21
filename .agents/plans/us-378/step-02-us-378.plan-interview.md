---
step: 2
slug: us-378
workflowId: us-378-20260921T112549Z
status: completed
shared_understanding: confirmed
blocking_open: 0
startedAt: "2026-09-21T11:27:55Z"
endedAt: "2026-09-21T11:39:49.055Z"
acRefs: []
---
# Step 2 — Plan interview (us-378)

Audit of `step-01-us-378.plan.md` sections 0–8 against spec `0110-us-378`, codebase, memory, and stack rules. Visual references: none on the spec. Fable domain: skipped (no IaC/K8s/Docker/DB signals). Design intent: greenfield per spec (no `git log -S/-L` trace required).

## Interview registry

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| G1 | blocking | §2/§3 | Does installer update/uninstall prune unknown `ws-*` skill dirs, forcing cli.js changes for AC3? | Verify first; implement exemption only on failure | closed | project | Update syncs per upstream-known skill dir (`bin/cli.js` sync per skill; prune is within-dir only); manifest/disk scans exclude externalSkills ids (`scanInstalledSkillsOnDisk`, `bin/cli.js:290-292`). With `ws-project-patterns` in externalSkills: never bootstrapped, pruned, or cascade-removed. No cli.js change; test only. |
| G2 | blocking | §2/§5 | Do harness checks flag a present-but-unpackaged `ws-project-patterns/` dir? | Rely on externalSkills membership scoping; keep verification fixture | closed | project | `check_duplicates.cjs` excludes graph externalSkills ids from package roots (`:69-86`); remaining membership-scoped checks read the same graph. Fixture test proves exit 0 with the dir present and absent. |
| G3 | blocking | §2/§4-AC4 | `dropExternalCompanionMembers` drops ALL externalSkills rows from autoload on every configure run — conflicts with AC3 exemption + AC4 row persistence. | Carve-out: entries flagged `generatorManaged` are kept when their tree exists on disk; generator appends the row at seed/first-run only, never on later runs; off = delete row; opt-out phrase works regardless | closed | model-inferred | `configure_autoload.cjs:233-237` unconditional drop; `:210-229` graph loader. Presence-gated carve-out keeps zero behavior change for ws-memo/ws-session-tracking and is smaller than a parallel marker scheme. |
| G4 | non-blocking | §3 step 8 | Bump scope for the new SKILL frontmatter stamp. | Bump last via `build-site:bump`; stamp follows; doc-sync tests prove agreement | closed | assumed-default | Standard upstream release flow; reversible before commit. |
| G5 | non-blocking | §5 | Are SKILL.md text-presence assertions acceptable tests for AC6/AC7/AC12 protocol rules? | Yes with tightened regexes per rule | closed | project | `test/test-ws-megabrain.js` precedent asserts SKILL.md includes (name, banner, consumes, modes). |
| G7 | non-blocking | §3 step 2 | Seed script flag surface. | Minimal `--repo-root` plus `--dry-run`; add `--json` only if tests need machine output | closed | assumed-default | Single-responsibility seed; reversible. |
| G8 | non-blocking | §2 #9 | Do utility skills need root AGENTS.md / .ws/AGENTS.md rows? | Default docs = CATALOG/README/FEATURES/docs; add hub rows only if enumeration found at implement | closed | assumed-default | ws-megabrain precedent: root AGENTS.md rows are opt-out/precedence only; `.ws/AGENTS.md` has none. |
| G10 | non-blocking | §2 | Does `install-skills.sh` need the same exemption? | No change | closed | project | Thin shim exec'ing `bin/cli.js`; no separate copy logic. |

## Refinement outcome

- 2a audit: 8 findings registered (3 blocking, 5 non-blocking).
- 2b resolve: project-context sweep closed G1, G2, G5, G10 with evidence; G4, G7, G8 closed as assumed-defaults.
- 2c escalate: End refinement and advance (autoMode; no needs_user emitted; G3 resolved model-inferred with rationale).
- 2e shared understanding: auto-confirmed (2c exit). `shared_understanding: confirmed`.

Refined plan: `step-02-us-378.plan.refined.md`.
