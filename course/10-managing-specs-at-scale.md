# Chapter 10 — Manage Specs at Scale: Index, List, Kanvas, Organizer

## Video metadata

- **YouTube title:** Manage Specs at Scale: Index, List, Kanvas, Organizer | Workflow Skills #10
- **Thumbnail text:** 30 SPECS?!
- **Description (first lines):** One front door for every spec operation: index.PRD lifecycle, the dual list board, the Kanvas kanban, path organization, human runbooks, and archiving shipped history.

## Learning objectives

After this video, the viewer can:

1. Operate the `index.PRD` lifecycle: track, sync, file to `completed/`, and verify the close.
2. Use `ws-spec-manager` as the single entry point and the dual board (`ws-spec-list`).
3. Run the Kanvas board, organize spec paths, translate a spec for humans, and archive history.

## Before you record

1. Demo specs folder with ~8 specs in mixed states (pending, in progress, shipped).
2. `index.PRD` initialized; one shipped spec still pointing at `pending/` to demo the filing guard.
3. Kanvas server ready: `npm run kanvas`.

---

## Narration script

[ON SCREEN: a specs folder with many files.]

Welcome back. From Spec to Delivery.

One spec is a workflow. Thirty specs are a portfolio, and portfolios need management. Today: the spec management family. The index, the boards, the organizer, the translator, and the archivist. Five tools, one job: you always know what exists, what state it is in, and what ships next.

Start with the front door. [PAUSE] `ws-spec-manager` routes every spec operation: create, list, inspect, update, sync, organize, archive, validate, import, run. Why a router? Because with a dozen `ws-spec-*` skills, agents and humans both guess wrong. One door, correct room. When in doubt on camera or in your terminal, start at the manager.

The ledger of record is **`index.PRD`**, owned by `ws-spec-index`. [ON SCREEN: the index.] A feature map with checkboxes, a Next-specs queue, and a Done log. The lifecycle is automatic when you let it be. A workflow start tracks the spec as pending, checkbox empty, Next row added. A terminal close syncs it: checkbox ticked, Done-log row written with delivery evidence, a commit SHA or a PR URL. No evidence, no sync; the helper returns "skipped" and says so. Faked checkboxes are not a shortcut. They are a filing defect with a detector.

Filing deserves thirty seconds, because it is where portfolios rot. [ON SCREEN: `pending/` and `completed/` folders.] When status subfolders are on, a shipped spec physically moves from `pending` to `completed`, with its gray-area context file and assets riding along, and the index links are rewritten. Already-implemented or skipped specs still get filed, using the prior delivery commit or PR as evidence. Never strand a done spec in pending. A close verifier exists for exactly this sin:

[DEMO]

```bash
node {skillsRoot}/ws-spec-index/scripts/verify_close_filing.cjs --specs-dir {specsDir} --slug {slug}
```

Non-zero exit, naming the stale pending path, means the close is not finished. Run it before you believe any "done" claim, including your own from last month. Especially your own from last month.

[PAUSE]

Now the boards, plural, because they answer different questions. [ON SCREEN: the list board.] `ws-spec-list` is the dual board: specs on one side, plan workflows on the other, plus a manage menu. It answers "what exists and what can I do with it" inside the terminal. And **Kanvas** answers "show me" in the browser. [DEMO: `npm run kanvas`, drag one card.] A local, loopback-only kanban with six columns: Backlog, Sprint, Development, Staging, Production, Abandoned. Phase colors, click a card for the full rendered spec, and drag-and-drop moves that write atomically with size-limited requests. Abandoning a tracked spec with no run files it as Abandoned instead of deleting history. Boards that delete history teach teams to fear the board. This one remembers.

Underneath, **`ws-spec-organizer`** keeps paths honest. It resolves where a spec belongs, slug to path, and applies chronological numbering, `NNNN-slug`, when your project enables prefix ordering. Index completion beats stale issue state when filing. Path questions are organizer questions; never let an agent guess a spec path from memory.

