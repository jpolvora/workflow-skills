# Chapter 03 — Configuration Masterclass: config.json Without Fear

## Video metadata

- **YouTube title:** Configuration Masterclass: config.json Without Fear | Workflow Skills #3
- **Thumbnail text:** CONFIG.JSON
- **Description (first lines):** One file drives the whole harness: stack, verification commands, providers, and the verify bar. Configure it once with the wizard or the desktop GUI, and every pipeline run gets easier.

## Learning objectives

After this video, the viewer can:

1. Explain path tokens and expand `{skillsRoot}`, `{sharedDir}`, `{plansDir}`, and `{specsDir}` by hand.
2. Fill the ten config sections that matter and know which ones to leave alone.
3. Set `defaults.minVerifyScore`, `branchStrategy`, models, and `autoMode` on purpose.
4. Validate a config with the doctor and the configure-project JSON output.

## Before you record

1. Demo repo with Chapter 02 install complete.
2. Open `.ws/config.json`, the schema (`ws-shared/runtime/config.schema.json`), and the template example side by side.
3. On Windows, have `npm run config:gui` ready for the 20-second GUI cameo.

---

## Narration script

[ON SCREEN: `.ws/config.json` in the editor.]

Welcome back. From Spec to Delivery.

Today: the one file that runs the whole show, `.ws/config.json`. Boring title, highest leverage in the course. Spend eleven minutes here, and you will never fight a pipeline run later, because every confusing behavior in later chapters traces back to a key in this file.

First, where config lives and who owns it. [PAUSE] The bootstrap file is always `.ws/config.json`. It is the discovery point. A fresh install seeds it from the managed template, and updates never overwrite it. Track it in git when it holds no secrets. Keep credentials as environment variable names, never as values.

Before any key: path tokens. [ON SCREEN: the `pathTokens` block.] Agents and scripts expand brace tokens before they open files. `{skillsRoot}` is your skills install, default `.agents/skills`. `{sharedDir}` is your hub, default `.ws`, and it is relocatable to any contained, repo-relative folder. `{plansDir}` and `{specsDir}` come from the `plans` section, defaults `.agents/plans` and `.agents/specs`. If you remember one rule: expand the token first, then read the file. Every "file not found" mystery in this system is a token that was guessed instead of expanded.

[PAUSE]

Now the tour. Ten sections, in the order you fill them.

**One, `project`.** Name, org, repo URL, base branch, working branch, remote. This is identity. Get the base branch right; reviews and ship diffs measure against it.

**Two, `stack`.** Your backend, frontend, database, and the commands that run your app. Layers with paths and roles, test project, ports, i18n. The skills use this to plan verification instead of guessing your layout.

**Three, `providers`.** Two keys. `active` is where work items come from: GitHub, Azure DevOps, or local. `scm` is where pull requests live: GitHub or Azure DevOps, never local. My favorite teaching example: `active: local` with `scm: github`. Local spec files, real GitHub pull requests. If you omit the block, the tool infers from legacy tracker settings, but explicit beats inferred. Say it out loud when you set it.

**Four, `verification`.** Your build, test, format, and migration commands, plus the optional mutation threshold, default eighty. Empty aliases are skipped, not executed. These commands are the ground truth for the verify score, so use the same commands CI uses.

**Five, `defaults`.** The behavior dials, and the four you must know. [ON SCREEN: highlight each key as you name it.] `minVerifyScore`: the bar for shipping, one to ten, default nine. `branchStrategy`: `stay` on the current branch by default, or `from-current`, `from-base`, or `prompt`. `enableDag`: false means sequential tasks; true allows up to three parallel workers. And the model keys: `modelsPreset`, `modelPresets`, and per-step `stepModels`, so planning, execution, and review can run on different models. The orchestrator session itself always stays on your current model. You switch it by pausing, switching in your host, and resuming. There is no model flag, on purpose.

**Six, `plans` and `reviews`.** Where artifacts live. Two switches worth knowing: `enforceSpecPrefixOrdering`, which numbers specs `NNNN-slug`, and `statusSubfolders`, which files specs into `pending`, `completed`, and `archived`.

**Seven, `rules`.** Pointers to your guardrails: the stack file, the changelog file, the memory directory, and the senior-developer checklist. Defaults are repo-root `CHANGELOG.md` and repo-root memory. Change the pointer, not the skill.

