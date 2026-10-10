# Companion — us-497-link-integrity (link integrity across install scopes)

Decision record for `.agents/specs/pending/0171-us-497-link-integrity.spec.md`. Read it when implementing or reviewing AC1–AC24; it holds the product choices that the acceptance criteria encode but cannot justify on their own, and it records how the two consolidated defects are kept apart.

## Feature Boundary

**In scope**

- Link-target classification inside `.agents/skills/ws-check-harness/scripts/check_harness_links.cjs` when the resolved install scope is global and the project hub is absent, limited to depth-1 hub binding files in either resolved hub directory.
- An informational, non-failing findings bucket for those hub-layout literals, observable in the `--json` payload and on the human path, excluded from `total`/`ok`.
- A warning for the absent project hub that names `ws-configure-project`.
- The install-time autoload relocation rewrite in both renderers (`bin/cli.js` → `renderConsumerAutoloadText()` / `managedRuntimeLinkPrefixFor()`, and `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` → `renderConsumerAutoload()` / `runtimePrefixFor()`), so every bare link target naming a real runtime sibling of the shipped autoload source — including `host-capability-tokens.md` — becomes a resolvable `runtime/` or hub-relative target.
- Regression coverage: `test/test-check-harness-links.js` for the tolerated literal, the project-scope validation path, the hybrid path, and the genuine-broken-link regression; the installer/autoload/layout/doc-sync suites for the rewrite, idempotency, and both install scopes.

**Out of scope**

