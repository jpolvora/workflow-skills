---
slug: us-150
title: "Add optional ws-senior-developer engineering delivery gate"
status: "plan refined ok"
workflowType: standard
shared_understanding: confirmed
---

## 0. Refined Summary & Business Rules

Ship one optional, model-invoked `ws-senior-developer` skill in the Workflows package. Package membership makes the maintained implementation available; activation remains opt-in through explicit invocation or a non-empty `rules.seniorDeveloper` path. It is not an autoload skill, an orchestrator dependency, or an installer-created consumer-root file.

The new `SKILL.md` is the sole detailed Code review proof checklist. Existing hubs retain only resolution and pointer language. The skill must remain portable, en-us, policy-neutral, and concise. No script, dependency edge, installer branch, or domain adapter is earned.

## 1. Decisions and AC Coverage

| Decision | Evidence and implementation consequence |
|---|---|
| Use model invocation | `ws-write-a-skill` permits it when agents must reach the skill. Omit `disable-model-invocation`; use a trigger-specific `description` and explain scope in the body. |
| Put it in Workflows | The Workflows manifest already guarantees the shared hub through `shouldEnsureHub`; adding one top-level id to both mirrored manifests is sufficient. |
| Keep activation optional | `config.json.example` already has `rules.seniorDeveloper: ""`; document `.agents/skills/ws-senior-developer/SKILL.md` as the opt-in value without changing the default. |
| Keep graph edge-free | The skill guides rather than dispatches deterministic work. Do not add it to `autoloadOnly` or any `dependencies` list. |
| Use one proof checklist | Current root, packaged, and shared hubs say to load the resolved rule and do not duplicate a checklist. Preserve that pattern. |
| Keep site accurately scoped | The site derives cards from root `AGENTS.md` layer tables and SKILL frontmatter. Register the skill in root Layer 1 and make the frontmatter description state both engineering-delivery triggers and optional activation. |

| ACs | Refined coverage |
|---|---|
| AC1–AC5, AC8 | New concise `SKILL.md`: context and policy reads, triviality branch, plan-first multi-file free-text gate, named-workflow and explicit-implementation routing, implementation constraints, pre-ship proof, and checkable Done-when outcomes. |
| AC2 | Apply `ws-write-a-skill` steps and consulted MEMORY before drafting. No scripts are needed; if scope changes, use Node `.cjs`, explicit launchers, and LF shell files only. |
| AC6 | Keep the existing config-path-first resolution semantics. Document the shipped path as a value of `rules.seniorDeveloper`, not as an unconditional fallback that would defeat consumer overrides. |
| AC7, AC9 | Add the id to `packages.workflows.skills` in both manifests; add targeted source-manifest and Workflows-install assertions. No CLI or installer logic change. |
| AC10–AC12 | Regenerate site/version once, sync the test tarball version, regenerate integrity after all generated output, and run configured tests plus workflow and harness checks. |
| AC13 | Add four dedicated generator scenarios before generation. Inspect the generated file and the diff because the generator rewrites every discovered skill eval file. |

## 2. Technical Design

### New skill

Create only:

```text
.agents/skills/ws-senior-developer/
├── SKILL.md
└── evals/evals.json
```

`SKILL.md` should stay within the 100-line preferred budget. Its inline, every-path contract must:

1. Classify named workflow commands and explicit implementation requests before imposing a competing gate.
2. Exempt trivial or single-file work from plan ceremony.
3. For non-trivial work, read configured project context, consumer root policy when present, architecture constraints, relevant `rules.*`, and `{sharedDir}/MEMORY.md`.
4. Require a confirmed plan for multi-file or multi-modification free-text work; route applicable work to installed workflow, specification, and spec-sync capabilities.
5. Before a branch or PR handoff, require focused review, non-empty configured build/test/format commands, configured secrets checking, relevant docs/spec-index assessment, and an evidence-or-blocker report.
6. State that consumer root `AGENTS.md` owns policy and managed consumer skills are not rewritten.

The detailed Code review proof checklist belongs in the pre-ship phase of this skill only. Hubs and setup documents must continue to point to the resolved skill rather than repeat it.

### Packaging, configuration, and documentation

