---
slug: us-497-link-integrity
title: "Link integrity across install scopes: scope-aware gate classification and complete installer autoload link rewriting"
status: completed
acRefs: []
step: 2
workflowId: us-497-link-integrity-20261010T042722Z
startedAt: "2026-10-10T04:27:22Z"
endedAt: "2026-10-10T04:40:22.509Z"
---
## 0. Summary & Business Rules

Restore **one link-integrity contract across install scopes** by fixing the two halves of the same
contract without letting either half cancel the other (spec of record
`.agents/plans/us-497-link-integrity/step-00-us-497-link-integrity.spec.md`, companion
`.agents/specs/pending/0171-us-497-link-integrity.context.md`).

Business rules:

| # | Rule |
|---|------|
| BR1 | The Phase 5a link gate fails only on links that are genuinely broken **in the layout it audits**. |
| BR2 | The installer never ships a broken link in the first place: every bare link target that names a runtime sibling of the relocated autoload source is rewritten to a resolvable target. |
| BR3 | The hub-routing tolerance is a **classification of resolvable, layout-tolerated hub routing**, never a suppression of unresolvable targets. The genuine break in #493 must keep failing in project-scope, global-only, and hybrid layouts. |
| BR4 | Classification is derived from the **resolved consumer context** (resolved hub directories, resolved install scope, resolved hub presence) and from resolved containment, never from a `.ws/…` / `ws-shared/…` link-text prefix. |
| BR5 | The tolerance window is narrow and fail-closed: depth-1 hub binding files only, only while `installScope` is global **and** the project hub is absent, and it never widens the exit code (`total`/`ok` keep summing only the five real finding buckets). |
| BR6 | Both renderers (`bin/cli.js`, `ws-configure-project/scripts/configure_autoload.cjs`) rewrite the same runtime-filename set; a one-sided edit is a defect, not a partial fix. |
| BR7 | The shipped source `.agents/skills/ws-shared/runtime/autoload.md` keeps its bare same-directory sibling links (they resolve at the source path); only install-time rendering changes. |

No authorization, tenancy, subscription, or data-lifecycle surface is touched: the gate is a
synchronous read-only file walk and the renderers are synchronous single-process string transforms.

## 1. Definition of Ready & Scope

### Resolved design choices (from the spec's Assumptions table + companion D1–D7)

| Choice | Resolution |
|--------|-----------|
| Width of the hub-literal tolerance (D1) | **Option B** — a file **directly inside** a resolved hub directory that is a **hub binding file**, in either the project hub `{sharedDir}` or the resolved skills install's `ws-shared` hub. Subtrees (`ws-shared/runtime/*`) keep failing. |
| Diagnostic surface (D2) | New informational `installLayoutNotes` bucket in the `--json` payload, **excluded** from `total`/`ok`, plus a `projectHubAbsent` warning naming `ws-configure-project`. Both print on the human path even when the gate passes. |
| Hub directory source (D3) | `resolveConsumerContext()` → `sharedDir`, `skillsRoot`, `executionScope`; containment via the exported `inside()`; presence via the exported `consumerHubExists()`. No literal `.ws` assumption. |
| Scope gate condition (D4) | `executionScope === 'global'` **and** project hub absent. Project-local stays as today. |
| Installer mechanism (D5) | Keep the bounded allow-list; add the missing `host-capability-tokens.md` entry in **both** renderers and pin the two lists with a fail-first equality guard. |
| Boundary (D6) | Three constraints, each asserted in both directions (AC21–AC23, NS7/NS8). |
| Sequencing (D7) | Consume the install-scope value published as Phase 0 evidence; add **no** scope detection of our own (AC24). The sibling install-mode reporting spec (`.agents/specs/pending/0172-us-498-install-mode-reporting.spec.md`, batch item 3) owns the corrected value. |