**Eight, `invariants`.** Project-level architecture assertions, plus `skipQualityGates` for gate-only bypasses. Use sparingly, and say why in the commit.

**Nine, memory routing.** Two booleans: `enableMemoryFiles` for local memory, `enableSpecMemoIntegration` for an external vault. Turning the vault on is a Chapter Eleven topic; the bridge skill is `ws-spec-memo`, and daily vault work uses the external `ws-memo` skill.

**Ten, the small print with big effects.** `fable` toggles the adversarial audit policy. `retro.enabled` offers a retrospective after ship. `preview.dryRunCommand` runs your local review command before a PR is created, and findings never block shipping. And `defaults.autoMode`, which removes gate halts for unattended runs. That one gets its own chapter. Do not turn it on today.

[PAUSE]

How do you fill all this without hand-editing JSON for an hour? Two supported paths. [DEMO: agent prompt, then the GUI for twenty seconds.] Ask your agent to run `ws-configure-project`; it interviews section by section and detects what it can. Add `--auto --json` for a machine-readable pass. On Windows, `npm run config:gui` opens a desktop editor that mirrors the schema, sections, types, and validation. Whichever path you choose, finish with the doctor: `ws-doctor` reads your install read-only and calls out path errors, bad switches, and missing references.

[ON SCREEN: a healthy doctor summary.]

Quick self-test before we close. [PAUSE] If I delete `.agents/skills` and reinstall, what survives? Your `.ws/config.json`, your `STACK.md`, your memory, your changelog, and your installed-skills manifest. If I move the hub with `pathTokens.sharedDir`, what stays fixed? The bootstrap `.ws/config.json` that points at it. If those two answers are obvious now, configuration will never scare you again.

Next video: we write your first spec, and we make it pass validation on the first try.

## Usage examples

```bash
# Interview wizard (agent skill) — or machine-readable auto pass
/ws-configure-project
node {skillsRoot}/ws-configure-project/scripts/... --auto --json   # see skill body for exact recipe

# Windows desktop editor + its test
npm run config:gui
node test/test-powershell-config-editor.js
```

```jsonc
// .ws/config.json — the four defaults keys to set deliberately
"defaults": {
  "minVerifyScore": 9,          // 1–10, default 9; omitted also means 9
  "branchStrategy": "stay",     // stay | from-current | from-base | prompt
  "enableDag": false,           // true = up to 3 parallel task workers
  "verboseMode": true           // reasoned "Starting step N" preview; only explicit true prints
}
```

## Features in this chapter (enumerated)

1. Consumer-owned `.ws/config.json` seeded from `templates/config.json.example`, validated by `runtime/config.schema.json`; never overwritten on update.
2. Path tokens `{skillsRoot}` / `{sharedDir}` / `{plansDir}` / `{specsDir}` / `{reviewsDir}` expanded before any file access; relocatable hub with fail-closed traversal checks.
3. Sections: `project`, `stack`, `domain`, `providers`, `issueTrackers`, `verification`, `dagThresholds`, `defaults`, `plans`/`reviews`/`preview`, `rules`, `invariants`, `tracking`, `monitor`, `specMemo`, `fable`, `retro`.
4. Model routing: `modelsPreset`/`modelPresets`/`stepModels` + per-run `preset=<name>` override persisted in state; fix-PR uses `fixPrPlan` (reviewer) then `fixPrExec` (execution).
5. Context economy: `contextBudget` (32 KB default) + per-step `stepContextBudgets` (18,000 floor) recorded in every dispatch audit manifest.
6. Branch and filing switches: `branchStrategy`, `plans.enforceSpecPrefixOrdering`, `plans.statusSubfolders`, `plans.autoOrganizeByStatus`.
7. Desktop GUI editor kept in sync with the schema and verified by `test-powershell-config-editor.js`.

## Common mistakes

1. Hardcoding project paths inside a skill instead of setting config. Config is the contract; skills stay portable.
2. Reading `config.json` from the global hub when a project hub exists. Project config always wins; global is fallback only.
3. Storing real tokens in `config.json`. Store environment variable references; track the file only when non-secret.

## Recap (say this)

"One file, ten sections, four dials to set on purpose. Next: your first spec."

## Practice

Open your `.ws/config.json`, set `minVerifyScore` and `branchStrategy` deliberately, add one real `verification` command that CI also runs, then ask for `ws-doctor` and fix every finding it reports.

## Next video

Chapter 04 — Write Your First Spec That Passes Validation.