- Add `ws-senior-developer` to `packages.workflows.skills` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`.
- Do not add it to `dependencies` or `autoloadOnly`. `bin/cli.js` already discovers top-level skills, resolves package members, and ensures the hub for every Workflows member.
- Extend `config.json.example` and `ws-shared/setup.md` with the shipped opt-in path while keeping the configured path first in resolution precedence.
- Add concise routes to root `AGENTS.md` Layer 1 and task router, packaged `.agents/AGENTS.md` Workflows index/task router, and `ws-shared/AGENTS.md` promoted utilities/task router. Preserve the packaged index's Workflows-only scope.
- Update README with human-facing availability and opt-in instructions. State that an optional consumer-root pointer is consumer-owned and never installer-created.
- Do not edit local `config.json`, local `STACK.md`, or any consumer-owned artifact.

### Evals and tests

Add a `ws-senior-developer` entry to `bin/generate-skill-evals.js` before running it. The four scenarios must cover:

1. multi-file free-text work, context reads, and confirmed plan;
2. trivial single-file work without excess ceremony;
3. explicit implementation and named workflow commands without conflicting gates;
4. branch/PR handoff, review, configured verification, secrets, docs/spec-index, and evidence/blockers.

Each scenario needs at least three assertions. Run `node bin/generate-skill-evals.js`, then confirm unrelated generated eval payloads did not change unexpectedly.

In `test/test-install.js`, add explicit checks that both dependency manifests contain the new Workflows member and that a Workflows package install contains `ws-senior-developer/SKILL.md` and `evals/evals.json`. Existing dynamic integrity coverage already enumerates all top-level skills; retain it. The existing `security-review` absence assertion is unrelated and must not be repurposed.

## 3. Ordered Implementation Plan

1. **Authoring preflight**
   - Re-read MEMORY entries for skill authoring, path tokens, managed ownership, integrity, and release synchronization.
   - Apply `ws-write-a-skill`: model invocation is justified, scripts are unearned, and every phase gets a Done-when criterion.
   - Verify: scope stays at `SKILL.md` plus generated evals.

2. **Write the gate**
   - Add `.agents/skills/ws-senior-developer/SKILL.md` with portable path tokens and tool aliases, no hardcoded project commands or host-specific terms.
   - Keep its model description trigger-specific and explicitly optional by invocation/configuration.
   - Verify: frontmatter name matches folder, no `disable-model-invocation`, version is synchronized by later bump, and the body meets AC3–AC5/AC8.

3. **Connect resolution and routing**
   - Update config example, shared setup, three hubs, and README as described in section 2.
   - Verify: empty default remains empty; a configured packaged path resolves through the existing first resolution branch; no hub duplicates the detailed checklist; no docs claim the installer creates root `AGENTS.md`.

4. **Register package membership and evals**
   - Add the id to both Workflows arrays, then add dedicated eval source data and generate eval files.
   - Verify: manifests remain byte-equivalent apart from their expected shared location; no graph or autoload edge is added; generated diff is limited to intended eval content.

5. **Extend installation evidence**
   - Add targeted Phase 0b manifest assertions and Phase 6 Workflows installed-tree assertions.
   - Verify: package installation proves the skill, evals, and shared hub; direct/selective installation remains free to omit the skill unless selected by package membership.

6. **Release and generated artifacts**
   - Run `npm run build-site:bump` exactly once after source/docs changes. It updates package version, every skill frontmatter version, both manifest package versions, the root-AGENTS-derived site catalog, and footer.
   - Set `test/package.json` to `file:../workflow-skills-<new-version>.tgz`.
   - Run `npm run generate-integrity` only after all source and generated changes settle.
   - Verify: version values, site card, footer, and tarball reference agree.

7. **Delivery verification**
   - Run `npm run verify-integrity`, configured `npm run tests -- --local`, `node bin/build-site.js`, `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`, and ws-check-harness Phases 0–5c.
   - Search changed human and hub docs for conflict markers.
   - Verify: no critical integrity, packaging, routing, portability, or dependency findings.

## 4. Permissions, Tenancy, and i18n

No API, RBAC, tenancy, database, UI, or locale changes. Keep language en-us. The installer remains constrained to `.agents/skills/`; consumer root policy and consumer-owned shared data remain untouched.

## Implementation-Discovered Delta

Final verification reproduced a package-tree test failure: the `ws-sync-spec` generator payload requires its generated `.agents/skills/ws-sync-spec/evals/evals.json` artifact to be present. The artifact is therefore in scope as package parity, not as independent `ws-sync-spec` feature work.

- **Minimal fix:** retain only the existing `ws-sync-spec` generator payload and its generated eval artifact; do not change `ws-sync-spec` source documentation, behavior, dependencies, `index.PRD`, versions, integrity, or tests.
- **Verification:** the payload at `bin/generate-skill-evals.js:309-334` and generated artifact both contain the same two scenarios; final `npm run tests -- --local` passed with the package tree intact.

## 5. Verification Matrix

| Check | ACs | Observable evidence |
|---|---|---|
| SKILL review against `ws-write-a-skill` | AC1–AC5, AC8 | Trigger-specific frontmatter, portable concise phases, Done-when criteria, no unearned scripts, policy boundary. |
| Dedicated evals | AC3–AC5, AC13 | Four scenario payloads with at least three assertions each. |
| Resolution and checklist search | AC6, AC8, AC11 | Configured path documented; hubs point only; no duplicated checklist. |
| Manifest plus Workflows install checks | AC7, AC9 | Both manifests and installed tree include skill/evals; shared hub present. |
| Version/site/tarball comparison | AC1, AC11, AC12 | Single bump synchronizes package, frontmatter, manifests, footer, catalog, and test tarball dependency. |
| Integrity, package tests, workflow checker, harness | AC9–AC12 | All commands pass with no critical findings. |

## 6. Invariants

- No consumer-root file write, host coupling, legacy alias, installer branch, script, autoload, or unconditional dependency.
- Use `{skillsRoot}`, `{sharedDir}`, `{plansDir}`, and configured command aliases in skill prose; use real relative paths in Markdown links.
- Do not copy consumer policy into the skill or alter consumer-owned shared files.
- Bump once only; regenerate integrity after the final generated-file change.

## 7. Pre-PR Checklist

- [ ] `ws-write-a-skill` preflight and MEMORY evidence recorded.
- [ ] Skill is model-invoked, concise, portable, en-us, and contains the only detailed Code review proof checklist.
- [ ] Empty default and explicit packaged opt-in path are documented without changing fallback precedence.
- [ ] Both manifests, all hub routes, README, and site catalog agree.
- [ ] Dedicated evals and Workflows-install assertions cover the new member.
- [ ] One release bump, synced tarball reference, regenerated integrity, and clean generated output.
- [ ] Package tests, workflow check, harness check, and conflict-marker search pass.

## 8. Open Questions

None blocking. The source tree confirms the minimal Workflows-package integration: adding the skill id to both mirrored manifests causes existing CLI discovery and hub installation, without an installer change.

## Interview Registry

| ID | Class | Section | Gap | Resolution | Status | DependsOn |
|---|---|---|---|---|---|---|
| IR-01 | non-blocking | 0, 2 | “Optional installable” could imply Extra membership. | The shared hub is needed for configured proof resolution, and existing Workflows membership already ensures it. Keep Workflows membership but make activation opt-in. | resolved | — |
| IR-02 | non-blocking | 2, 3 | Plan implied modified resolution precedence for the shipped skill. | Existing config-path-first resolution already loads the shipped skill when configured. Document its path; do not insert an unconditional shipped fallback. | resolved | IR-01 |
| IR-03 | non-blocking | 3, 5 | Generator rewrites evals for every discovered skill, not only the new one. | Add the explicit payload before generation and inspect the generated diff; only intended eval changes may remain. | resolved | — |
| IR-04 | non-blocking | 3, 5 | Site has no independent activation page. | `build-site.js` derives cards from root Layer tables and SKILL frontmatter. Add the Layer 1 inventory entry and optional activation language to the skill description; README/setup carry full activation instructions. | resolved | — |
| IR-05 | non-blocking | 5 | Dynamic integrity coverage exists, but it does not make package intent explicit. | Add narrow manifest and Workflows installed-tree assertions; preserve dynamic integrity enumeration. | resolved | IR-01 |
| IR-06 | non-blocking | 5, 7 | Plan listed two similar test commands ambiguously. | Use configured `npm run tests -- --local`; `npm run test` only aliases it and adds no separate coverage. | resolved | — |

## Step Output

```yaml
step: 2
label: Plan Refinement
status: success
filesTouched:
  - .agents/plans/us-150/step-02-us-150.plan.refined.md