**The one reading this plan makes explicit (AC23 vs AC15/NS2).** The gate derives the tolerance from
the *resolved* context. A depth-1 hub binding literal that **exists** is never a finding (ordinary
existence check). A depth-1 hub binding literal that does **not** exist is tolerated only inside the
window "global scope + project hub absent"; while a project hub is present, a missing target that
resolves inside that hub is reported under `findings.brokenLinks` (AC15, NS2). Gate scope is
resolved by `resolveConsumerContext()` from the **executing script path** (`scriptFile: __filename`);
a global-only fixture therefore reproduces the layout by running a copy of the checker from inside a
fake global skills root.

### Acceptance criteria → plan step map

| AC | Behavior | Plan step |
|----|----------|-----------|
| AC1 | Renderer rewrites every bare target naming a shipped runtime sibling, incl. `host-capability-tokens.md` | S3, S6 |
| AC2 | Skills-install-scope autoload emits `runtime/host-capability-tokens.md` | S3, S8 |
| AC3 | Project-hub autoload emits a hub-relative managed-runtime link | S3, S7 |
| AC4 | Fresh install: installed `autoload.md` has zero unresolvable targets in the hub tree | S3, S6, S8 |
| AC5 | Bare target absent from the resolved runtime dir stays untranslated | S3, S7 |
| AC6 | Renderer idempotent (byte-identical repeat) | S3, S6, S7 |
| AC7 | `update` rewrites a stale bare sibling target with the same prefix rule | S3, S6 |
| AC8 | Bare project-owned (non-runtime-sibling) target untouched | S3, S7 |
| AC9 | Both renderers rewrite the same runtime-filename set | S3, S7 |
| AC10 | Shipped source `runtime/autoload.md` keeps its bare sibling link | S6 |
| AC11 | Link gate reports zero `brokenLinks` whose file is the installed `autoload.md` | S2, S4, S8 |
| AC12 | Global scope + absent hub → depth-1 hub binding literal = install-layout note | S2, S4 |
| AC13 | Notes only → exit 0 | S1, S4 |
| AC14 | Note emitted outside `findings.brokenLinks` + `ws-configure-project` pointer | S1, S4 |
| AC15 | Project hub present → resolving target validates; missing target reported | S2, S4 |
| AC16 | Genuinely unresolvable target exits 1 in project/global-only/hybrid | S2, S4 |
| AC17 | Absent project hub → warning naming `ws-configure-project`, not a broken link | S1, S4 |
| AC18 | Hub directories derived from resolved context, never literal `.ws` | S1 |
| AC19 | Upstream package root: zero findings | S4, S6 |
| AC20 | Target below hub binding-file level → broken link | S2, S4 |
| AC21 | Tolerance restricted to depth-1 binding files; never prefix-matched | S1, S4 |
| AC22 | Unresolvable runtime sibling → `brokenLinks` + exit 1 in every layout | S2, S4 |
| AC23 | Resolving depth-1 hub binding literal is never in `brokenLinks` | S2, S4 |
| AC24 | Consumes the corrected install-scope value; adds no scope detection | S1 |

### Out of scope (from the spec's `## Out of Scope`)

Hub layout and the deliberate global omission of `{globalSkillsRoot}/ws-shared/AGENTS.md`; the
shipped source form of `runtime/autoload.md`; the runtime file inventory; `detect_install_mode.cjs`
and the install-mode reporting defect; the other Phase 5a gates; the non-link finding classes
(`absolutePaths`, `tokenInLinkTargets`, `shorthand`, `unrouted`); rewriting shipped `.ws/` literals
inside skill bodies; rewriting `templates/STACK.md.example`. **No new shipped file** is added
(DoR bounded scope).

## 2. Technical Design & Architecture

Touch points (config layers `skills-sot`, `installer-cli`, `tests`):

