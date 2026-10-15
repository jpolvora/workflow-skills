# Chapter 12 — GitHub, Azure DevOps, and Local Specs: One Contract

## Video metadata

- **YouTube title:** GitHub, Azure DevOps, and Local Specs: One Contract | Workflow Skills #12
- **Thumbnail text:** 1 CONTRACT
- **Description (first lines):** Same intents, same pipeline, three sources. Fetch issues, create PRs, manage review threads, and close items identically on GitHub and Azure DevOps, plus tracker-free local specs.

## Learning objectives

After this video, the viewer can:

1. Explain the two-provider model (`active` vs `scm`) and the shared intent contract.
2. Import tracker items as specs and export ideas as tracker items.
3. Choose local specs with a remote PR host (the hybrid pattern).

## Before you record

1. Demo on GitHub (`gh` authenticated); describe the Azure mirror verbally, intent by intent.
2. One open GitHub issue ready to import; one free-text idea ready to export.
3. `scm-provider-contract.md` open for the intents table.

---

## Narration script

[ON SCREEN: the two provider logos plus a local file icon. Keep it simple: three words.]

Welcome back. From Spec to Delivery.

Your team is on GitHub. Your client's team is on Azure DevOps. Your solo project has no tracker at all. Today: why Workflow Skills does not care. One pipeline, one intent contract, three doors in.

The core idea is separation of two questions. [PAUSE] Question one: where do work items come from? That is `providers.active`. Question two: where do pull requests and review threads live? That is `providers.scm`. They are independent keys, and keeping them independent unlocks the pattern I recommend most: `active: local`, `scm: github`. Hand-written local spec files, real GitHub pull requests, no tracker ceremony. Solo developers, this is your configuration. Enterprise teams pick GitHub plus GitHub, or Azure plus Azure, and nothing else in the course changes.

Underneath sits the **shared intent contract**. [ON SCREEN: the intents table, slowly.] Both PR hosts implement the same required operations: fetch a work item, create a pull request, get PR status with CI detail, list and reply to review threads, resolve threads, comment on an issue, close an issue, and create an issue. The orchestrators call intents, never host commands. They never say `gh` or `az`. The provider skill translates intent into host operations behind the curtain.

Parity is enforced, not aspirational. [PAUSE] The test suite fails the build when an intent exists on one side and not the other. If Azure gains an operation, GitHub gains it too, or the package does not ship. When you switch hosts, your muscle memory, your gates, your fix-PR loop, your close semantics — all of it survives the move, because none of it ever knew which host it was on.

**Inbound: tracker to spec.** [DEMO: import one issue.] `ws-spec-from-provider` bulk-imports open GitHub issues or Azure work items into local specs, reformulating each into testable acceptance criteria with the original human wording preserved in its own section. A raw tracker dump makes a bad spec; the reformulation is the value. Single items also enter through the pipeline's Step Zero fetch, with the same reformulation. And the reverse of a sloppy import, a validator, stands guard: tracker-derived specs must pass the same authoring validation as hand-written ones. An issue title is not an acceptance criterion, on either host.

**Outbound: idea to tracker.** [DEMO: export one idea.] Sometimes the idea is not ready for a spec and should live in the backlog. `ws-spec-to-issue` turns free text into an anonymized GitHub issue or Azure User Story through the create-issue intent. No local spec file. No git mutation. Anonymized matters: private project names and customer data are stripped; the failure class is described generically. The backlog gets the signal; your client's name stays out of a public tracker.

**Local: the tracker-free door.** [ON SCREEN: a local spec file.] `ws-spec-provider-local` detects, normalizes, and registers hand-written spec files, the path you have used since Chapter Four. Null id, local source, same ledger, same score, same ship. Local is not a lesser mode. It is the mode where the filesystem is the backlog, and `index.PRD` from Chapter Ten is the board.

[PAUSE]

Two parity details worth naming, because reviewers ask. Visual attachments on work items are handled with parity expectations across hosts, so a screenshot-driven bug report survives import. And close semantics are explicit: merge with the auto-close keyword closes GitHub issues on the default branch, the close-issue intent closes items on any base after convergence, and comment-issue never changes state. Three different intents, three different promises, identical on both hosts.

[ON SCREEN: back to you.]

Choose your door by where your team already lives. Keep `active` and `scm` explicit in config even when they match; the next person who reads that file at 2 a.m. will thank you. Next video, we go advanced: unattended runs, batches, distributed steps, and watching it all live.

## Usage examples

```text
Import open issues as specs: ws-spec-from-provider
Open an issue for this idea: ws-spec-to-issue "Export fails silently on empty tables"
Run from a tracker item: Run ws-spec-to-pr for issue 123
```

Config patterns (say the hybrid one out loud):

```jsonc
"providers": { "active": "local",        "scm": "github" }        // hybrid: local specs, GitHub PRs
"providers": { "active": "github",       "scm": "github" }        // all GitHub
"providers": { "active": "azure-devops", "scm": "azure-devops" }  // all Azure DevOps
```

Shared intents (both hosts, identical): fetch work item · create PR · PR status/CI · list/reply/resolve threads · comment issue · close issue · create issue.

## Features in this chapter (enumerated)

1. Two-axis provider model: `providers.active` (github | azure-devops | local) × `providers.scm` (github | azure-devops), with legacy inference when omitted.
2. Shared SCM intent contract (`scm-provider-contract.md`); orchestrators never embed host CLI names; parity enforced by `npm run test`.
3. GitHub provider (`ws-spec-provider-github`) and Azure DevOps provider (`ws-spec-provider-azure-devops`) with the same required intents, including visual-attachment parity.
4. Local provider (`ws-spec-provider-local`): detect, normalize, and register `*.spec.md` with the same ledger and gates.
5. Inbound bulk import (`ws-spec-from-provider`): tracker backlog → reformulated, validated local specs.
6. Outbound export (`ws-spec-to-issue`): free text → anonymized tracker item; no local spec, no git mutation.
7. Explicit close semantics: PR auto-close keyword, `close-issue` after merge with zero threads, `comment-issue` as comment-only.

## Common mistakes

1. Setting `scm: local`. The PR host is never local; local is only a work-item source. Pair local specs with a real PR host.
2. Importing raw tracker text as acceptance criteria. Reformulate into testable Given/When/Then lines, then validate.
3. Pasting private consumer names into a new tracker item. Anonymize to the failure class; published wording stays generic.

## Recap (say this)

"Intents above, hosts below. Switch hosts without retraining your hands. Next: advanced modes."

## Practice

Set the hybrid pattern (`active: local`, `scm: github`) in the demo, ship one local spec, and confirm the PR and auto-close behavior. Then read the intents table once and name, from memory, the operation your team uses least.

## Next video

Chapter 13 — Advanced: autoMode, Multi-Spec, Distributed, Monitor.
