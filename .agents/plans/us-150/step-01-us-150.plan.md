---
slug: us-150
title: "Add optional ws-senior-developer engineering delivery gate"
status: "plan to be refined"
workflowType: standard
---

## 0. Summary & Business Rules

Add the smallest portable, model-invoked `ws-senior-developer` skill. It supplies an upstream-owned engineering-delivery gate and the single canonical **Code review proof** checklist for consumers that opt in through `rules.seniorDeveloper`.

The skill must remain a concise `SKILL.md` with no scripts or extra references unless implementation proves they are needed. It must:

- inspect configured project context, consumer policy, architecture constraints, and relevant `{sharedDir}/MEMORY.md` before non-trivial work;
- require a confirmed plan for multi-file or multi-modification free-text work, while honoring named workflow commands and explicit implementation requests;
- exempt trivial or single-file changes from plan ceremony;
- require focused review, configured verification, secrets review, relevant docs/spec-index updates, and evidence/blockers before branch or PR delivery;
- never copy consumer-owned root `AGENTS.md` policy into the skill, invent consumer rules, or create host-specific behavior.

`ws-senior-developer` is optional in behavior, not an always-on skill. It will ship in the Workflows package so it is available alongside the shared config/hub, but it is activated only when a consumer sets `rules.seniorDeveloper` to its installed path or explicitly invokes it. It must not be added to `autoloadOnly`, an orchestrator's required dependencies, or a default consumer root file.

## 1. Definition of Ready & Scope

### Confirmed decisions

| Decision | Rationale |
|---|---|
| Model-invoked | Agents need to discover the guardrail for engineering-delivery requests; `ws-write-a-skill` reserves model invocation for agent-reachable skills. The description will front-load distinct engineering-delivery triggers. |
| Workflows package membership | The skill depends on the shared config and is the canonical proof source for workflow delivery, so `install --package workflows` must make it available. Its empty config value keeps it inactive by default. |
| Explicit config activation | `rules.seniorDeveloper` remains `""` in fresh config. Documentation will show `.agents/skills/ws-senior-developer/SKILL.md` as the opt-in value. This preserves optionality and avoids automatic context loading. |
| No runtime scripts or dependency edges | The requested behavior is instruction and evidence orchestration, not deterministic computation. Do not add a script, `autoloadOnly` entry, or pipeline dependency edge. |
| Canonical checklist location | Only the new skill owns the detailed Code review proof checklist. Hubs, setup docs, and consumer rules point to it rather than reproducing it. |
| Consumer root pointer | Document a thin root `AGENTS.md` as optional discovery help only. The installer continues to write only `.agents/skills/`, never a consumer root policy file. |

### Acceptance-criteria coverage

| AC | Planned implementation and observable check |
|---|---|
| AC1 | Add `ws-senior-developer/SKILL.md` with `name`, version, model-invoked trigger description, portable scope, steps, and Done-when criteria. Inspect its frontmatter/body and run harness portability/routing checks. |
| AC2 | Follow the recorded MEMORY preflight; create no scripts. If scope changes and scripts are earned, use Node `.cjs`, explicit `node` launcher, and LF-only shell glue. Review plan and resulting skill against `ws-write-a-skill` checklist. |
| AC3 | Add an inline pre-implementation decision gate: configured context/rules/architecture/MEMORY reads; free-text multi-file/multi-modification plan confirmation; route named installed workflow, spec, and spec-sync requests. Validate through multi-file eval. |
| AC4 | Add explicit trivial/single-file and named-command/explicit-implementation branches. Validate through trivial and direct-command evals. |
| AC5 | Add a pre-ship gate that requires focused review, non-empty configured build/test/format commands, configured secrets checks, applicable docs/spec-index updates, and evidence/blocker reporting. Validate through ship-handoff eval and delivery-skill review. |
| AC6 | Update external-dependency resolution wording to recognize the configured shipped path, preserve override precedence, and retain one canonical checklist. Search all `Code review proof` consumers for duplicated checklist content; run harness. |
| AC7 | Put the skill in the Workflows package without autoloading it; document `rules.seniorDeveloper` activation and optional thin root pointer. Verify package install includes it and no installer code writes root `AGENTS.md`. |
| AC8 | State in the new skill that consumer root `AGENTS.md` is the policy source and managed skills are not locally rewritten. Verify installer boundary and harness portability findings. |
| AC9 | Add the skill id to both dependency-graph copies and Workflows package selection. Extend install tests to prove Workflows install/closure contains the skill and selective closure remains accurate. |
| AC10 | Regenerate `bin/skill-integrity.json`, then run integrity verification and harness audit with zero critical findings. |
| AC11 | Synchronize root hub, packaged hub, shared consumer hub, setup/config guidance, README, and generated site catalog. Rebuild site and check links/catalog entries. |
| AC12 | Run one `npm run build-site:bump`, which synchronizes package version, all skill frontmatter, both dependency manifests, and site footer; update `test/package.json` tarball reference; run package/install tests and confirm docs have no conflict markers. |
| AC13 | Add four explicit eval scenarios in `bin/generate-skill-evals.js`, regenerate the new skill's `evals/evals.json`, and inspect assertions for multi-file, trivial, explicit command, and ship handoff behavior. |

