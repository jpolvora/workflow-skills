# Chapter 11 — Memory, Changelog, and the Living Wiki

## Video metadata

- **YouTube title:** Memory, Changelog, and the Living Wiki | Workflow Skills #11
- **Thumbnail text:** NEVER REPEAT
- **Description (first lines):** Anti-regression memory the agent must consult, an append-only changelog, dual memory routing with the spec-memo vault, and a living feature wiki that syncs before you ship.

## Learning objectives

After this video, the viewer can:

1. Write a memory trap in DO NOT / INSTEAD DO form and prove consultation happened.
2. Route memory: local files, external vault, or dual mode, and name each skill's job.
3. Operate the living wiki: init, from-code genesis, sync baseline, verify, and reconcile.

## Before you record

1. Demo `MEMORY.md` + one `memory/*.md` entry; changelog file present.
2. Wiki initialized in the demo (or ready to init live): `{wikiDir}` = `.agents/specs/wiki` in this repo.
3. One real trap story from your own work to tell (anonymized).

---

## Narration script

[ON SCREEN: you. Tell the story first, tools second.]

Welcome back. From Spec to Delivery.

Every team has a story like this. The agent refactors the retry logic. Clean code, green tests. And it reintroduces the exact race condition the team fixed in March, documented nowhere except a departed colleague's memory. The agent was not careless. The agent was never told. Today we fix "never told," permanently, with three knowledge systems: memory, changelog, and the living wiki.

**Memory first,** `ws-self-learning`. [ON SCREEN: a memory entry.] Memory is anti-regression: input and output. Before planning or coding, the agent searches memory with a few keywords and the files it is about to touch, and folds in every relevant trap. The entry shape is a contract: date, topic, layer, module, severity, path pattern, scenario, then two lines that matter. **DO NOT:** the move that burned us. **INSTEAD DO:** the move that works. If it is not written as do-not and instead-do, it is a diary, not a guardrail.

Consultation is enforced, not encouraged. [PAUSE] Steps Four and Six of the standard pipeline must show memory-consult proof in their output. Missing proof fails the gate. And writing is enforced too: after mutating work, every run ends with a Learning line. Two or more tool or test failures before a pass? "Learning: N/A" is forbidden. The friction becomes a recorded trap with root cause. A reviewer thread that exposed a real agent mistake, scored six to ten in severity, becomes a trap. An adversarial audit verdict of Refuted or Caveats becomes a high or critical trap. No trap and a smooth run? Then, and only then, "Learning: N/A" with the reason named.

When local memory files are enabled, entries land as dated files and compile into `MEMORY.md`. Compile only after the entry file exists on disk. If the compiled index conflicts, recompile; never hand-resolve the index. Humans curate. Machines compile.

**The changelog is memory's sibling, not its synonym.** [ON SCREEN: changelog entries.] `ws-changelog` appends one structured entry per finished task: prompt, done, result, timestamped. Append-only. You never rewrite history; you append the next line, and an exact duplicate run is skipped by the helper. Memory answers "what must we never do again?" The changelog answers "what happened, in order?" Auditors ask the second question. Future agents ask the first. Keep both, confuse neither.

[PAUSE]

**Routing: where memory lives.** Two switches. `enableMemoryFiles` for local files under your configured memory directory, repo root by default. `enableSpecMemoIntegration` for an external spec-memo vault, a separate project that stores knowledge across repositories. Dual mode writes both, consults the vault first, then local. The harness-side skill, `ws-spec-memo`, is only the bridge: it configures the integration, imports legacy trees, and installs the optional write-block hook that stops vault residue from being committed by accident. Daily vault operations (search, bootstrap, upsert) use the external `ws-memo` skill over MCP or its CLI. Bridge builds the road. `ws-memo` drives on it. If you remember that split, the two skills never blur.