Two supporting acts. [ON SCREEN: a human runbook beside its spec.] **`ws-spec-translate-to-human`** renders a parallel runbook next to an agent spec: numbered Implementation steps, UI Test steps, and Out of scope. Your QA colleague, your product manager, your future self at demo time: humans get a human document, generated from the same source, so the two cannot drift apart silently. And **`ws-spec-explain`** gives a read-only panorama of any spec or issue: status, what it does, what it delivered, how to check it in the UI, how to test it. First question in any status meeting, answered by a skill instead of a calendar invite.

Finally, housekeeping with memory. [PAUSE] **`ws-spec-archive`** harvests finished plan folders (state, artifacts, git, changelog, memory) into the index Archive and proposes removing eligible shipped plan directories, as a commit you approve. **`ws-cleanup`** lists disposable leftovers: telemetry scraps, runtime folders, audit logs, untracked orphans, confirms through a gate, deletes only approved untracked paths, and suggests the `.gitignore` lines that prevent encore performances. And **`ws-spec-update`** closes the last drift loop: after prompt-driven code changes, it updates the affected specs, optionally recording what it learned into memory.

[ON SCREEN: back to you, index + board visible behind.]

Management is not overhead. Management is how the contract store stays trustworthy enough that Chapter Five's machine can run on autopilot later. Next video: the knowledge layer underneath everything — memory, changelog, and the living wiki.

## Usage examples

```text
Manage my specs: ws-spec-manager
Explain this spec: ws-spec-explain csv-export
Give QA a runbook: ws-spec-translate-to-human csv-export
```

```bash
npm run kanvas
node {skillsRoot}/ws-spec-index/scripts/track_index.cjs --specs-dir {specsDir} --slug csv-export
node {skillsRoot}/ws-spec-index/scripts/sync_index.cjs --specs-dir {specsDir} --slug csv-export --pr-url <url>
node {skillsRoot}/ws-spec-index/scripts/verify_close_filing.cjs --specs-dir {specsDir} --slug csv-export
node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug csv-export
```

## Features in this chapter (enumerated)

1. Unified front door (`ws-spec-manager`) routing create/list/inspect/update/sync/organize/archive/validate/import/run.
2. `index.PRD` lifecycle (`ws-spec-index`): track on start, sync on close with delivery evidence, Done log, `pending/` → `completed/` filing with sidecars, and `verify_close_filing.cjs` guarding stale paths.
3. Dual board + manage menu (`ws-spec-list`): specs vs plan workflows in the terminal.
4. Kanvas local kanban (`ws-kanvas`, `npm run kanvas`): six columns, phase colors, full-spec modal, drag-and-drop `POST /api/move` with atomic writes.
5. Path authority (`ws-spec-organizer`): slug → path resolution and `NNNN-` ordering under `plans.enforceSpecPrefixOrdering`.
6. Human surfaces: `ws-spec-translate-to-human` runbooks (Implementation / UI Test / Out of scope) and `ws-spec-explain` delivery panoramas.
7. History hygiene: `ws-spec-archive` (harvest + propose shipped-plan removal), `ws-cleanup` (gate-confirmed leftover deletion + `.gitignore` suggestions), `ws-spec-update` (post-change spec sync).

## Common mistakes

1. Hand-editing `index.PRD` checkboxes or Done rows. Use track/sync helpers; hand edits desync filing and get flagged at close.
2. Leaving already-implemented specs in `pending/`. A skip with prior delivery evidence still runs sync and files to `completed/`.
3. Guessing a spec path in a prompt. Resolve it (`resolve_spec_path.cjs`) or ask the manager; guessed paths create duplicate specs.

## Recap (say this)

"One door, one ledger, two boards, no stranded specs. Next: memory and the wiki."

## Practice

Run the close-filing verifier across your shipped specs. File anything stranded in `pending/`, open Kanvas, and drag one card to its true column. Screenshot the board for your next standup.

## Next video

Chapter 11 — Memory, Changelog, and the Living Wiki.