| File | Change |
|------|--------|
| `.agents/skills/ws-check-harness/scripts/check_harness_links.cjs` | Scope-aware classification: read `executionScope` + `consumerHubExists()`, add `installLayoutNotes` + `warnings`, exclude notes from `total`/`ok`, print both on the human path. |
| `bin/cli.js` (`managedRuntimeLinkPrefixFor` / `renderConsumerAutoloadText`) | Hoist the bare-runtime-filename list into a named module-scope constant and add `host-capability-tokens.md`. |
| `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` (`renderConsumerAutoload` / `runtimePrefixFor`) | Same constant, same entry, exported for the wiring guard. |
| `test/test-check-harness-links.js` | Global-only fixture (checker copy inside a fake global root), project-scope fixture, hybrid fixture, tolerance boundary, genuine-break regression, traversal, unknown-argument guard. |
| `test/test-install.js`, `test/test-autoload-configure.js`, `test/test-ws-shared-layout.js`, `test/test-doc-sync.js` | Rewrite + idempotency + both install scopes + zero-unresolvable-target assertion + source-form pin + two-list wiring guard. |
| `bin/skill-integrity.json` | Regenerated (hashed install content changed). |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `docs/index.html` (footer) | Single patch bump `0.5.36 → 0.5.37` via `npm run build-site:bump`. |
| `.agents/skills/ws-check-harness/PHASES.md` | Contract of record for the tolerance wording (Phase 5a row + hub-resolution note) so the doc matches the implemented rule. |

### Gate design

```
analyze(repoRoot):
  context      = resolveConsumerContext({ repoRoot, scriptFile: __filename })
  skillsRoot   = context.skillsRoot (absolute)
  projectHub   = path.resolve(context.sharedDir)                 // resolved, not literal '.ws'
  skillsHub    = path.join(skillsRoot, 'ws-shared')
  tolerant     = context.executionScope === 'global' && !consumerHubExists(repoRoot)

  for each link target T in file F:
     decoded = percentDecode(T)
     resolved = path.resolve(dirname(F), decoded)
     if exists(resolved)            -> ok
     if root-anchored fallback exists -> ok                       (unchanged TOP_LEVEL behavior)
     hub = hubBindingClass(resolved, [projectHub, skillsHub])     // inside() + depth 1 + binding name
     if (hub && tolerant)           -> installLayoutNotes.push({file, target, hub, remediation: 'ws-configure-project'})
     else                           -> brokenLinks.push(...)      (unchanged shapes)
```

* `HUB_BINDING_FILES` — the hub-root **binding/routing** files declared by
  `ws-shared/runtime/hub-layout.json` (`AGENTS.md`, `autoload.md`, `config.json`, `STACK.md`). A
  runtime contract file such as `host-capability-tokens.md` is *not* a hub binding file, which is
  exactly the NS6/NS7 separation: the same depth-1 shape is tolerated for the hub entrypoint and
  stays red for the unrewritten runtime sibling.
* `hubBindingClass` uses `inside()` containment plus `path.relative(hub, resolved)` having no
  separator (depth 1). It never inspects link text, so `.ws/…` / `ws-shared/…` prefixes earn nothing
  (AC21) and traversal escapes fail containment (NS3).
* `warnings` gains `{ code: 'project-hub-absent', message: '… ws-configure-project …' }` whenever the
  project hub is absent (AC17); warnings, like notes, are excluded from `total`/`ok`.
* Payload stays additive and backwards compatible: existing consumers of
  `findings.brokenLinks` / `total` / `ok` are unaffected when nothing is tolerated.

### Renderer design

```
MANAGED_RUNTIME_SIBLING_FILES = [
  'AGENTS.md', 'CROSS-PLATFORM.md', 'config-resolution.md', 'gates.md',
  'host-capability-tokens.md', 'host-dispatch.md', 'scm-provider-contract.md',
  'setup.md', 'tools.md',
]
for (const runtimeFile of MANAGED_RUNTIME_SIBLING_FILES)
  text = text.split(`](${runtimeFile})`).join(`](${managedRuntimeLinkPrefixFor(runtimeFile)}${runtimeFile})`)
```