refine:
  registry:
    - {id: IR-01, class: non-blocking, section: "0, 2", status: resolved, resolution: "Workflows package; explicit opt-in activation"}
    - {id: IR-02, class: non-blocking, section: "2, 3", status: resolved, resolution: "Preserve config-path-first resolution"}
    - {id: IR-03, class: non-blocking, section: "3, 5", status: resolved, resolution: "Inspect all-evals generator diff"}
    - {id: IR-04, class: non-blocking, section: "3, 5", status: resolved, resolution: "Root Layer 1 plus frontmatter drives site card"}
    - {id: IR-05, class: non-blocking, section: "5", status: resolved, resolution: "Add targeted manifest and Workflows-install assertions"}
    - {id: IR-06, class: non-blocking, section: "5, 7", status: resolved, resolution: "Use configured local package test command"}
  round: 0
  blocking_open: 0
  shared_understanding: confirmed
evidence:
  - "Read state, Step 0 specification, Step 1 plan, config, MEMORY, tools, and full ws-interview contract."
  - "Confirmed both dependency manifests contain mirrored Workflows arrays and no autoload entries."
  - "Confirmed CLI discovers top-level skills, uses Workflows membership to ensure the shared hub, and never writes consumer-root files."
  - "Confirmed site cards derive from root AGENTS layer tables plus SKILL frontmatter, and the eval generator rewrites all discovered skill eval files."
  - "Confirmed test suite already dynamically validates integrity coverage; refined plan adds narrow package-intent assertions."
learning: "Use a configured rules.seniorDeveloper path for the shipped opt-in skill; do not add an unconditional fallback or duplicate its canonical checklist."
telemetry:
  filesTouched: 1
  planSectionsAudited: 9
  acceptanceCriteriaAudited: 13
  registryFindings: 6
  blockingFindings: 0
  dependencyManifestCopiesAudited: 2
  generatorScope: "all discovered top-level skills"
  measuredAtEpochSec: 1785098779
  elapsedSec: 34
```