### Out of scope

- Adding a host-specific autoload mechanism, root `AGENTS.md`, or pointer file to consumer repositories.
- Changing pipeline step order, forcing every workflow to invoke the new skill, or modifying consumer-managed skill copies.
- Adding scripts, an engineering domain adapter, or consumer-specific rules without evidence that the concise skill cannot express the behavior.
- Changing project-specific verification commands, tenancy, i18n, database, or frontend behavior.

## 2. Technical Design & Architecture

### Skill design

Create `.agents/skills/ws-senior-developer/` with:

1. `SKILL.md`, target at or below the authoring guideline's 100-line budget.
2. `evals/evals.json`, generated from dedicated, non-generic scenarios.

The model-invoked description must mention engineering delivery/implementation, plan-first multi-file work, review, verification, and PR handoff without broad synonym sprawl. Keep mandatory behavior inline: context reads, triviality decision, plan routing, delivery proof, and consumer-policy boundary. Put no details behind a pointer because no uncommon branch currently requires one.

The skill's resolution behavior is configuration-driven:

1. If `rules.seniorDeveloper` is non-empty, resolve that configured path.
2. The documented packaged opt-in path is `.agents/skills/ws-senior-developer/SKILL.md`.
3. Preserve existing local/global `senior-developer` fallback wording for consumers that intentionally provide a different guardrail.
4. If unresolved, do not invent a checklist; report that the configured proof source is unavailable.

This makes the shipped skill opt-in and maintains `AGENTS.md` as policy routing, rather than embedding a second policy source in the new skill.

### Packaging and installer design

`bin/cli.js` discovers top-level skill folders and applies `bin/skill-dependencies.json` package membership transitively. No new installer branch is needed:

- add `ws-senior-developer` to `packages.workflows.skills`;
- mirror the dependency graph in `.agents/skills/shared/skill-dependencies.json`, which is shipped through `HUB_WHITELIST`;
- do not add a `dependencies` entry because no skill dispatches it unconditionally;
- preserve existing `shouldEnsureHub` behavior, now satisfied because Workflows selection includes the skill;
- preserve `ensureSharedHubInstalled` and its prohibition on root-file writes.

### Domain evidence

`config.fable.autoDetectDomain` is enabled, but this is a portable skill-packaging change without IaC, data, research, K8s, Docker, or database signals. No `ws-fable-domain` adapter is required. The binding evidence remains primary repository inputs: config/tools, hubs, dependency manifests, installer tests, generated site, integrity manifest, and package metadata.

## 3. Step-by-Step Plan

1. **Authoring preflight and scope lock**
   - Re-read relevant MEMORY solutions for skill authoring, script launchers, LF, managed skill ownership, integrity, and release-version synchronization.
   - Use `ws-write-a-skill` methodology to confirm model invocation, no scripts, two-file layout, checkable Done-when criteria, and explicit non-autoload behavior.
   - Affected files: new skill folder only, later steps.
   - Check: implementation notes cite the authoring decision; no speculative helper or reference file is created.

2. **Create the portable senior-developer gate**
   - Add `.agents/skills/ws-senior-developer/SKILL.md`.
   - Define ordered phases: classify triviality and explicit/named requests; load consumer context; plan/routing gate; implementation constraints; pre-ship evidence gate; concise completion report.
   - Use `{sharedDir}`, `{skillsRoot}`, `{plansDir}`, `user-gate`, and configured verification aliases, never absolute paths, hardcoded commands, host branding, or copied consumer policy.
   - Include the canonical Code review proof checklist only here. It will specify focused review, configured checks, secrets scan, docs/spec-index assessment, and evidence/blocker output.
   - Check: frontmatter name equals folder; version is package-aligned after release bump; description is model-invoked; every step has Done when; no script or non-LF shell file exists.

3. **Add activation and proof-source integration**
   - Update `config.json.example` comments and `shared/setup.md` to document an empty-by-default `rules.seniorDeveloper` and the opt-in packaged path.
   - Update the external-dependency / Code review proof text in root `AGENTS.md`, `.agents/AGENTS.md`, and `shared/AGENTS.md` so a configured packaged path resolves before local/global fallback, and detailed checklist ownership remains only in the new skill.
   - Update `STACK.md.example` only if its engineering-guardrails row needs the same activation fact; do not change consumer-owned local `STACK.md`.
   - Check: search finds no hub-level duplication of the checklist, and empty optional values remain informational in harness behavior.