The per-file fail-closed prefix helpers are unchanged (`{globalSkillsRoot}/ws-shared/runtime/` when
the specific runtime file is missing locally), so AC5/NS13 keep holding. `configure_autoload.cjs`
exports the constant so a test can compare both lists byte-for-byte (AC9/NS12).

## 3. Step-by-Step Plan

Ordered by dependency; each step names its verification.

**S1 — Scope-aware classification core (`check_harness_links.cjs`).**
Read `executionScope`, derive `projectHub`/`skillsHub` from `context.sharedDir` / `context.skillsRoot`,
import `inside` + `consumerHubExists` from the resolved `resolve_consumer_root.cjs`, add
`HUB_BINDING_FILES` + `hubBindingClass()` + `installLayoutNotes` + `warnings`; exclude both from
`total`/`ok`; print notes/warnings on the human path before the OK line. No scope detection added
(AC24). Checks: `node --check`, upstream run stays `ok: true, total: 0` (AC19), `node
test/test-check-harness-links.js` unchanged cases still pass.

**S2 — Negative direction stays red.** Cover NS5/NS7/NS9/NS2 in the same implementation: a depth-1
non-binding target inside a hub (`host-capability-tokens.md`), a hub-subtree target
(`ws-shared/runtime/missing.md`), and any unresolvable target while a project hub is present remain
`brokenLinks` with exit 1.

**S3 — Renderer rewrite (both files).** Hoist `MANAGED_RUNTIME_SIBLING_FILES` in `bin/cli.js` and in
`configure_autoload.cjs` (added `host-capability-tokens.md`), export it from the `.cjs`, keep the
per-file prefixes. **Defect-class sibling sweep:** grep the repo for every `](${runtimeFile})`-style
bare-runtime rewrite list and every duplicated copy of the eight-file array to confirm only these two
exist (`rg "config-resolution.md" bin .agents/skills`). Checks: `node --check` on both; a scratch
global install renders `runtime/host-capability-tokens.md` and no bare target (AC2, AC11).

**S4 — Gate regression suite (`test/test-check-harness-links.js`).** Add the global-only fixture
(checker copy + `ws-shared/runtime/scripts` copy inside a fake `WORKFLOW_SKILLS_GLOBAL_DIR` root, so
`executionScope` resolves `global`), the project-scope fixture (`.ws/config.json` present), the
hybrid fixture, the traversal cases, the unknown-argument guard, and the cross-class guard (NS7+NS8 in
one run). Checks: the suite prints `All check-harness link gate tests passed.`

**S5 — Installer/autoload/layout regression suites.** Extend `test/test-install.js`,
`test/test-autoload-configure.js`, `test/test-ws-shared-layout.js`, `test/test-doc-sync.js`:
installed autoload has no bare `](host-capability-tokens.md)` and has a resolvable runtime-qualified
target; zero unresolvable targets in the installed hub tree; `update` refresh rewrites a stale body;
second run byte-identical; project-hub form is hub-relative; source file keeps its bare sibling form;
two-list wiring guard fails when only one list changes.

**S6 — Red-first / red-baseline proof.** Reproduce NS10/NS11 against the pre-fix tree for at least one
assertion in each defect class (installer rewrite, gate tolerance) and record exit codes, then re-run
green. Sabotage/inline-inversion evidence is recorded for the ledger.

**S7 — Docs/contract sync for the gate.** Update `.agents/skills/ws-check-harness/PHASES.md` § Phase 5a
row and § Hub resolution note so the documented tolerance equals the implemented rule (no new
tolerance surface is implied).

**S8 — Version bump, integrity, full board.** `npm run build-site:bump` once, `npm run
generate-integrity`, targeted suites, then the pre-ship board (whole suite + harness phases 0–5c +
`test-harness-clean.js` + integrity verify).

## 4. Permissions, Tenancy & i18n