**And the wiki,** `ws-wiki`. [ON SCREEN: wiki index + one feature page.] Specs are point-in-time contracts. The wiki is the living synthesis: what the product does now, organized by domain, in feature pages with a required Feature section, a How it works section, and conditional backend, frontend, and third-party sections. You can initialize it from docs, generate it from code, or sweep it from specs. Thereafter it stays young through the Sync Baseline: a watermark commit in the wiki index. Each sync diffs only what changed since the watermark, updates the touched pages, and advances the watermark. No full-tree rescans, no drift-by-neglect.

The wiki also audits itself. A verify phase compares wiki claims against code reality and lists mismatches as mismatches, not as auto-edits. A reconcile phase plans changes and applies them with your approval. Verbosity is configurable, condensed or detailed, and links and headings are validated deterministically. Remember Chapter Nine's pre-ship trio? The wiki sync is leg one. The wiki must describe the code you are about to ship, before the PR opens, while fixing it is still cheap.

[ON SCREEN: back to you.]

Three systems, three tenses. Memory guards the future: never again. Changelog records the past: in order. Wiki describes the present: as shipped. Wire all three and your agent stops being a talented stranger and starts being a junior teammate with perfect recall.

Next video: the provider layer. GitHub, Azure DevOps, and humble local files, one contract, zero pipeline changes.

## Usage examples

```text
What do we know about retries here? (agent: read-memory, 3–8 keywords + touched paths)
Record this trap: update-memory
What changed last week? (agent: read the changelog, newest first)
Sync the wiki for this slug: ws-wiki sync csv-export
```

Helper recipes named on camera:

```bash
node .agents/skills/ws-self-learning/scripts/self_learning.cjs --match-paths <files>
node .agents/skills/ws-self-learning/scripts/self_learning.cjs --compile
node .agents/skills/ws-changelog/scripts/append_changelog.cjs --prompt "…" --done "…" --result "…"
```

Memory entry shape (say DO NOT / INSTEAD DO out loud):

```markdown
### [2026-10-15] Retry loop races on shared token bucket
Layer: infrastructure · Module: billing · Severity: High · PathPattern: src/billing/**
Scenario: parallel retries double-charged after token refresh.
DO NOT: retry with a per-call bucket instance.
INSTEAD DO: share the bucket from the request scope and lock refresh.
```

## Features in this chapter (enumerated)

1. Anti-regression memory (`ws-self-learning`): pre-plan/pre-code consult (keywords + touched paths), DO NOT / INSTEAD DO traps, compiled `MEMORY.md`.
2. Enforced learning: Learning line after mutating work; ≥2 failures, real review defects (6–10), or REFUTED/CAVEATS audits make `Learning: N/A` forbidden.
3. Append-only changelog (`ws-changelog`): Prompt/Done/Result entries under the configured `rules.changelogFile`, duplicate-safe helper.
4. Dual routing: `enableMemoryFiles` (local) + `enableSpecMemoIntegration` (vault), vault-first consult in dual mode; `ws-spec-memo` bridge vs external `ws-memo` runtime.
5. Living wiki (`ws-wiki`): init / from-code genesis / spec sweep, Sync Baseline watermark delta sync, Phase 2 wiki-vs-code verify, Phase 3 plan/apply reconcile.
6. Knowledge in the pipeline: memory-consult proof gates Steps 4 and 6; pre-ship trio (wiki sync + spec-index sync + changelog) before the PR opens.

## Common mistakes

1. Writing memory as prose narrative. Without DO NOT / INSTEAD DO and a path pattern, the next agent cannot apply it at the right moment.
2. Hand-editing the compiled `MEMORY.md` index. Write the dated entry file, then compile; conflicts are resolved by recompiling.
3. Treating the wiki as generated-once docs. Without the Sync Baseline ritual at ship time, the wiki becomes archaeology within a month.

## Recap (say this)

"Memory: never again. Changelog: in order. Wiki: as shipped. Next: one contract, three providers."

## Practice

Convert your team's most-repeated review comment into a memory trap with a tight path pattern. Then run a wiki sync (or init, then sync) and read the delta it proposes before approving anything.

## Next video

Chapter 12 — GitHub, Azure DevOps, and Local Specs: One Contract.