4. **Register package and consumer-facing routing**
   - Add `ws-senior-developer` to the Workflows package in `bin/skill-dependencies.json`, then mirror the same graph in `.agents/skills/shared/skill-dependencies.json`.
   - Register it in root `AGENTS.md` under engineering standards or promoted utilities, `.agents/AGENTS.md` under the Workflows package index/task router, and `shared/AGENTS.md` under promoted utilities/task routing as appropriate.
   - Update README's human-facing catalog and optional activation guidance, including the existing optional root-pointer policy. Do not imply the installer creates a root pointer.
   - Check: package membership and both hub inventories agree with the on-disk folder; Full inherits the skill through `all-skills`; no `autoloadOnly` addition or new unconditional graph dependency appears.

5. **Add behavior-focused evals**
   - Add a `ws-senior-developer` entry to `bin/generate-skill-evals.js` with four prompts:
     1. multi-file free-text change requires context reads and confirmed plan;
     2. trivial single-file fix avoids excessive ceremony;
     3. explicit implementation or named workflow command is honored and routed without a conflicting gate;
     4. branch/PR handoff requires review, configured checks, secrets/docs/spec-index assessment, and evidence or blockers.
   - Run the generator to produce `.agents/skills/ws-senior-developer/evals/evals.json`.
   - Check: all scenarios have at least three assertions, include portable path/config behavior where relevant, and contain no product-specific prompt assumptions.

6. **Extend package/install tests**
   - Update `test/test-install.js` Phase 0b to require the new skill and assert it appears in both Workflows manifests.
   - Add targeted assertions around `install --package workflows --yes` or its existing equivalent: the new folder is present, its eval file survives the packed install, the shared hub is installed, and integrity closure/audit succeeds.
   - Retain selective-install coverage that proves optional/unselected skills are not falsely reported as missing; do not treat `ws-senior-developer` as a mandatory transitive dependency of unrelated selected skills.
   - Check: local packed install test exercises source and tarball behavior, not only working-tree copies.

7. **Synchronize generated artifacts and release version**
   - Run `npm run build-site:bump` exactly once after source/documentation changes. It updates `package.json`, all `SKILL.md` frontmatter versions, both dependency graphs' `packageVersion`, and `docs/index.html` footer/catalog.
   - Update `test/package.json` from `file:../workflow-skills-0.0.96.tgz` to the exact new version produced by the bump.
   - Inspect generated `docs/index.html` for the senior-developer card, Workflows membership, activation description, and conflict markers.
   - Check: all package/frontmatter/dependency/test-tarball/site-footer versions match exactly.

8. **Regenerate integrity and verify delivery gates**
   - Run `npm run generate-integrity`, then `npm run verify-integrity`, so new skill, evals, hubs, manifests, docs where applicable, and versioned content are accurately represented in `bin/skill-integrity.json`.
   - Run `npm run tests -- --local` (or `npm run test` if release workflow requires its alias), `node bin/build-site.js`, `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`, and `ws-check-harness` Phases 0-5c.
   - Re-run integrity verification after any generated-file change. Confirm no critical harness findings and no README/site merge markers.
   - Check: all AC evidence is recorded for the downstream implementation/review steps; no commit is made in this planning step.

## 4. Permissions, Tenancy & i18n

No RBAC, tenant data, API, database, or UI/i18n changes are planned.

Portability protections:

- consumer-specific policy stays in consumer root `AGENTS.md` or configured rules;
- the shared hub is the installed consumer contract;
- consumer activation edits only `shared/config.json`, which the installer preserves;
- installer logic must never create or overwrite consumer root `AGENTS.md` or host pointer files;
- English (en-us) is required for the skill, evals, hubs, and generated catalog text.

## 5. Test Coverage