Not applicable (RBAC/tenancy/i18n N/A — collapsed absent dimension). The gate performs a read-only
synchronous local file walk under the invoking user's permissions and adds no network, no state
mutation, and no privileged operation; the renderers write only inside the resolved hub/skills tree
under the same permissions. No user-visible localized strings are added.

## 5. Test Coverage

| AC | Named test / assertion | Suite |
|----|------------------------|-------|
| AC1 | `every bare runtime-sibling target in the shipped autoload source is in both rewrite lists` | test-autoload-configure.js |
| AC2 | `global install rewrites host-capability-tokens.md to runtime/` | test-install.js |
| AC3 | `project-hub autoload link into the managed runtime resolves from the consumer hub` | test-autoload-configure.js |
| AC4 | `installed autoload has zero unresolvable link targets in the installed hub tree` | test-install.js |
| AC5 | `absent runtime sibling keeps the {globalSkillsRoot} token / stays untouched` | test-autoload-configure.js |
| AC6 | `renderer is idempotent: a second run leaves autoload.md byte-identical` | test-install.js |
| AC7 | `update rewrites a stale bare sibling target with the fresh-install prefix rule` | test-install.js |
| AC8 | `bare project-owned target is left untouched` | test-autoload-configure.js |
| AC9 | `installer and configurator rewrite the same runtime-filename set` | test-autoload-configure.js |
| AC10 | `shipped source runtime/autoload.md keeps its bare sibling link` | test-doc-sync.js / test-ws-shared-layout.js |
| AC11 | `link gate reports zero brokenLinks entries whose file is the installed autoload.md` | test-install.js |
| AC12 | `global-only depth-1 hub binding literal is an install-layout note` | test-check-harness-links.js |
| AC13 | `notes only → exit 0` | test-check-harness-links.js |
| AC14 | `note is outside findings.brokenLinks and names ws-configure-project` | test-check-harness-links.js |
| AC15 | `project hub present: resolving .ws target validates, missing .ws target is reported` | test-check-harness-links.js |
| AC16 | `unresolvable non-binding target exits 1 in project, global-only and hybrid layouts` | test-check-harness-links.js |
| AC17 | `absent project hub warning names ws-configure-project and is not counted` | test-check-harness-links.js |
| AC18 | `hub directories derive from the resolved context (relocated hub fixture)` | test-check-harness-links.js |
| AC19 | `upstream package root reports zero findings` | test-harness-clean.js / direct run |
| AC20 | `hub-subtree target stays a broken link` (NS5) | test-check-harness-links.js |
| AC21 | `tolerance never triggers on link text alone` (NS3 traversal cases) | test-check-harness-links.js |
| AC22 | `unrewritten runtime sibling stays broken in every layout` (NS7/NS9) | test-check-harness-links.js |
| AC23 | `resolving depth-1 hub binding literal is never in brokenLinks` (NS8) | test-check-harness-links.js |
| AC24 | `gate consumes the resolved install scope and adds no detection` (source-level assertion + global fixture) | test-check-harness-links.js |

