# Appendix B — Cheat Sheet, Glossary, and FAQ (Reference)

Keep this open while you work. Every command below is copy-paste ready; replace `{slug}` and `{specsDir}`/`{plansDir}` with your values. Skill invocation syntax varies by host (`/ws-…`, "Run ws-…"); the skill ids are identical everywhere.

## B.1 Cheat sheet

### Install, update, verify

```bash
npx --yes github:jpolvora/workflow-skills                              # interactive install (NEVER add @latest/@main)
npx --yes github:jpolvora/workflow-skills install --full --yes         # full, project scope
npx --yes github:jpolvora/workflow-skills install --package workflows --global --yes
npx --yes github:jpolvora/workflow-skills update                       # refresh tracked skills
npx --yes github:jpolvora/workflow-skills update --include-new         # + brand-new upstream skills
npx --yes github:jpolvora/workflow-skills uninstall --skills ws-goal-fix-pr --yes
npx --yes github:jpolvora/workflow-skills --version . integrity . --check
```

### Daily driving

```text
/ws-configure-project                    fill .ws/config.json (wizard) . npm run config:gui (Windows GUI)
Write a spec for: <one testable sentence with a failure you fear>
Run ws-spec-to-pr for spec <slug>        standard Steps 0–9 . add preset=<name> for a per-run model bundle
Run ws-spec-to-pr-lite for spec <slug>   fast Steps 0–5
ws-spec-multi                            batch queue (auto lite/standard per spec)
ws-monitor --watch --until-terminal      observe a live run (read-only)
npm run kanvas                           six-column spec board in the browser
ws-goal-fix-pr                           converge PR threads to zero, then merge
ws-doctor . ws-version . ws-check-harness   diagnose . snapshot . audit
```

### Spec and state helpers

```bash
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "<spec>"
node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug <slug>
node .agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs --input "<spec>"
node {skillsRoot}/ws-spec-index/scripts/track_index.cjs --specs-dir {specsDir} --slug <slug>
node {skillsRoot}/ws-spec-index/scripts/sync_index.cjs --specs-dir {specsDir} --slug <slug> --pr-url <url>
node {skillsRoot}/ws-spec-index/scripts/verify_close_filing.cjs --specs-dir {specsDir} --slug <slug>
node .agents/skills/ws-self-learning/scripts/self_learning.cjs --match-paths <files> . then --compile
node .agents/skills/ws-changelog/scripts/append_changelog.cjs --prompt "…" --done "…" --result "…"
```

### The four config dials (`.ws/config.json` → `defaults`)

| Key | Default | Meaning |
|---|---|---|
| `minVerifyScore` | 9 (range 1–10) | Step 5 advance bar; below → `scoreAndRefine` (max 3, then Pause) |
| `branchStrategy` | `stay` | `stay` / `from-current` / `from-base` / `prompt` |
| `enableDag` | `false` | `true` = task DAG with at most 3 parallel workers |
| `autoMode` | off | Unattended chaining; enable only after supervised runs pass |

Caps to memorize: uncovered negative scenario → score ≤ 8. Critical invariant violation → below the bar. Mutation default threshold 80 (or sabotage when unset). Review and fresh-verify loops: max 3 rounds, then Pause.

## B.2 Glossary (spoken definitions)

| Term | Say it like this |
|---|---|
| Spec (`*.spec.md`) | The contract of record. Testable criteria first; code is derived from it. |
| Slug | The spec's short file id, without the `NNNN-` prefix (`csv-export`). |
| AC / acceptance criterion | One Given/When/Then line a test can pass or fail. |
| AC ledger (`ac-ledger.json`) | One row per AC; the verify score is computed from its evidence. |
| Verify score | Derived 0–10 compliance number. Agents cannot author or override it. |
| User gate | The agent stops and asks you to choose. Cancel means stop; yes is never inferred. |
| Fail closed | Missing requirement → halt with a named reason instead of guessing. |
| Pause | A deliberate gate halt with a residual list. Not a crash; a decision request. |
| Handoff | The compact per-step summary stored in state for the next step or session. |
| Telemetry (`telemetry.jsonl`) | The append-only event stream of one workflow's runs. |
| Prior-work sweep | Pre-flight search of history/plans/code so shipped work is never rebuilt. |
| ScoreAndRefine | Below-bar loop: re-implement flagged tasks, then re-verify (max 3). |
| Fresh verify (Step 6b) | Clean-context re-derivation of every AC verdict plus one fault per AC. |
| Sabotage | Deliberately broken assertions proving the suite can turn red. |
| Fix-PR gate | Round plan (`fixPrPlan`, reviewer model) that must complete before edits (`fixPrExec`). |
| Convergence | `activeThreads == 0` with green required checks; the fix-PR exit condition. |
| Baton | Distributed-run turn token in state: holder, step, lease, revision. |
| Trap | A memory entry in DO NOT / INSTEAD DO form with a path pattern. |
| Sync Baseline | Wiki watermark commit bounding the next sync to the delta. |
| Hub (`.ws/`) | Consumer-owned config root. Managed `runtime/`+`templates/` live in the skills install. |

## B.3 FAQ (spoken answers, 20 seconds each)

**Which pipeline should I start with?** Lite for small, reversible, well-tested changes; standard the first time an area, pattern, or risk class is new. The classifier proposes; your blast-radius judgment disposes.

**Can I use this without GitHub or Azure?** Yes. `active: local` with `scm: github` is the recommended solo setup: local spec files, real pull requests. Fully local work still gets specs, plans, review, and state.

**Does the agent ever grade its own work?** No single agent does. The verify score is script-derived from ledger evidence, review diffs committed code, and fresh verify uses a clean worker with fault injection.

**What survives `update` and `uninstall`?** Everything that is yours: `.ws/config.json`, `STACK.md`, memory, changelog, and the installed-skills manifest. Managed skill files are overwritten by design; lasting skill changes go upstream by PR.

**My verify score stuck at 8. Now what?** Read the deficiency list, then test the uncovered negative scenario. Eight is the designed cap for exactly that gap; argument does not lift it, evidence does.

**The run Paused. Is it broken?** No. A Pause is a gate returning a decision to a human with the residual list attached. Resolve the list, then resume from state.

**Global or project install?** Project for team reproducibility; global for personal machines and hybrid work. Project-local skills and project config win when both exist.

**How do I switch models mid-run?** Pause, switch the model in your host, Resume. Presets and per-step models cover subagents; the session model is yours to change deliberately.

## B.4 Source map (where every claim in this course lives)

| Course claim | Source of truth in the repo |
|---|---|
| Install/update/uninstall behavior | `README.md` + `bin/cli.js --help` |
| Pipeline steps, gates, artifacts | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `ws-shared/runtime/gates.md`, `docs/flow.md` |
| Full feature inventory | `FEATURES.md` (package 0.5.48) |
| Skill inventory + task router | `CATALOG.md`, `bin/skill-dependencies.json` |
| Living behavior summaries | `.agents/specs/wiki/**` (domains: harness, delivery, providers, specs, quality, memory, engineering, documentation) |
| Config keys and defaults | `.agents/skills/ws-shared/templates/config.json.example`, `runtime/config.schema.json` |