- Installer and hub layout (`bin/cli.js` deliberately omits `{globalSkillsRoot}/ws-shared/AGENTS.md` in global scope), and the shipped source form of `runtime/autoload.md`, which must keep its bare same-directory sibling link.
- The runtime file inventory, the other Phase 5a gates, and the non-link finding classes (`absolutePaths`, `tokenInLinkTargets`, `shorthand`, `unrouted`).
- `detect_install_mode.cjs` and the install-mode reporting defect itself (false `hybrid` when the local and global skills roots are the same directory); that work is owned by the sibling install-mode reporting spec (consolidating #494 + #495) and must land first or in the same change.

## Implementation Decisions

### D1 — Width of the hub-literal exemption (two valid options)

- **Option A — project hub only.** Exempt only targets whose expanded path resolves under the project `{sharedDir}` (`.ws/...`), exactly as #496's *Suggested fix* reads. Consequence: the reported `ws-shared/STACK.md -> AGENTS.md` finding stays red, so a global-only install still cannot reach exit 0 without also editing shipped hub seed content. Fidelity to the issue text is higher; the reported repro is not fully closed.
- **Option B — hub binding files (chosen).** Exempt any target naming a file that sits directly inside a resolved hub directory, whether the project hub `{sharedDir}` or the resolved skills install's `ws-shared` hub, while scope is global and the project hub is absent. Consequence: both reported literal classes become notes, and the exemption stays narrow because hub subtrees (`ws-shared/runtime/*`) keep failing.

**Rationale for B:** #496 classifies every listed finding except the two #493 autoload links as not genuine, and its own finding list includes the `ws-shared/` sibling link, so Option A cannot satisfy the reporter's expectation without a second, unrelated change. Option B closes both classes with one rule and keeps a failing edge (AC20, NS5) that prevents a false-clean gate.

### D2 — How tolerated findings surface

A dedicated informational bucket in the `--json` payload, excluded from the `total`/`ok` computation (which currently sums all five buckets), and printed on the human path even when the gate passes. `findings.brokenLinks` keeps only genuine breaks so CI evidence stays actionable.

### D3 — Where the hub directories come from

`resolveConsumerContext()` values (`executionScope`, `sharedDir`, resolved `skillsRoot`), never a hardcoded `.ws` string, because the hub root is relocatable through `pathTokens.sharedDir` / `WORKFLOW_SKILLS_SHARED_DIR`. Containment uses the exported `inside()` helper; hub presence uses the exported `consumerHubExists()` semantics.

### D4 — Scope gate condition

The exemption applies when the resolved install scope is global **and** the project hub is absent, matching `.agents/skills/ws-check-harness/PHASES.md` § Hub resolution details. A project-local install that simply has not been configured yet keeps today's behavior; broadening the condition is a separate product decision (see Deferred Ideas).

### D5 — Installer rewrite: keep the allow-list bounded, and never fix one renderer only

From #493. The bare-filename rewrite list is intentional: it keeps the relocation rewrite bounded so only links naming known runtime siblings of the shipped `autoload.md` are rewritten, and unrelated markdown targets are never touched. The fix may either add the missing `host-capability-tokens.md` entry or render the link from the same runtime-file registry that tracks the file — both are acceptable, because the acceptance criteria are behavior-level.

**The duplication decision is part of the fix.** The same allow-list is duplicated across two renderers: `bin/cli.js` (`renderConsumerAutoloadText()` / `managedRuntimeLinkPrefixFor()`) writes the skills-install-scope hub-root autoload, and `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs` (`renderConsumerAutoload()` / `runtimePrefixFor()`) writes the project-hub autoload. A one-file fix repairs only one install scope, so the two lists must stay in agreement (AC9) and a test must fail when only one is edited (NS12). Per-file fail-closed behavior stays as it is: when the specific runtime file is missing from the local tree, the existing existence checks keep the `{globalSkillsRoot}` token rather than inventing a hub-relative path to a file that does not exist (AC5, NS13).

### D6 — Where the exemption stops: suppression versus genuine breakage

The exemption is a classification of **resolvable, layout-tolerated hub routing**, not a suppression of unresolvable targets. It is therefore defined by three constraints that AC21–AC23 make testable:

1. **Class:** only depth-1 hub binding files in either resolved hub directory. Targets below that level (for example `ws-shared/runtime/missing.md`) stay broken links, and link text is never matched by a `.ws/...` or `ws-shared/...` prefix (AC21).
2. **Genuine breakage keeps failing:** a target that resolves to no installed file — including the unrewritten runtime sibling `](host-capability-tokens.md)` that #493 reports — is always reported under `findings.brokenLinks` with exit 1 in project-scope, global-only, and hybrid layouts (AC16, AC22, NS7, NS9). The installer owns that fix; the gate must never absorb it.
3. **No false red:** a depth-1 hub binding literal that does resolve in either resolved hub directory is never listed under `findings.brokenLinks` in any layout (AC23, NS8).

Without constraint 2 the merged rule would suppress exactly the defect #493 exists to fix; without constraint 3 the merged rule would keep #496's false red. Both directions are asserted, not assumed.

### D7 — Sequencing with the install-mode reporting correction

The scope-aware gate consumes the install-scope value published by `detect_install_mode.cjs` as Phase 0 evidence. The sibling install-mode reporting spec (consolidating #494 + #495) records that this detector currently reports a false `hybrid` when the local and global skills roots resolve to the same directory. That correction must land first, or in the same change, so the exemption is never keyed off a wrong scope (AC24). The gate must not compensate by inventing its own scope detection: duplicating detection would create a second, divergent source of truth for install scope.

## Deferred Ideas

- **Rewrite the sibling link in `.agents/skills/ws-shared/templates/STACK.md.example`** to a target that resolves in every layout. It would let the gate exemption narrow further, but it changes shipped hub seed content and is not required once the gate classifies the literal.
- **Broaden the exemption condition to hub absence in any scope**, so an installed-but-unconfigured project-local consumer also stops reporting `.ws/` literals as broken. Deferred because it changes which installs turn red and needs its own evidence.
- **One shared scope classifier for all Phase 5a gates.** Only `check_harness_links.cjs` is scope-blind for link targets today; the sibling gates resolve scope for tree selection. A shared helper would prevent the same gap from reappearing in a new gate.
- **Surface the missing-project-hub warning in the Phase 0 report as well**, so a global-only consumer sees the `ws-configure-project` pointer before Phase 5a runs.
- **Collapse the duplicated runtime-filename allow-list into one shared module** instead of two synchronized literals. Deferred because it moves code across the installer/skill boundary; AC9 plus the wiring-guard test keep the two lists honest in the meantime.
- **Make `check_harness_links.cjs` self-validate the install-scope input** (refuse to classify when the reported scope is `hybrid` while both skills roots are the same directory). Deferred to the install-mode reporting owner; D7 keeps the responsibility in one place.