| Test / check | ACs | Expected evidence |
|---|---|---|
| Static frontmatter/body review against `ws-write-a-skill` checklist | AC1, AC2, AC3, AC4, AC5, AC8 | Model-invoked description, concise portable body, checkable Done-when criteria, no unearned scripts, policy boundary. |
| `ws-senior-developer/evals/evals.json` dedicated scenarios | AC3, AC4, AC5, AC13 | Four scenario assertions for multi-file planning, trivial work, explicit/named commands, and PR handoff evidence. |
| Resolution-text search across root/packaged/shared hubs and setup | AC6, AC8, AC11 | Configured packaged path documented; no duplicated detailed checklist; root policy remains consumer-owned. |
| Package-manifest and installed-tree assertions in `test/test-install.js` | AC7, AC9 | Workflows install contains the skill/evals and shared hub; selective closure stays valid. |
| `npm run tests -- --local` | AC7, AC9, AC10, AC12 | Packed install, update, package membership, dependency closure, integrity, and fixture consistency pass. |
| `npm run build-site:bump`, version comparisons, `node bin/build-site.js` | AC1, AC11, AC12 | One version increment; package, skill frontmatter, two manifests, test tarball reference, footer, and catalog agree. |
| `npm run generate-integrity && npm run verify-integrity` | AC9, AC10, AC12 | Manifest includes new skill/evals and verifies current package version/content. |
| `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | AC6, AC9, AC10 | Dependency closure and workflow structure have no critical failure. |
| `ws-check-harness` Phases 0-5c | AC1, AC6, AC7, AC8, AC10, AC11 | No critical routing, link, portability, package, or optional-rule findings. |
| `rg '<<<<<<<|=======|>>>>>>>' docs/index.html README.md AGENTS.md .agents/AGENTS.md` | AC11, AC12 | No documentation conflict markers. |

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8` remains true; this Step 1 artifact is not committed now.
- Skills remain host-neutral, portable, and en-us only.
- Use config and `{skillsRoot}` / `{sharedDir}` / `{plansDir}` tokens in prose; Markdown links use real relative paths.
- Consumer-owned shared data remains preserved. No installer change may write consumer repository-root files.
- Managed consumer skill edits are not a durable customization mechanism; lasting changes belong upstream.
- Package copy rules and integrity enumeration must stay aligned. Regenerate integrity after every installable skill/hub change.
- New managed scripts, if later justified, must be Node `.cjs` with explicit `node` launchers. Shell must be thin and LF-only.
- Version bump happens once per release, after source changes; do not manually desynchronize package, skill frontmatter, dependency manifests, site footer, or test tarball reference.
- Do not add legacy layout aliases or migration shims.

## 7. Pre-PR Checklist

- [ ] `ws-write-a-skill` decisions recorded: model invocation justified, MEMORY applied, no scripts unless earned.
- [ ] New skill is concise, portable, en-us, has complete Done-when criteria, and owns the only detailed Code review proof checklist.
- [ ] `rules.seniorDeveloper` stays empty by default and documents the installed `ws-senior-developer` path as an opt-in.
- [ ] Workflows package membership is mirrored in both dependency manifests; no autoload/unconditional dependency was added.
- [ ] Root `AGENTS.md`, `.agents/AGENTS.md`, shared hub, setup/config docs, README, and site catalog agree.
- [ ] Installer remains limited to `.agents/skills/`; optional consumer root pointer wording is accurate.
- [ ] Four dedicated eval scenarios are generated and installed.
- [ ] `npm run build-site:bump` ran once; `test/package.json` matches the new tarball version.
- [ ] `npm run generate-integrity` and `npm run verify-integrity` pass.
- [ ] `npm run tests -- --local`, workflow checker, and harness audit pass with no critical findings.
- [ ] `docs/index.html` and documentation files contain no merge conflict markers.

## 8. Open Questions

None blocking. The implementation should preserve this plan's Workflows-package decision unless inspection shows the package's shared-hub installation rule has changed; placing the skill in Extra would require a separate, tested hub-seeding mechanism and would not be the smallest safe integration.

## Step Output

```yaml
step: 1
label: Planning and Brainstorm
status: completed
filesTouched:
  - .agents/plans/us-150/step-01-us-150.plan.md
evidence:
  - Read workflow state, specification, config, stack companion, tools, and compiled MEMORY.
  - Read ws-write-plan, ws-write-a-skill, ws-fable-domain, self-learning, code-review, ship-pr, harness, root/packaged/shared hubs, installer, dependency graph, package metadata, tests, eval generator, and release guidance.
  - Confirmed installer discovers top-level skills and Workflows membership ensures the shared hub without consumer root-file writes.
  - Confirmed build-site bump synchronizes package, all skill frontmatter, both dependency manifests, and site footer; test tarball reference remains a separate update.
decisions:
  - Ship ws-senior-developer in Workflows, model-invoked but inactive unless explicitly configured or invoked.
  - Keep SKILL.md plus dedicated evals only; earn no scripts, autoload entry, or unconditional dependency edge.
  - Make the new skill the sole detailed Code review proof checklist; hubs retain resolution pointers only.
telemetry:
  elapsedSec: 760
  estimatedTokens: 20500
  estimated: true
learning: "N/A (planning only; MEMORY preflight applied)"
```