Negative scenarios NS1–NS17 map as: NS1/NS2/NS3/NS4/NS5/NS6/NS7/NS8/NS9 → `test-check-harness-links.js`;
NS10/NS11/NS13/NS14/NS15 → `test-install.js` / `test-autoload-configure.js`; NS12 → the wiring guard in
`test-autoload-configure.js`; NS16 → `scan_stack_invariants.cjs --stack typescript-node`; NS17 → the
cross-class guard run in NS7+NS8.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`. Touched framework
boundaries:

- **Traversal / containment (rule 4).** Hub classification proves containment with the exported
  `inside()` and a depth-1 relative check; rewrite prefixes resolve under the resolved hub or runtime
  directory; link text is never compared with string prefixes and no untrusted input is concatenated
  into a path. Negative coverage: NS3 (`../../../.ws/../../outside.md`, `..%2F..%2Foutside.md`),
  AC21.
- **Boundary input validation (rule 3).** Targets are percent-decoded (with the existing safe
  fallback) and normalized before classification; the existing unknown-argument guard is preserved.
  Negative coverage: NS4, existing percent-target test.
- **Async / concurrency / resource lifecycle (rules 2, 5).** No new asynchronous call, floating
  promise, stream, socket, or long-lived handle; the gate stays a synchronous read-only walk and the
  renderers stay synchronous single-process string transforms. Check: `node --check` on each changed
  script plus diff review.
- **Authorization / subscription boundaries.** Not touched (no endpoint, no subscription, no
  privileged operation) — recorded as an explicitly absent dimension rather than invented coverage.
- **Node-22 / CommonJS contract.** Changed scripts stay `.cjs` (skill script) / `.js` (ESM CLI) with
  no new `.py` file; `scan_stack_invariants.cjs` reports no new criticals (NS16).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills SoT + installer + tests only).
- [ ] Domain entities and mappings encapsulated (N/A — no data layer).
- [ ] Schema migrations created (N/A).
- [ ] Authorization checks applied (N/A — read-only local walk).
- [ ] Stack & security invariants verified (containment, input normalization, sync-only, Node 22).
- [ ] i18n keys declared (N/A).
- [ ] Test cases cover all ACs (AC1–AC24 mapped in §5; NS1–NS17 traced).
- [ ] `npm run generate-integrity` + `npm run verify-integrity` green; single version bump.
- [ ] Whole suite green (host flake `test/test-subagent-dispatch.js` recorded honestly if it recurs).
- [ ] `ws-check-harness` phases 0–5c + `test-harness-clean.js` = 0 findings.
- [ ] Doc-sync trio before ship: `ws-spec-index sync`, wiki page, changelog entry.

## 8. Resolved Decisions & External Dependencies

Every draft question is closed; the registry and its evidence live in
`step-02-us-497-link-integrity.plan-interview.md`.

| # | Decision |
|---|----------|
| D-A | **Hub binding-file class (closes draft Q2).** Tolerance applies to a depth-1 file inside a resolved hub directory whose basename is a hub-root **binding/routing** file — `HUB_BINDING_FILES = {AGENTS.md, autoload.md, config.json, STACK.md}` per `ws-shared/runtime/hub-layout.json`. Containment alone cannot separate NS6 from NS7, so the class is required. A runtime contract filename such as `host-capability-tokens.md` is never a binding file, so the unrewritten sibling stays red (AC22, NS7). |
| D-B | **Tolerance window (closes draft Q1).** `executionScope === 'global'` **and** project hub absent. AC23 conditions on "if it resolves": a resolving depth-1 hub binding literal passes the ordinary existence check in every layout, while a missing target inside a **present** hub is reported (AC15, NS2). |
| D-C | **Rewrite-set mechanism (closes draft Q3).** Two synchronized literals (no new file — DoR bounded scope), pinned by a fail-first equality guard plus a completeness assertion derived from the shipped autoload source (AC1, AC9, NS12). |
| D-D | **Payload shape (closes draft Q5).** Additive `installLayoutNotes` + `warnings` arrays, excluded from `total`/`ok`; the five existing buckets keep their exact shape and human-path order. |
| D-E | **Binding-file class source.** Inlined module constant documented against `hub-layout.json`; the gate stays synchronous, read-only, and dependency-free (no manifest read, no network, no state mutation). |
| D-F | **Global fixture recipe.** The global-only window is reproduced by running a copy of the checker from inside a fake `WORKFLOW_SKILLS_GLOBAL_DIR` root (checker + `ws-shared/runtime/scripts/{resolve_consumer_root,resolve_hub_root}.cjs`), because `executionScope` is derived from the executing script path. |
| D-G | **External dependency (draft Q4, stays open).** The corrected install-scope value for the same-directory skills-root case is owned by sibling spec `us-498-install-mode-reporting` (batch item 3) and does not exist on this tree yet. The gate consumes `context.executionScope` unchanged and adds no detection (AC24/D7). Not a blocker for this run. |

