# Plan Interview — us-351 (move consumer hub to {projectRoot}/.ws)

Auditor: worker inline (Step 2) · Plan: `step-01-us-351.plan.md` · Spec: `step-00-us-351.spec.md`

## Registry

| # | Finding / Question | Severity | Verdict |
|---|--------------------|----------|---------|
| 1 | §6 vacuity check: does §6 name real touched framework boundaries? | Gap-check | Accepted — §6 names the Node installer/CLI + resolver helpers, the exact invariant set (only `commitPlanFilesOnlyAtStep8` true), relocation input handling, shell-trap hygiene, and the implement-time `scan_stack_invariants.cjs` run. Not a silent pass. |
| 2 | Migration shape: clean-cut + one-time installer relocation vs pointer shim vs permanent dual-path. | Decision | APPROVED — clean-cut with one-time `relocateLegacyHub()` (move, never delete; leave-both + logged note on collision). Pointer shims and permanent dual-path reads are forbidden by the harness no-legacy-alias rule and would fail AC2. |
| 3 | §8/Q1 collision default (legacy hub AND `.ws/` present): leave-both + manual-cleanup note vs auto-merge. | Decision | APPROVED — leave-both, no auto-merge, no delete. Auto-merge risks clobbering divergent consumer edits; delete is destructive. |
| 4 | §8/Q2 global hub (`{globalSkillsRoot}/ws-shared`) unchanged. | Decision | APPROVED — spec scopes the move to the project root hub; global tree still hosts skill bodies + global hub fallback. AC3's "global fallback" is that path. |
| 5 | §8/Q3 dogfood move includes tracked `memory/` history (138 files). | Decision | APPROVED — preserves the legacy-fallback chain under the new root and proves AC1/AC2 on the upstream repo itself; mechanical `git mv` preserves history. |
| 6 | §8/Q4 `docs/index.html` via `build-site` rebuild, never hand-edited. | Decision | APPROVED — generated artifact; hand edits would be overwritten and unverifiable. |
| 7 | Memory trap (High): integrity regen from clean tree only; untracked skill-tree files pollute the manifest. | Gap | COVERED — plan §3 step 7 already requires clean-tree regen; refined plan adds the explicit move-aside + digest-changed confirmation. |
| 8 | Memory trap (High): shell byte-rewrite / PowerShell chaining — content edits via file tools only, `;` chaining. | Gap | COVERED — §6 states it; refined plan repeats the constraint on the sweep step (no scripted in-place rewrites; each edited file verified). |
| 9 | Memory trap (Medium): token contract must state effective resolution + extend doc map and executable TOKENS mirror together. | Gap | REFINED — refined plan requires `ws-check-harness` TOKENS mirror update in the same batch as the `tools.md` default change, plus effective-resolution wording. |
| 10 | Memory trap (Medium): restructured contracts need a quoting-file sweep; reviewer's file list is not complete. | Gap | COVERED — plan §3 step 5 runs an independent sweep and asserts zero non-allowlisted hits; refined plan adds the post-verify resweep (resweep-dirt-after-verify trap). |
| 11 | Memory trap (Medium): retired-phrasing sweep records byte-locked/out-of-scope hits with path + reason. | Check | Covered — §2(F) allowlist categories (SoT self-refs, global contexts, relocation constant, history) recorded in the sweep report. |
| 12 | Memory trap (High): no dual Node/Python script twins. | Check | Covered — `resolve_consumer_root.py` edited in place (pre-existing mirror), no new twin; relocation lives inside `bin/cli.js`, no new script. |
| 13 | Memory trap (Medium): portable prose must not cite internal spec numbers in shipped skill bodies. | Gap | REFINED — refined plan constrains installer log lines and skill prose to generic wording (no `us-351` / issue numbers in shipped text). |
| 14 | Memory trap (Medium): gitignore mirror on default move; anchor-root gitignore. | Check | Covered — plan §2(C/E): file-level ignores preserved via installed `.ws/.gitignore`, folder itself never ignored, root probe-cache line retargeted. |
| 15 | Memory trap (Medium): stale tests after a default move ship in the same batch. | Gap | COVERED — plan §2(G) updates all path-asserting tests in-batch; refined plan adds the failing-surface discovery rule (run full suite, fix every red path test, no deselect). |
| 16 | AC coverage: every AC maps to ≥1 plan step and ≥1 §5 test (AC1→step 3, AC2→step 5, AC3→steps 2–3, AC4→steps 3–4, AC5→step 7). Negatives NS1–NS4 each map to a §5 test. | Check | PASS. |

## End decision

**APPROVED with refinements** — proceed to Step 4 on the refined plan. No blocking gaps; §6 audit
complete for touched boundaries (Node installer + resolvers, sync-fs only); all §8 questions decided above.
